import { describe, expect, it } from "vitest";
import { categoryStats, monthlyExpense, personStats, recentMonths } from "./stats";

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
  it("지출만 카테고리별로 더하고 많이 쓴 순, 지난달 대비 증감", () => {
    const stats = categoryStats(
      [
        row({ categoryId: "food", amount: 432000 }),
        row({ categoryId: "cafe", amount: 20000 }),
        row({ categoryId: "salary", amount: 3000000, type: "income" }),
      ],
      [row({ categoryId: "food", amount: 400000 }), row({ categoryId: "cafe", amount: 50000 }), row({ categoryId: "taxi", amount: 8000 })],
    );
    expect(stats).toEqual([
      { categoryId: "food", spent: 432000, diff: 32000 },
      { categoryId: "cafe", spent: 20000, diff: -30000 },
    ]);
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
