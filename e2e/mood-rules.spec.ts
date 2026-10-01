import { expect, test } from "@playwright/test";
import { adminClient, readCreds, serverNow, userClient } from "./support/accounts";

const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

test("오늘 기분 규칙: 하루 한 줄, 알림은 하나로, 같은 값·지우기는 알림 없음, 남의 기분은 못 고침 (F-04)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  await a.rpc("clear_my_mood");
  // 지난 테스트가 남긴 안 읽은 기분 알림 정리
  await b.from("notifications").update({ read_at: new Date().toISOString() }).eq("kind", "mood_set").is("read_at", null);
  const since = await serverNow();

  expect((await a.rpc("set_my_mood", { p_mood: "tired", p_note: "  야근 중  " })).error).toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "happy", p_note: "" })).error).toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "happy", p_note: null })).error).toBeNull(); // 같은 값
  const { data: rows } = await b.from("moods").select("mood, note, mood_date, deleted_at");
  expect(rows).toEqual([{ mood: "happy", note: null, mood_date: kstToday(), deleted_at: null }]);

  const { data: forB } = await b.from("notifications").select("kind, mood, subject").eq("kind", "mood_set").gte("created_at", since);
  expect(forB).toEqual([{ kind: "mood_set", mood: "happy", subject: null }]);

  // 지우기: 안 보이게 + 알림 없음
  expect((await a.rpc("clear_my_mood")).error).toBeNull();
  const { data: cleared } = await b.from("moods").select("deleted_at").single();
  expect(cleared!.deleted_at).not.toBeNull();
  // 다시 고르면 같은 행이 살아나고 알림 하나(읽지 않은 것을 고침)
  await a.rpc("set_my_mood", { p_mood: "sick", p_note: "감기" });
  const { data: again } = await b.from("moods").select("mood, note, deleted_at");
  expect(again).toEqual([{ mood: "sick", note: "감기", deleted_at: null }]);
  const { data: forB2 } = await b.from("notifications").select("mood, subject").eq("kind", "mood_set").gte("created_at", since);
  expect(forB2).toEqual([{ mood: "sick", subject: "감기" }]);

  // 잘못된 값은 DB가 거절
  expect((await a.rpc("set_my_mood", { p_mood: "nope", p_note: null })).error).not.toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "good", p_note: "가".repeat(21) })).error).not.toBeNull();

  // 직접 쓰기는 막혀 있다 (함수로만)
  const { data: aRow } = await a.from("moods").select("id").single();
  expect((await b.from("moods").update({ mood: "sad" }).eq("id", aRow!.id).select()).data ?? []).toHaveLength(0);
  expect((await a.from("moods").delete().eq("id", aRow!.id)).error).not.toBeNull();
  const fake = "00000000-0000-0000-0000-000000000000";
  expect(
    (await b.from("moods").insert({ household_id: fake, member_id: fake, mood_date: kstToday(), mood: "good" })).error,
  ).not.toBeNull();

  // 어제 행은 오늘 조건에 안 걸린다
  const admin = adminClient();
  const { data: me } = await a.from("members").select("id, household_id").eq("slot", "a").single();
  const yesterday = new Date(Date.now() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
  await admin.from("moods").insert({ household_id: me!.household_id, member_id: me!.id, mood_date: yesterday, mood: "sad" });
  const { data: todayOnly } = await b.from("moods").select("mood").eq("mood_date", kstToday()).is("deleted_at", null);
  expect(todayOnly).toEqual([{ mood: "sick" }]);
  await admin.from("moods").delete().eq("member_id", me!.id).eq("mood_date", yesterday);
  await a.rpc("clear_my_mood");
});

test("어제 안 읽은 기분 알림이 있어도 오늘 기분은 새 알림으로 간다 (휴대폰 알림이 다시 가게) (F-04)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  await a.rpc("clear_my_mood");
  await b.from("notifications").update({ read_at: new Date().toISOString() }).eq("kind", "mood_set").is("read_at", null);
  const admin = adminClient();
  const { data: members } = await a.from("members").select("id, slot, household_id");
  const ma = members!.find((m) => m.slot === "a")!;
  const mb = members!.find((m) => m.slot === "b")!;
  const yesterday = new Date(Date.now() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
  const { data: old } = await admin
    .from("notifications")
    .insert({ household_id: ma.household_id, recipient_id: mb.id, actor_id: ma.id, kind: "mood_set", mood: "sad", occurred_on: yesterday })
    .select("id")
    .single();

  await a.rpc("set_my_mood", { p_mood: "good", p_note: null });
  const { data: unread } = await b
    .from("notifications")
    .select("id, mood, occurred_on")
    .eq("kind", "mood_set")
    .is("read_at", null)
    .order("occurred_on");
  expect(unread).toEqual([
    { id: old!.id, mood: "sad", occurred_on: yesterday },
    { id: expect.any(String), mood: "good", occurred_on: kstToday() },
  ]);
  await admin.from("notifications").delete().eq("id", old!.id);
  await a.rpc("clear_my_mood");
});
