import { describe, expect, it } from "vitest";
import { categoryStats, monthlyExpense, personStats, recentMonths, unbudgetedFixedTotal } from "./stats";

const row = (over: Partial<Parameters<typeof monthlyExpense>[0][number]>) => ({
  type: "expense" as const,
  amount: 1000,
  occurredOn: "2026-09-10",
  categoryId: "food",
  scope: "joint" as const,
  memberSlot: "a" as const,
  source: "manual",
  ...over,
});

describe("recentMonths", () => {
  it("기준 달 포함 6개월, 해를 넘어", () => {
    expect(recentMonths("2026-02", 6)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("monthlyExpense", () => {
  it("달별 지출만 더한다 (없는 달은 0)", () => {
    const rows = [
      row({ amount: 5000, occurredOn: "2026-08-31" }),
      row({ amount: 3000, occurredOn: "2026-09-01" }),
      row({ amount: 9999, occurredOn: "2026-09-02", type: "income" }),
    ];
    expect(monthlyExpense(rows, ["2026-07", "2026-08", "2026-09"])).toEqual([
      { month: "2026-07", expense: 0 },
      { month: "2026-08", expense: 5000 },
      { month: "2026-09", expense: 3000 },
    ]);
  });
});

describe("categoryStats", () => {
  const stats = categoryStats(
    [row({ categoryId: "food", amount: 432000 }), row({ categoryId: "cafe", amount: 20000 })],
    [row({ categoryId: "food", amount: 400000 }), row({ categoryId: "cafe", amount: 50000 })],
    [
      { categoryId: "food", amount: 400000 },
      { categoryId: "shop", amount: 100000 },
    ],
  );

  it("많이 쓴 순, 예산만 있는 카테고리도 포함", () => {
    expect(stats.map((s) => s.categoryId)).toEqual(["food", "cafe", "shop"]);
  });

  it("사용률·초과·지난달 대비", () => {
    expect(stats[0]).toEqual({ categoryId: "food", spent: 432000, budget: 400000, percent: 108, overBy: 32000, diff: 32000 });
    expect(stats[1]).toEqual({ categoryId: "cafe", spent: 20000, budget: null, percent: null, overBy: 0, diff: -30000 });
    expect(stats[2]).toMatchObject({ spent: 0, percent: 0 });
  });
});

describe("personStats", () => {
  it("공동/A 개인/B 개인 합계와 상위 2개", () => {
    const p = personStats([
      row({ scope: "joint", memberSlot: "b", amount: 100, categoryId: "food" }),
      row({ scope: "personal", memberSlot: "a", amount: 50, categoryId: "cafe" }),
      row({ scope: "personal", memberSlot: "a", amount: 70, categoryId: "shop" }),
      row({ scope: "personal", memberSlot: "a", amount: 10, categoryId: "food" }),
      row({ scope: "personal", memberSlot: "b", amount: 999, type: "income" }),
    ]);
    expect(p.joint.total).toBe(100);
    expect(p.a).toEqual({
      total: 130,
      top: [
        { categoryId: "shop", amount: 70 },
        { categoryId: "cafe", amount: 50 },
      ],
    });
    expect(p.b).toEqual({ total: 0, top: [] });
  });
});

describe("unbudgetedFixedTotal", () => {
  it("정기지출 중 예산 없는 카테고리만", () => {
    const rows = [
      row({ source: "recurring", categoryId: "house", amount: 180000 }),
      row({ source: "recurring", categoryId: "food", amount: 17000 }),
      row({ source: "manual", categoryId: "house", amount: 5000 }),
    ];
    expect(unbudgetedFixedTotal(rows, [{ categoryId: "food", amount: 100 }])).toBe(180000);
  });
});
