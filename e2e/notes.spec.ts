import { expect, test } from "@playwright/test";
import { E2E_NAMES, readCreds, serverNow, userClient } from "./support/accounts";
import { login } from "./support/login";

test("메모: A가 체크리스트를 쓰면 B에게 알림, 누르면 열리고, 체크는 바로 반영 (F-18)", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await login(pageA, "a", "/notes");
  await login(pageB, "b", "/");

  // B: 기존 알림 모두 읽음
  const bellB = pageB.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await bellB.click();
  const markAll = pageB.getByRole("dialog").getByRole("button", { name: "모두 읽음" });
  if (await markAll.isEnabled()) await markAll.click();
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");
  await pageB.waitForTimeout(2000);

  // A: 체크리스트 메모 쓰기 (Enter로 다음 항목)
  await pageA.getByRole("button", { name: "메모 추가" }).click();
  const editor = pageA.getByRole("dialog", { name: "메모 쓰기" });
  await editor.getByText("체크리스트", { exact: true }).click();
  await editor.getByLabel("제목 (선택)").fill("E2E 장보기");
  await editor.getByLabel("1번째 항목", { exact: true }).fill("우유");
  await editor.getByLabel("1번째 항목", { exact: true }).press("Enter");
  await editor.getByLabel("2번째 항목", { exact: true }).fill("계란");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(editor).toBeHidden();
  await expect(pageA.getByRole("article").filter({ hasText: "E2E 장보기" })).toContainText("2개 중 0개 완료");

  // B: 새로고침 없이 알림 → 누르면 그 메모가 열린다
  await expect(bellB).toHaveAccessibleName("알림, 안 읽은 알림 1건", { timeout: 8000 });
  await bellB.click();
  await pageB.getByRole("link", { name: new RegExp(`${E2E_NAMES.a}님이 메모 ‘E2E 장보기’를 썼어요`) }).click();
  // 먼저 보기로 열린다 (편집 칸 없음). "수정"을 눌러야 편집
  const opened = pageB.getByRole("dialog", { name: "E2E 장보기" });
  await expect(opened).toBeVisible();
  await expect(opened.getByRole("checkbox", { name: "우유" })).toBeVisible();
  await expect(opened.getByLabel("제목 (선택)")).toBeHidden();
  await opened.getByRole("button", { name: "수정" }).click();
  const editing = pageB.getByRole("dialog", { name: "메모 고치기" });
  await expect(editing.getByLabel("제목 (선택)")).toHaveValue("E2E 장보기");
  await editing.getByRole("button", { name: "취소" }).click();
  await expect(pageB.getByRole("dialog", { name: "E2E 장보기" })).toBeVisible();
  await pageB.keyboard.press("Escape");

  // B: 카드에서 바로 체크 → A 화면에도 반영
  const cardB = pageB.getByRole("article").filter({ hasText: "E2E 장보기" });
  await cardB.getByRole("checkbox", { name: "우유" }).check();
  await expect(cardB).toContainText("2개 중 1개 완료");
  await expect(pageA.getByRole("article").filter({ hasText: "E2E 장보기" })).toContainText("2개 중 1개 완료", {
    timeout: 8000,
  });

  // 체크만 한 것은 A에게 알림이 가지 않는다
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const { data: forA } = await a.from("notifications").select("kind").like("kind", "note_%");
  expect(forA ?? []).toHaveLength(0);

  await contextA.close();
  await contextB.close();
});

test("메모 규칙: 고정·체크는 알림 없음, 내용 고침은 하나로, 지우기·되돌리기, 진짜 삭제 막기 (F-18)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  const since = await serverNow();
  const fake = "00000000-0000-0000-0000-000000000000";

  const { data: note, error } = await a
    .from("notes")
    .insert({ kind: "checklist", body: "E2E 규칙 메모", items: [{ id: "i1", text: "빵", done: false }], household_id: fake, created_by: fake, updated_by: fake })
    .select("id, household_id")
    .single();
  expect(error).toBeNull();
  // 가구는 DB가 로그인한 사람 기준으로 채운다
  expect(note!.household_id).not.toBe(fake);

  await a.from("notes").update({ is_pinned: true }).eq("id", note!.id);
  expect((await a.rpc("toggle_note_item", { p_note_id: note!.id, p_item_id: "i1", p_done: true })).error).toBeNull();
  await a.from("notes").update({ body: "E2E 규칙 메모 1" }).eq("id", note!.id);
  await a.from("notes").update({ body: "E2E 규칙 메모 2" }).eq("id", note!.id);
  await a.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", note!.id);
  await a.from("notes").update({ deleted_at: null }).eq("id", note!.id);

  const { data: forB } = await b
    .from("notifications")
    .select("kind, subject")
    .eq("note_id", note!.id)
    .gte("created_at", since)
    .order("created_at");
  expect((forB ?? []).map((n) => n.kind)).toEqual(["note_created", "note_updated", "note_deleted", "note_restored"]);
  expect(forB!.find((n) => n.kind === "note_updated")?.subject).toBe("E2E 규칙 메모 2");

  // 체크가 저장됐는지
  const { data: saved } = await b.from("notes").select("items, is_pinned").eq("id", note!.id).single();
  expect(saved).toMatchObject({ is_pinned: true, items: [{ id: "i1", text: "빵", done: true }] });

  // 진짜 삭제는 막혀 있다
  const hardDelete = await a.from("notes").delete().eq("id", note!.id);
  expect(hardDelete.error).not.toBeNull();

  // 없는 항목 체크는 오류
  const bad = await a.rpc("toggle_note_item", { p_note_id: note!.id, p_item_id: "nope", p_done: true });
  expect(bad.error?.message).toBe("invalid_note");
});

test("메모 보기: 주소는 새 창 링크, 수정 → 저장하면 다시 보기 (F-18)", async ({ page }) => {
  await login(page, "a", "/notes");
  await page.getByRole("button", { name: "메모 추가" }).click();
  const editor = page.getByRole("dialog", { name: "메모 쓰기" });
  await editor.getByLabel("메모 내용").fill("E2E 링크 메모\n여기서 사요 https://example.com/item?id=1. 그리고 www.example.org");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(editor).toBeHidden();

  await page.getByRole("article").filter({ hasText: "E2E 링크 메모" }).getByRole("button").first().click();
  const view = page.getByRole("dialog", { name: "E2E 링크 메모" });
  const link = view.getByRole("link", { name: /https:\/\/example\.com\/item\?id=1/ });
  await expect(link).toHaveAttribute("href", "https://example.com/item?id=1");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(view.getByRole("link", { name: /www\.example\.org/ })).toHaveAttribute("href", "https://www.example.org/");

  // 수정 → 저장 → 같은 창이 보기로 돌아오고 새 내용이 보인다
  await view.getByRole("button", { name: "수정" }).click();
  const editing = page.getByRole("dialog", { name: "메모 고치기" });
  await editing.getByLabel("메모 내용").fill("E2E 링크 메모\n고친 내용");
  await editing.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("dialog", { name: "E2E 링크 메모" })).toContainText("고친 내용");
});
