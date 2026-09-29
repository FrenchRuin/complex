import { describe, expect, it } from "vitest";
import {
  barWidth,
  budgetSummary,
  categoryBudgetRows,
  daysLeftInRange,
  overText,
  spendBudgetRows,
  spendBudgetText,
  spentByCategory,
} from "./budget";
import { monthRange } from "@/lib/date";

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

describe("daysLeftInRange", () => {
  it("오늘 포함 남은 날", () => {
    expect(daysLeftInRange(monthRange("2026-09"), "2026-09-27")).toBe(4);
    expect(daysLeftInRange(monthRange("2026-09"), "2026-09-30")).toBe(1);
    expect(daysLeftInRange(monthRange("2026-09"), "2026-09-01")).toBe(30);
  });

  it("지난 기간은 0, 앞으로의 기간은 전체", () => {
    expect(daysLeftInRange(monthRange("2026-08"), "2026-09-27")).toBe(0);
    expect(daysLeftInRange(monthRange("2026-10"), "2026-09-27")).toBe(31);
  });

  it("월급날 주기(9/23~10/22)는 달을 넘어 센다 (F-56)", () => {
    expect(daysLeftInRange({ start: "2026-09-23", end: "2026-10-22" }, "2026-09-29")).toBe(24);
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
    expect(budgetSummary(rows, monthRange("2026-09"), "2026-09-27")).toEqual({
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
    expect(budgetSummary(rows, monthRange("2026-09"), "2026-09-27")).toMatchObject({ remaining: -30, dailyAllowance: 0, percent: 130 });
  });

  it("예산이 없으면 0", () => {
    expect(budgetSummary([], monthRange("2026-09"), "2026-09-27")).toMatchObject({ budgetTotal: 0, percent: 0 });
  });
});

describe("overText / barWidth", () => {
  it("문구와 막대 폭", () => {
    expect(overText("식비", 32000)).toBe("식비 예산을 32,000원 넘었어요");
    expect(barWidth(130)).toBe(100);
    expect(barWidth(-5)).toBe(0);
  });
});

describe("spendBudgetRows (통장·카드 예산)", () => {
  const budgets = [
    { id: "life", name: "생활비", methodIds: ["joint-account", "joint-card"], amount: 100000 },
    { id: "jh", name: "지훈 용돈", methodIds: ["a-card"], amount: 50000 },
    { id: "none", name: "금액 없음", methodIds: ["b-card"], amount: null },
  ];
  const rows = [
    { type: "expense", amount: 60000, paymentMethodId: "joint-account" },
    { type: "expense", amount: 30000, paymentMethodId: "joint-card" }, // 여러 결제수단을 합쳐서
    { type: "expense", amount: 70000, paymentMethodId: "a-card" }, // 공동으로 적었어도 지훈 카드면 지훈 용돈
    { type: "expense", amount: 9999, paymentMethodId: "salary-card" }, // 어느 예산에도 없는 카드
    { type: "expense", amount: 5000, paymentMethodId: null },
    { type: "income", amount: 99999, paymentMethodId: "joint-card" },
  ];

  it("예산마다 그 결제수단들로 쓴 지출만, 금액 없는 예산은 빼기", () => {
    expect(spendBudgetRows(budgets, rows)).toEqual([
      { id: "life", name: "생활비", limit: 100000, spent: 90000, percent: 90, remaining: 10000, over: false, overBy: 0 },
      { id: "jh", name: "지훈 용돈", limit: 50000, spent: 70000, percent: 140, remaining: -20000, over: true, overBy: 20000 },
    ]);
  });

  it("문구: 남은 금액, 넘으면 예산 이름과 초과 금액", () => {
    const [life, jh] = spendBudgetRows(budgets, rows);
    expect(spendBudgetText(life)).toBe("10,000원 남았어요");
    expect(spendBudgetText(jh)).toBe("지훈 용돈 예산을 20,000원 넘었어요");
  });
});
