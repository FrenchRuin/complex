import { expect, test, type Page } from "@playwright/test";
import { readCreds, userClient } from "./support/accounts";
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

test("용돈: 용돈 통장·카드로 쓴 것만 세고(공동으로 적어도 포함), 홈에서 사람을 고르면 그 사람 용돈만 (F-21)", async ({ page }) => {
  // 설정 → 계좌·카드: 지훈 용돈 카드 표시 (공동 소유면 체크가 없다)
  await login(page, "a", "/settings/payment-methods");
  await page.getByRole("button", { name: "계좌·카드 추가" }).click();
  await page.getByLabel("이름").fill("E2E 지훈용돈");
  await expect(page.getByText("용돈 통장·카드예요")).toHaveCount(0);
  await page.getByRole("radio", { name: "테스트지훈" }).check({ force: true });
  await page.getByText("용돈 통장·카드예요").click();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText(/카드 · 용돈/)).toBeVisible();

  // 사이드바 예산 화면에서 용돈 정하기
  await page.getByRole("complementary").getByRole("link", { name: "예산" }).click();
  await expect(page).toHaveURL(/\/budget$/);
  await page.getByLabel(/테스트지훈 용돈/).fill("50000");
  await page.getByLabel(/테스트서연 용돈/).fill("70000");
  await page.getByRole("button", { name: "용돈 저장" }).click();
  await expect(page.getByText("용돈을 저장했어요")).toBeVisible();

  const usage = page.getByRole("region", { name: "용돈 사용" });
  const spentA = async () => {
    const text = (await usage.textContent()) ?? "";
    const match = text.match(/테스트지훈 용돈([\d,]+)원 \/ 50,000원/);
    return Number(match![1].replace(/,/g, ""));
  };
  await expect(usage).toContainText("/ 50,000원");
  const before = await spentA();

  const a = await userClient(readCreds().a.email, readCreds().a.password);
  const { data: card } = await a.from("payment_methods").select("id, is_allowance").eq("name", "E2E 지훈용돈").single();
  expect(card!.is_allowance).toBe(true);
  // 용돈 결제수단을 공동 소유로 바꾸는 건 DB가 막는다
  expect((await a.from("payment_methods").update({ owner: "joint" }).eq("id", card!.id)).error).not.toBeNull();
  const { data: food } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
  const fake = "00000000-0000-0000-0000-000000000000";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const tx = (amount: number, scope: string, paymentMethodId: string | null) => ({
    type: "expense", amount, occurred_on: today, category_id: food!.id, merchant: "E2E 용돈 지출",
    scope, member_slot: "a", payment_method_id: paymentMethodId, source: "manual",
    household_id: fake, created_by: fake, updated_by: fake,
  });
  // 월급에서 나간 개인 지출(용돈 카드 아님) 60,000 → 안 셈. 용돈 카드로 낸 공동 20,000 + 개인 40,000 → 셈
  const inserted = await a.from("transactions").insert([tx(60000, "personal", null), tx(20000, "joint", card!.id), tx(40000, "personal", card!.id)]);
  expect(inserted.error).toBeNull();
  await page.reload();
  expect(await spentA()).toBe(before + 60000);
  await expect(usage).toContainText(/테스트지훈님 용돈을 [\d,]+원 넘었어요/);

  // 홈: 서연을 고르면 서연 용돈만
  await page.goto("/?who=b");
  const home = page.getByRole("region", { name: "예산" });
  await expect(home).toContainText("테스트서연 용돈");
  await expect(home).not.toContainText("테스트지훈 용돈");
  await expect(home.getByRole("heading", { name: "변동지출 예산" })).toHaveCount(0);
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
