import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("통계 화면: 6개월 그래프, 카테고리별, 사람별 (F-23)", async ({ page }) => {
  await login(page, "a", "/stats");
  await expect(page.getByRole("heading", { name: "최근 6개월 지출" })).toBeVisible();
  await page.getByText("표로 보기").click();
  await expect(page.getByRole("table")).toContainText("진행 중");
  await expect(page.getByRole("heading", { name: "카테고리별 지출" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "사람별 지출" })).toBeVisible();
});

test("통계에는 예산·월말 결산이 없다 (2026-10-25 단순화)", async ({ page }) => {
  await login(page, "a", "/stats");
  await expect(page.getByRole("heading", { name: "카테고리별 지출" })).toBeVisible();
  await expect(page.getByText(/예산/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "월말 결산" })).toHaveCount(0);
});
