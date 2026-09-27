import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("정기지출 등록 → 납부 체크 → 내역·홈에 반영 → 체크 해제 (F-30, F-31, F-20)", async ({ page }) => {
  await login(page, "a", "/recurring");

  // 등록 (결제일 1일 → 이번 달 이미 지났거나 오늘)
  await page.getByRole("button", { name: "정기지출 추가" }).click();
  const editor = page.getByRole("dialog", { name: "정기지출 추가" });
  await editor.getByLabel("이름").fill("E2E 넷플릭스");
  await editor.getByLabel("금액", { exact: true }).fill("17000");
  await editor.getByLabel(/매월 결제일/).fill("1");
  await editor.getByLabel("카테고리").selectOption({ label: "구독" });
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(editor).toBeHidden();

  const checkbox = page.getByRole("checkbox", { name: /E2E 넷플릭스 납부/ }).first();
  await expect(checkbox).toHaveAttribute("aria-checked", "false");

  // 미납 배지 (결제일이 지난 미납)
  await expect(page.getByRole("link", { name: /정기지출.*미납 1건/ })).toBeVisible();

  // 납부 체크 → 자동 내역
  await checkbox.click();
  await expect(page.getByText("E2E 넷플릭스 납부를 기록했어요")).toBeVisible();
  await expect(checkbox).toHaveAttribute("aria-checked", "true");

  await page.goto("/transactions");
  await expect(page.getByRole("button", { name: /E2E 넷플릭스/ })).toContainText("17,000원");

  // 홈: 정기지출 요약과 최근 내역
  await page.goto("/");
  await expect(page.getByText(/납부 · 17,000원/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /월 지출/ })).toBeVisible();

  // 체크 해제 → 내역 삭제
  await page.getByRole("checkbox", { name: /E2E 넷플릭스 납부/ }).first().click();
  await expect(page.getByText("E2E 넷플릭스 체크를 풀었어요")).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByRole("button", { name: /E2E 넷플릭스/ })).toBeHidden();
});

test("홈 사람 필터를 바꾸면 분할 막대 대신 그 사람 기준 숫자만 보인다 (F-20)", async ({ page }) => {
  await login(page, "a", "/");
  await expect(page.getByRole("img", { name: /공동 .*%/ })).toBeVisible();
  await page.getByRole("navigation", { name: "사람 필터" }).getByRole("link", { name: "공동" }).click();
  await expect(page).toHaveURL(/\/\?who=joint/);
  await expect(page.getByRole("img", { name: /공동 .*%/ })).toBeHidden();
});
