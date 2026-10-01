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

test("월말 결산: 통계에서 들어가 다섯 부분을 보고, PDF로 저장이 인쇄 창을 부른다 (F-25)", async ({ page }) => {
  // 실제 인쇄 창 대신 불렸는지만 표시
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "1";
    };
  });
  await login(page, "a", "/");
  await addExpense(page, { amount: "987000", category: "쇼핑", merchant: "E2E 결산 큰 지출" });

  await page.goto("/stats");
  await page.getByRole("link", { name: "월말 결산" }).click();
  await expect(page).toHaveURL(/\/stats\/report$/);

  // 처음엔 지난달. 다음 달 = 이번 달(진행 중), 그보다 뒤로는 못 간다
  await page.getByRole("link", { name: "다음 달" }).click();
  await expect(page.getByText("진행 중", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "다음 달" })).toHaveCount(0);

  for (const name of ["돈 흐름", "카테고리·예산", "정기지출", "자산·목표"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("E2E 결산 큰 지출")).toBeVisible();

  await page.getByRole("button", { name: "PDF로 저장" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-printed", "1");
});

test("결산 인쇄: 다크 모드여도 라이트로, 제목은 파일 이름, 메뉴는 숨기고 메인은 잘리지 않음 (F-25)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page, "a", "/stats/report?month=2099-01"); // 미래 달 → 지난달로
  await expect(page.getByRole("heading", { name: "돈 흐름", exact: true })).toBeVisible();
  const html = page.locator("html");

  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle(/^감자밭 \d{4}년 \d{1,2}월 결산$/);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(html).not.toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle("월말 결산 · 감자밭");

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("complementary")).toBeHidden();
  await expect(page.getByRole("button", { name: "PDF로 저장" })).toBeHidden();
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el).overflowY)).toBe("visible");
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el.parentElement!).height)).not.toBe("800px");
});
