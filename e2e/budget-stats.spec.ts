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
  // 옛 설정 주소는 사이드바 "예산" 화면으로 넘어간다
  await login(page, "a", "/settings/budget");
  await expect(page).toHaveURL(/\/budget$/);
  await page.getByLabel("의료", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "예산 저장" }).click();
  await expect(page.getByText("예산을 저장했어요")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "변동지출 예산" })).toBeVisible();
  await addExpense(page, { amount: "12000", category: "의료", merchant: "E2E 약국" });
  await expect(page.getByText("의료 예산을 2,000원 넘었어요")).toBeVisible();
  await expect(page.getByText("초과 2,000원").first()).toBeVisible();
});

test("용돈: 사이드바 예산 화면에서 정하면 개인 지출만 세고, 홈에서 사람을 고르면 그 사람 용돈만 (F-21)", async ({ page }) => {
  await login(page, "a", "/");
  await page.getByRole("complementary").getByRole("link", { name: "예산" }).click();
  await expect(page).toHaveURL(/\/budget$/);
  await page.getByLabel(/테스트지훈 용돈/).fill("50000");
  await page.getByLabel(/테스트서연 용돈/).fill("70000");
  await page.getByRole("button", { name: "용돈 저장" }).click();
  await expect(page.getByText("용돈을 저장했어요")).toBeVisible();

  // 다른 테스트가 넣은 내역이 있을 수 있어, 지금 쓴 금액에서 얼마나 늘었는지로 본다
  const usage = page.getByRole("region", { name: "용돈 사용" });
  const spentA = async () => {
    const text = (await usage.textContent()) ?? "";
    const match = text.match(/테스트지훈 용돈([\d,]+)원 \/ 50,000원/);
    return Number(match![1].replace(/,/g, ""));
  };
  await expect(usage).toContainText("/ 50,000원");
  const before = await spentA();

  const add = async (amount: string, scope: "개인" | "공동") => {
    await page.getByRole("button", { name: "내역 추가" }).first().click();
    const panel = page.getByRole("dialog", { name: "내역 추가" });
    await panel.getByLabel("금액").fill(amount);
    await panel.getByLabel("가맹점·내용 (선택)").fill("E2E 용돈 지출");
    await panel.getByRole("radio", { name: "식비" }).click();
    await panel.getByRole("radio", { name: scope }).check({ force: true });
    await panel.getByRole("radio", { name: "테스트지훈" }).check({ force: true });
    await panel.getByRole("button", { name: "저장" }).click();
    await expect(panel).toBeHidden();
  };

  // 지훈 개인 지출 60,000원 → 용돈 초과. 지훈이 결제한 공동 지출은 세지 않는다
  await add("60000", "개인");
  await expect.poll(spentA).toBe(before + 60000);
  await expect(usage).toContainText(/테스트지훈님 용돈을 [\d,]+원 넘었어요/);
  await add("30000", "공동");
  await page.reload();
  expect(await spentA()).toBe(before + 60000);

  // 홈: 서연을 고르면 서연 용돈만
  await page.goto("/?who=b");
  const card = page.getByRole("region", { name: "예산" });
  await expect(card).toContainText("테스트서연 용돈");
  await expect(card).not.toContainText("테스트지훈 용돈");
  await expect(card.getByRole("heading", { name: "변동지출 예산" })).toHaveCount(0);
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
