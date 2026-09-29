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

test("통장·카드 예산: 공동·개인 계좌·카드를 묶어 예산, 그 카드로 쓴 돈만 세고, 홈 사람 필터·삭제 되돌리기 (F-21)", async ({ page }) => {
  const a = await userClient(readCreds().a.email, readCreds().a.password);
  const fake = "00000000-0000-0000-0000-000000000000";
  // 결제수단은 가구를 DB가 채우지 않으므로 내 가구 id를 넣는다
  const { data: me } = await a.from("members").select("household_id").limit(1).single();
  const method = async (name: string, kind: string, owner: string) => {
    const { data, error } = await a
      .from("payment_methods")
      .insert({ name, kind, owner, household_id: me!.household_id, sort_order: 90 })
      .select("id")
      .single();
    expect(error).toBeNull();
    return data!.id as string;
  };
  const lifeAccount = await method("E2E 생활비통장", "account", "joint");
  const lifeCard = await method("E2E 생활비카드", "card", "joint");
  const jhCard = await method("E2E 지훈카드", "card", "a");

  await login(page, "a", "/");
  await page.getByRole("complementary").getByRole("link", { name: "예산" }).click();
  await expect(page).toHaveURL(/\/budget$/);
  const editor = page.getByRole("region", { name: /통장·카드 예산$/ });

  // 공동 통장 + 공동 카드를 묶은 "생활비"
  await editor.getByRole("button", { name: "통장·카드 예산 추가" }).click();
  await editor.getByLabel("이름").fill("E2E 생활비");
  await editor.getByRole("checkbox", { name: /E2E 생활비통장/ }).check();
  await editor.getByRole("checkbox", { name: /E2E 생활비카드/ }).check();
  await editor.getByPlaceholder("나중에 정해도 돼요").fill("100000");
  await editor.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("통장·카드 예산을 추가했어요")).toBeVisible();

  // 목록이 새 값으로 다시 그려진 뒤에 다음 예산 추가
  await expect(editor.getByRole("button", { name: "E2E 생활비 삭제" })).toBeVisible();
  await expect(editor.getByLabel("E2E 생활비", { exact: true })).toHaveValue("100,000");

  // 지훈 카드는 "지훈 용돈". 이미 생활비에 들어간 카드는 고를 수 없다
  await editor.getByRole("button", { name: "통장·카드 예산 추가" }).click();
  await editor.getByLabel("이름").fill("E2E 지훈 용돈");
  await expect(editor.getByRole("checkbox", { name: /E2E 생활비통장/ })).toBeDisabled();
  await editor.getByRole("checkbox", { name: /E2E 지훈카드/ }).check();
  await editor.getByPlaceholder("나중에 정해도 돼요").fill("50000");
  await editor.getByRole("button", { name: "저장", exact: true }).click();
  await expect(editor.getByRole("button", { name: "E2E 지훈 용돈 삭제" })).toBeVisible();

  // 오늘 날짜로 지출: 생활비 통장 60,000 + 생활비 카드(지훈 개인으로 적음) 30,000 = 90,000 / 지훈카드(공동으로 적음) 70,000 / 결제수단 없음 9,999
  const { data: food } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const tx = (amount: number, scope: string, paymentMethodId: string | null) => ({
    type: "expense", amount, occurred_on: today, category_id: food!.id, merchant: "E2E 통장·카드 예산",
    scope, member_slot: "a", payment_method_id: paymentMethodId, source: "manual",
    household_id: fake, created_by: fake, updated_by: fake,
  });
  const inserted = await a
    .from("transactions")
    .insert([tx(60000, "joint", lifeAccount), tx(30000, "personal", lifeCard), tx(70000, "joint", jhCard), tx(9999, "joint", null)]);
  expect(inserted.error).toBeNull();

  await page.reload();
  const usage = page.getByRole("region", { name: "통장·카드 예산 사용" });
  await expect(usage).toContainText("90,000원 / 100,000원");
  await expect(usage).toContainText("10,000원 남았어요");
  await expect(usage).toContainText("E2E 지훈 용돈 예산을 20,000원 넘었어요");

  // 홈: 공동을 고르면 공동 카드가 든 예산만, 지훈을 고르면 지훈 카드가 든 예산만
  await page.goto("/?who=joint");
  const home = page.getByRole("region", { name: "예산" });
  await expect(home).toContainText("E2E 생활비");
  await expect(home).not.toContainText("E2E 지훈 용돈");
  await page.goto("/?who=a");
  await expect(home).toContainText("E2E 지훈 용돈");
  await expect(home).not.toContainText("E2E 생활비");

  // 계좌·카드 설정 목록에 들어 있는 예산 이름
  await page.goto("/settings/payment-methods");
  await expect(page.getByText(/계좌 · E2E 생활비/)).toBeVisible();

  // 삭제 → 되돌리기
  await page.goto("/budget");
  await editor.getByRole("button", { name: "E2E 생활비 삭제" }).click();
  await expect(page.getByText("'E2E 생활비' 예산을 삭제했어요")).toBeVisible();
  await expect(usage).not.toContainText("E2E 생활비");
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(usage).toContainText("E2E 생활비");
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
