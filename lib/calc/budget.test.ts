import { describe, expect, it } from "vitest";
import {
  allowanceRows,
  allowanceText,
  barWidth,
  budgetSummary,
  categoryBudgetRows,
  daysLeftInMonth,
  overText,
  spentByCategory,
} from "./budget";

describe("spentByCategory", () => {
  it("지출만 카테고리별로 더한다", () => {
    expect(
      spentByCategory([
        { type: "expense", categoryId: "food", amount: 10000 },
        { type: "expense", categoryId: "food", amount: 5000 },
        { type: "income", categoryId: "food", amount: 99999 },
        { type: "expense", categoryId: "cafe", amount: 4500 },
      ]),
    ).toEqual({ food: 15000, cafe: 4500 });
  });
});

describe("categoryBudgetRows", () => {
  const rows = categoryBudgetRows(
    [
      { categoryId: "food", amount: 400000 },
      { categoryId: "cafe", amount: 80000 },
      { categoryId: "shop", amount: 100000 },
    ],
    { food: 432000, cafe: 40000 },
  );

  it("사용률 높은 순, 예산 있는 카테고리만", () => {
    expect(rows.map((r) => r.categoryId)).toEqual(["food", "cafe", "shop"]);
  });

  it("초과 여부와 초과 금액", () => {
    expect(rows[0]).toEqual({ categoryId: "food", budget: 400000, spent: 432000, percent: 108, over: true, overBy: 32000 });
    expect(rows[1]).toMatchObject({ percent: 50, over: false, overBy: 0 });
    expect(rows[2]).toMatchObject({ spent: 0, percent: 0 });
  });
});

describe("daysLeftInMonth", () => {
  it("오늘 포함 남은 날", () => {
    expect(daysLeftInMonth("2026-09", "2026-09-27")).toBe(4);
    expect(daysLeftInMonth("2026-09", "2026-09-30")).toBe(1);
    expect(daysLeftInMonth("2026-09", "2026-09-01")).toBe(30);
  });

  it("지난달은 0, 다음 달은 전체", () => {
    expect(daysLeftInMonth("2026-08", "2026-09-27")).toBe(0);
    expect(daysLeftInMonth("2026-10", "2026-09-27")).toBe(31);
  });
});

describe("budgetSummary", () => {
  it("합계·사용률·남은 예산·하루 예산 (내림)", () => {
    const rows = categoryBudgetRows(
      [
        { categoryId: "food", amount: 400000 },
        { categoryId: "cafe", amount: 100000 },
      ],
      { food: 300000, cafe: 50000 },
    );
    expect(budgetSummary(rows, "2026-09", "2026-09-27")).toEqual({
      budgetTotal: 500000,
      spentTotal: 350000,
      percent: 70,
      remaining: 150000,
      daysLeft: 4,
      dailyAllowance: 37500,
    });
  });

  it("넘었으면 남은 예산은 음수, 하루 예산 0", () => {
    const rows = categoryBudgetRows([{ categoryId: "food", amount: 100 }], { food: 130 });
    expect(budgetSummary(rows, "2026-09", "2026-09-27")).toMatchObject({ remaining: -30, dailyAllowance: 0, percent: 130 });
  });

  it("예산이 없으면 0", () => {
    expect(budgetSummary([], "2026-09", "2026-09-27")).toMatchObject({ budgetTotal: 0, percent: 0 });
  });
});

describe("overText / barWidth", () => {
  it("문구와 막대 폭", () => {
    expect(overText("식비", 32000)).toBe("식비 예산을 32,000원 넘었어요");
    expect(barWidth(130)).toBe(100);
    expect(barWidth(-5)).toBe(0);
  });
});

describe("allowanceRows (용돈)", () => {
  it("한도가 있는 사람만, 개인 지출과 비교한다", () => {
    const rows = allowanceRows([{ slot: "b", amount: 300000 }, { slot: "a", amount: 200000 }], { a: 230000, b: 120000 });
    expect(rows).toEqual([
      { slot: "a", limit: 200000, spent: 230000, percent: 115, remaining: -30000, over: true, overBy: 30000 },
      { slot: "b", limit: 300000, spent: 120000, percent: 40, remaining: 180000, over: false, overBy: 0 },
    ]);
    expect(allowanceRows([{ slot: "a", amount: 100000 }], { a: 0, b: 50000 }).map((r) => r.slot)).toEqual(["a"]);
  });

  it("문구: 남은 금액, 넘으면 이름과 초과 금액", () => {
    const [over, under] = allowanceRows([{ slot: "a", amount: 200000 }, { slot: "b", amount: 300000 }], { a: 230000, b: 120000 });
    expect(allowanceText(over, "지훈")).toBe("지훈님 용돈을 30,000원 넘었어요");
    expect(allowanceText(under, "서연")).toBe("180,000원 남았어요");
  });
});
