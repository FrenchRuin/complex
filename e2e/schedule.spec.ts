import { expect, test } from "@playwright/test";
import { E2E_NAMES, readCreds, serverNow, userClient } from "./support/accounts";
import { login } from "./support/login";

test("일정: A가 시각 있는 매주 일정을 추가하면 달력·알림에 나오고, 누르면 보기로 열린다 (F-19)", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await login(pageA, "a", "/schedule");
  await login(pageB, "b", "/");

  const bellB = pageB.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await bellB.click();
  const markAll = pageB.getByRole("dialog").getByRole("button", { name: "모두 읽음" });
  if (await markAll.isEnabled()) await markAll.click();
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");
  await pageB.waitForTimeout(2000);

  // A: 오늘(고른 날)에 일정 추가
  await pageA.getByRole("button", { name: "일정 추가", exact: true }).click();
  const editor = pageA.getByRole("dialog", { name: "일정 추가" });
  await editor.getByLabel("일정 이름").fill("E2E 운동");
  await editor.getByText("하루 종일", { exact: true }).click();
  await editor.getByRole("combobox", { name: "시작 시각" }).click();
  await pageA.getByRole("option", { name: "19:00", exact: true }).click();
  await editor.getByRole("combobox", { name: "반복" }).click();
  await pageA.getByRole("option", { name: "매주", exact: true }).click();
  await editor.getByLabel("메모 (선택)").fill("https://example.com/gym");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(editor).toBeHidden();

  // A: 고른 날 목록에 보인다
  const agenda = pageA.getByRole("region", { name: /월 \d+일/ });
  await expect(agenda.getByRole("button", { name: /E2E 운동/ })).toContainText("19:00");

  // B: 알림 → 누르면 일정 화면에서 보기로 열린다
  await expect(bellB).toHaveAccessibleName("알림, 안 읽은 알림 1건", { timeout: 8000 });
  await bellB.click();
  await pageB.getByRole("link", { name: new RegExp(`${E2E_NAMES.a}님이 일정 ‘E2E 운동’을 추가했어요`) }).click();
  const view = pageB.getByRole("dialog", { name: "E2E 운동" });
  await expect(view).toBeVisible();
  await expect(view).toContainText(/매주 .요일/);
  await expect(view.getByRole("link", { name: /example\.com\/gym/ })).toHaveAttribute("target", "_blank");

  // B: 수정 → 이름 바꾸고 저장 → 보기에 새 이름
  await view.getByRole("button", { name: "수정" }).click();
  await view.getByRole("button", { name: "반복 전체 수정" }).click();
  const editing = pageB.getByRole("dialog", { name: "일정 수정" });
  await editing.getByLabel("일정 이름").fill("E2E 운동 (헬스)");
  await editing.getByRole("button", { name: "저장" }).click();
  await expect(pageB.getByRole("dialog", { name: "E2E 운동 (헬스)" })).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("일정 규칙: 가구는 DB가 채움, 바뀐 게 없으면 알림 없음, 수정은 하나로, 삭제·되돌리기, 진짜 삭제 막기 (F-19)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  const since = await serverNow();
  const fake = "00000000-0000-0000-0000-000000000000";

  const { data: event, error } = await a
    .from("events")
    .insert({ title: " E2E 규칙 일정 ", start_date: "2026-10-03", end_date: "2026-10-03", household_id: fake, created_by: fake, updated_by: fake })
    .select("id, household_id, title")
    .single();
  expect(error).toBeNull();
  expect(event!.household_id).not.toBe(fake);
  expect(event!.title).toBe("E2E 규칙 일정");

  await a.from("events").update({ title: "E2E 규칙 일정" }).eq("id", event!.id); // 바뀐 것 없음
  await a.from("events").update({ memo: "1" }).eq("id", event!.id);
  await a.from("events").update({ memo: "2" }).eq("id", event!.id);
  await a.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", event!.id);
  await a.from("events").update({ deleted_at: null }).eq("id", event!.id);

  const { data: forB } = await b.from("notifications").select("kind").eq("event_id", event!.id).gte("created_at", since).order("created_at");
  expect((forB ?? []).map((n) => n.kind)).toEqual(["event_created", "event_updated", "event_deleted", "event_restored"]);

  // 잘못된 시각 조합은 DB가 막는다 (하루 종일이 아닌데 시작 시각 없음)
  const bad = await a.from("events").update({ all_day: false }).eq("id", event!.id);
  expect(bad.error).not.toBeNull();

  const hardDelete = await a.from("events").delete().eq("id", event!.id);
  expect(hardDelete.error).not.toBeNull();
});

const todayKST = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const plusDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

test("반복 일정: 이 일정만 삭제·되돌리기, 이 일정만 수정 (F-19)", async ({ page }) => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const today = todayKST();
  const fake = "00000000-0000-0000-0000-000000000000";
  const { data: series, error } = await a
    .from("events")
    .insert({ title: "E2E 요가", start_date: today, end_date: today, repeat: "weekly", household_id: fake, created_by: fake, updated_by: fake })
    .select("id")
    .single();
  expect(error).toBeNull();

  await login(page, "a", "/schedule");
  const agenda = page.getByRole("region", { name: /월 \d+일/ });
  const upcoming = page.getByRole("region", { name: "다가오는 일정" });
  const rows = upcoming.getByRole("button", { name: /E2E 요가/ });
  await expect(rows.first()).toBeVisible();

  // 오늘 회차만 삭제 → 오늘 목록에서 빠지고, 다음 주 회차는 남는다
  await agenda.getByRole("button", { name: /E2E 요가/ }).click();
  const view = page.getByRole("dialog", { name: "E2E 요가" });
  await view.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(view.getByRole("group", { name: /어떤 일정을 삭제할까요/ })).toBeVisible();
  await view.getByRole("button", { name: "이 일정만 삭제" }).click();
  await expect(view).toBeHidden();
  await expect(agenda.getByRole("button", { name: /E2E 요가/ })).toBeHidden();
  await expect(rows.first()).toContainText(dayLabel(plusDays(today, 7)));

  // 되돌리기 → 오늘 회차가 다시 보인다
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(agenda.getByRole("button", { name: /E2E 요가/ })).toBeVisible();

  // 다음 주 회차만 수정 → 그 날만 새 이름, 나머지는 그대로
  const nextWeek = plusDays(today, 7);
  await rows.filter({ hasText: dayLabel(nextWeek) }).click();
  const nextView = page.getByRole("dialog", { name: "E2E 요가" });
  await nextView.getByRole("button", { name: "수정" }).click();
  await nextView.getByRole("button", { name: "이 일정만 수정" }).click();
  const editOne = page.getByRole("dialog", { name: "이 일정만 수정" });
  await expect(editOne).toContainText("이 날짜 일정만 바뀌어요");
  await expect(editOne.getByRole("combobox", { name: "반복" })).toHaveCount(0);
  await editOne.getByLabel("일정 이름").fill("E2E 요가 (쉬는 주)");
  await editOne.getByRole("button", { name: "저장" }).click();
  await expect(editOne).toBeHidden();

  await expect(upcoming.getByRole("button", { name: /E2E 요가 \(쉬는 주\)/ })).toContainText(dayLabel(nextWeek));
  const { data: copy } = await a.from("events").select("repeat, detached_from, start_date").eq("title", "E2E 요가 (쉬는 주)").single();
  expect(copy).toMatchObject({ repeat: "none", detached_from: series!.id, start_date: nextWeek });
  // 반복 일정에는 그 주만 빠져 있다 (오늘은 되돌렸으므로 없음)
  const { data: after } = await a.from("events").select("title, skip_dates").eq("id", series!.id).single();
  expect(after).toEqual({ title: "E2E 요가", skip_dates: [nextWeek] });
});

test("반복 일정 규칙: 그날만 지우기·되돌리기 알림, 떼어 낼 때는 알림 없음, 없는 회차는 막기 (F-19)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  const fake = "00000000-0000-0000-0000-000000000000";
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: series } = await a
    .from("events")
    .insert({ title: "E2E 회의", start_date: "2026-11-02", end_date: "2026-11-02", repeat: "weekly", repeat_until: "2026-11-30", household_id: fake, created_by: fake, updated_by: fake })
    .select("id")
    .single();

  expect((await a.rpc("set_event_occurrence_skipped", { p_event_id: series!.id, p_date: "2026-11-09", p_skipped: true })).error).toBeNull();
  // 같은 날을 또 넣어도 한 번만
  expect((await a.rpc("set_event_occurrence_skipped", { p_event_id: series!.id, p_date: "2026-11-09", p_skipped: true })).error).toBeNull();
  expect((await a.rpc("set_event_occurrence_skipped", { p_event_id: series!.id, p_date: "2026-11-09", p_skipped: false })).error).toBeNull();

  const detached = await a.rpc("detach_event_occurrence", { p_event_id: series!.id, p_date: "2026-11-16" });
  expect(detached.error).toBeNull();
  await a.from("events").update({ title: "E2E 회의 (장소 변경)" }).eq("id", detached.data);

  // 이미 뺀 날, 반복 끝난 뒤, 시작 전은 떼어 낼 수 없다
  for (const date of ["2026-11-16", "2026-12-07", "2026-10-26"]) {
    const bad = await a.rpc("detach_event_occurrence", { p_event_id: series!.id, p_date: date });
    expect(bad.error?.message).toBe("occurrence_not_found");
  }

  const { data: row } = await a.from("events").select("skip_dates").eq("id", series!.id).single();
  expect(row!.skip_dates).toEqual(["2026-11-16"]);

  const { data: forB } = await b
    .from("notifications")
    .select("kind, event_id, occurred_on, subject")
    .gte("created_at", since)
    .in("event_id", [series!.id, detached.data])
    .order("created_at");
  expect(forB).toEqual([
    { kind: "event_created", event_id: series!.id, occurred_on: "2026-11-02", subject: "E2E 회의" },
    { kind: "event_occurrence_deleted", event_id: series!.id, occurred_on: "2026-11-09", subject: "E2E 회의" },
    { kind: "event_occurrence_restored", event_id: series!.id, occurred_on: "2026-11-09", subject: "E2E 회의" },
    { kind: "event_updated", event_id: detached.data, occurred_on: "2026-11-16", subject: "E2E 회의 (장소 변경)" },
  ]);
});
