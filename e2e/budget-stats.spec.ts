import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

async function addExpense(page: Page, opts: { amount: string; category: string; merchant: string }) {
  await page.getByRole("button", { name: "내역 추가" }).first().click();
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill(opts.amount);
  await panel.getByLabel("가맹점·내용 (선택)").fill(opts.merchant);
  await panel.getByRole("radio", { name: opts.category }).click();
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();
}

test("예산을 넘으면 홈에 초과 표시 (F-21, F-22)", async ({ page }) => {
  await login(page, "a", "/settings/budget");
  await page.getByLabel("의료", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "예산 저장" }).click();
  await expect(page.getByText("예산을 저장했어요")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "변동지출 예산" })).toBeVisible();
  await addExpense(page, { amount: "12000", category: "의료", merchant: "E2E 약국" });
  await expect(page.getByText("의료 예산을 2,000원 넘었어요")).toBeVisible();
  await expect(page.getByText("초과 2,000원").first()).toBeVisible();
});

test("통계 화면: 6개월 그래프, 카테고리별, 사람별 (F-23)", async ({ page }) => {
  await login(page, "a", "/stats");
  await expect(page.getByRole("heading", { name: "최근 6개월 지출" })).toBeVisible();
  await page.getByText("표로 보기").click();
  await expect(page.getByRole("table")).toContainText("진행 중");
  await expect(page.getByRole("heading", { name: "카테고리별 지출" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "사람별 지출" })).toBeVisible();
});

test("정산 칸은 없다 (F-24 제거, 2026-09-27)", async ({ page }) => {
  await login(page, "a", "/stats");
  await expect(page.getByRole("heading", { name: "카테고리별 지출" })).toBeVisible();
  await expect(page.getByText("공동 지출 정산")).toHaveCount(0);
});
