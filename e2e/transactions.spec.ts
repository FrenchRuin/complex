import { expect, test } from "@playwright/test";
import { E2E_NAMES } from "./support/accounts";
import { login } from "./support/login";

test("내역 추가 → 수정 화면 → 삭제 → 되돌리기 (F-10, F-11)", async ({ page }) => {
  await login(page, "a", "/transactions");

  // 단축키 N으로 패널 열기
  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await expect(panel).toBeVisible();

  await panel.getByLabel("금액").fill("12000");
  await expect(panel.getByLabel("금액")).toHaveValue("12,000");
  await panel.getByRole("radio", { name: "생활·마트" }).click();
  await panel.getByLabel("가맹점·내용 (선택)").fill("E2E 다이소");
  await panel.getByLabel("가맹점·내용 (선택)").press("Control+Enter");

  await expect(panel).toBeHidden();
  const row = page.getByRole("button", { name: /E2E 다이소/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("12,000원");

  // 편집 패널: 작성자 표시
  await row.click();
  const edit = page.getByRole("dialog", { name: "내역 수정" });
  await expect(edit.getByText(`${E2E_NAMES.a}님이`)).toBeVisible();

  // 두 번 눌러 삭제 → 되돌리기
  await edit.getByRole("button", { name: "삭제" }).click();
  await edit.getByRole("button", { name: "한 번 더 누르면 삭제돼요" }).click();
  await expect(row).toBeHidden();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByRole("button", { name: /E2E 다이소/ })).toBeVisible();
});

test("한 사람이 추가하면 다른 사람 화면에 바로 보인다 (F-14)", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await login(pageA, "a", "/transactions");
  await login(pageB, "b", "/transactions");
  await expect(pageB.getByText("실시간 연결됨")).toBeVisible();
  // 구독 직후 알림 준비 시간
  await pageB.waitForTimeout(2000);

  await pageA.getByRole("button", { name: "내역 추가" }).first().click();
  const panel = pageA.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill("4500");
  await panel.getByRole("radio", { name: "카페·간식" }).click();
  await panel.getByLabel("가맹점·내용 (선택)").fill("E2E 실시간 커피");
  await panel.getByRole("button", { name: "저장" }).click();

  // B는 새로고침하지 않는다
  await expect(pageB.getByRole("button", { name: /E2E 실시간 커피/ })).toBeVisible({ timeout: 5000 });

  await contextA.close();
  await contextB.close();
});

test("사람 필터는 주소에 남고, A 필터는 A의 개인 내역만 보여준다 (F-12)", async ({ page }) => {
  await login(page, "a", "/transactions");
  await page.getByRole("navigation", { name: "사람 필터" }).getByRole("link", { name: E2E_NAMES.b }).click();
  await expect(page).toHaveURL(/who=b/);
  // "E2E 다이소"는 A가 입력한 개인(A) 내역이라 B 필터에서 안 보인다
  await expect(page.getByRole("button", { name: /E2E 다이소/ })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("link", { name: E2E_NAMES.b })).toHaveAttribute("aria-current", "true");
});
