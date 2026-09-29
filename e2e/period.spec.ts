import { expect, test } from "@playwright/test";
import { readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

const todayKST = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
const pad = (n: number) => String(n).padStart(2, "0");

/** 25일 시작·당기지 않음·끝나는 달 이름일 때 오늘이 속한 기간 (테스트 쪽 계산) */
function expectedPeriod(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  // 시작 달: 오늘이 25일 이후면 이번 달, 아니면 지난달
  const start = d >= 25 ? new Date(Date.UTC(y, m - 1, 25)) : new Date(Date.UTC(y, m - 2, 25));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 24));
  const iso = (dt: Date) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  return {
    start: iso(start),
    end: iso(end),
    // 이름은 끝나는 달
    name: `${end.getUTCMonth() + 1}월`,
    startLabel: `${start.getUTCMonth() + 1}월 25일`,
    endLabel: `${end.getUTCMonth() + 1}월 24일`,
  };
}

test("한 달 기준: 25일로 정하면 홈·내역·예산이 그 기간을 따르고, 1일로 돌리면 원래대로 (F-56)", async ({ page }) => {
  const a = await userClient(readCreds().a.email, readCreds().a.password);
  const reset = () => a.rpc("set_period_settings", { p_start_day: 1, p_label: "end", p_shift: true });
  await reset();

  try {
    await login(page, "a", "/settings");
    await page.getByRole("navigation", { name: "설정 메뉴" }).getByRole("link", { name: /^한 달 기준/ }).click();
    await expect(page).toHaveURL(/\/settings\/period$/);

    // 1일이면 이름·당기기 설정은 숨겨져 있다
    await expect(page.getByText("주말·공휴일이면 앞 평일부터 시작")).toHaveCount(0);
    await page.getByRole("combobox", { name: "한 달 시작일 (월급날)" }).click();
    await page.getByRole("option", { name: "25일", exact: true }).click();
    await page.getByText("주말·공휴일이면 앞 평일부터 시작").click(); // 끄기: 요일과 관계없이 딱 25일
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("한 달 기준을 저장했어요")).toBeVisible();

    const p = expectedPeriod(todayKST());
    const months = page.getByRole("region", { name: "달마다 기간" });
    await expect(months.getByRole("listitem").filter({ hasText: "이번 달" })).toContainText(p.name);
    await expect(months.getByRole("listitem").filter({ hasText: "이번 달" })).toContainText(p.startLabel);

    // 기간 첫날에 내역을 넣으면 이번 기간에 들어간다 (달력의 달로는 지난달일 수도 있는 날)
    const { data: food } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
    const fake = "00000000-0000-0000-0000-000000000000";
    const added = await a.from("transactions").insert({
      type: "expense", amount: 4321, occurred_on: p.start, category_id: food!.id, merchant: "E2E 기간 첫날",
      scope: "joint", member_slot: "a", source: "manual", household_id: fake, created_by: fake, updated_by: fake,
    });
    expect(added.error).toBeNull();

    // 홈: "10월 지출" + 기간
    await page.goto("/");
    await expect(page.getByRole("heading", { name: `${p.name} 지출` })).toBeVisible();
    await expect(page.getByText(`${p.startLabel} ~ ${p.endLabel}`)).toBeVisible();

    // 예산: 머리에 기간
    await page.goto("/budget");
    await expect(page.getByText(`${p.startLabel} ~ ${p.endLabel}`)).toBeVisible();

    // 내역: 달력은 기간 첫날부터, 첫 칸은 "월/일", 첫날 내역이 목록에
    await page.goto("/transactions");
    const firstCell = page.getByRole("region", { name: "달력" }).getByRole("link").first();
    await expect(firstCell).toContainText(`${Number(p.start.slice(5, 7))}/25`);
    await expect(page.getByRole("button", { name: /E2E 기간 첫날/ })).toBeVisible();

    // 날짜만 있는 주소(알림)도 그 날짜가 든 기간을 연다
    await page.goto(`/transactions?day=${p.start}`);
    await expect(page.getByRole("button", { name: /E2E 기간 첫날/ })).toBeVisible();

    // 이번 기간 시작일을 하루 앞당기면 그 달만 바뀐다
    await page.goto("/settings/period");
    const current = months.getByRole("listitem").filter({ hasText: "이번 달" });
    await current.getByRole("button", { name: /시작일 바꾸기$/ }).click();
    const before = new Date(`${p.start}T00:00:00Z`);
    before.setUTCDate(before.getUTCDate() - 1);
    await current.getByRole("button", { name: /시작일/ }).filter({ hasText: /년/ }).click();
    await page.getByRole("group", { name: /날짜/ }).getByRole("button", { name: new RegExp(`^${before.getUTCMonth() + 1}월 ${before.getUTCDate()}일`) }).click();
    await current.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("시작일을 바꿨어요")).toBeVisible();
    await expect(current).toContainText("직접 고침");
    await current.getByRole("button", { name: /원래대로$/ }).click();
    await expect(current).not.toContainText("직접 고침");

    // 앞 달 시작일보다 앞으로는 못 고친다
    await current.getByRole("button", { name: /시작일 바꾸기$/ }).click();
    await current.getByRole("button", { name: /시작일/ }).filter({ hasText: /년/ }).click();
    await page.getByRole("button", { name: "이전 달" }).click();
    await page.getByRole("button", { name: "이전 달" }).click();
    await page.getByRole("group", { name: /날짜/ }).getByRole("button", { name: /^\d+월 1일/ }).click();
    await current.getByRole("button", { name: "저장" }).click();
    await expect(current.getByRole("alert")).toContainText("앞 달 시작일보다 뒤 날짜로 골라 주세요");
  } finally {
    await a.from("period_overrides").delete().gte("month", "2000-01-01");
    await reset();
  }

  // 1일로 돌리면 기간 표시가 없다
  await page.goto("/");
  await expect(page.getByText(/\d+월 25일 ~ /)).toHaveCount(0);
});
