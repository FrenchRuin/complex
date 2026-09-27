import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("날짜 달력으로 지난달 내역 추가 → 이번 달에서 전체 기간 검색·금액 검색 → 이번 달만 보기", async ({ page }) => {
  await login(page, "a", "/transactions");

  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill("7777");
  await panel.getByLabel("가맹점·내용 (선택)").fill("E2E 지난달 검색용");
  await panel.getByRole("radio", { name: "식비" }).click();

  // 날짜: 앱 달력에서 이전 달 15일
  await panel.getByLabel("날짜").click();
  await page.getByRole("button", { name: "이전 달" }).last().click();
  await page.getByRole("button", { name: /월 15일/ }).click();
  await expect(panel.getByLabel("날짜")).toContainText("15일");
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();

  // 이번 달 화면에서 검색 → 전체 기간에서 찾는다
  await page.getByPlaceholder("가맹점·메모 검색").fill("지난달 검색용");
  await expect(page.getByRole("heading", { name: "전체 기간 검색" })).toBeVisible();
  await expect(page.getByText(/검색 결과 1건/)).toBeVisible();
  await expect(page.getByRole("button", { name: /E2E 지난달 검색용/ })).toBeVisible();

  // 이번 달만 보기 → 없음
  await page.getByRole("link", { name: "이번 달만 보기" }).click();
  await expect(page.getByText("이번 달에서만 찾고 있어요.")).toBeVisible();
  await expect(page.getByRole("button", { name: /E2E 지난달 검색용/ })).toBeHidden();

  // 금액으로 검색
  await page.goto("/transactions?q=7%2C777");
  await expect(page.getByText(/‘7,777원’ 검색 결과/)).toBeVisible();
  await expect(page.getByRole("button", { name: /E2E 지난달 검색용/ })).toBeVisible();
});

test("연월 제목을 눌러 해·달을 고른다", async ({ page }) => {
  await login(page, "a", "/stats");
  await page.getByRole("button", { name: /연월 고르기/ }).click();
  await page.getByRole("button", { name: "이전 해" }).click();
  await page.getByRole("link", { name: /년 12월/ }).click();
  await expect(page).toHaveURL(/month=\d{4}-12/);
  await expect(page.getByRole("button", { name: /12월, 연월 고르기/ })).toBeVisible();

  await page.getByRole("button", { name: /연월 고르기/ }).click();
  await page.getByRole("link", { name: "이번 달로" }).click();
  await expect(page).toHaveURL(/\/stats$/);
});

test("날짜 달력은 키보드로도 고를 수 있다", async ({ page }) => {
  await login(page, "a", "/transactions");
  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  const trigger = panel.getByLabel("날짜");
  const before = await trigger.innerText();
  await trigger.click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(trigger).not.toHaveText(before);
  await expect(page.getByRole("button", { name: "오늘" })).toBeHidden();
});
