import { expect, test } from "@playwright/test";
import { E2E_NAMES, readCreds, userClient } from "./support/accounts";
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
  const since = new Date().toISOString();
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
