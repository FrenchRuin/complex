import { describe, expect, it } from "vitest";
import { goalHint, goalProgress, netWorth, netWorthTrend, toAssetKind } from "./assets";

describe("netWorth", () => {
  it("자산 합 − 부채 합", () => {
    expect(
      netWorth([
        { amount: 30_000_000, isLiability: false },
        { amount: 200_000_000, isLiability: false },
        { amount: 150_000_000, isLiability: true },
      ]),
    ).toEqual({ assets: 230_000_000, liabilities: 150_000_000, net: 80_000_000 });
  });

  it("없으면 0, 부채가 더 많으면 음수", () => {
    expect(netWorth([])).toEqual({ assets: 0, liabilities: 0, net: 0 });
    expect(netWorth([{ amount: 100, isLiability: true }]).net).toBe(-100);
  });
});

describe("netWorthTrend", () => {
  it("최근 11개월 기록 + 이번 달 지금 값, 오래된 순", () => {
    const trend = netWorthTrend(
      [
        { month: "2026-08-01", totalAssets: 100, totalLiabilities: 40 },
        { month: "2025-09-01", totalAssets: 1, totalLiabilities: 0 }, // 12개월 전 → 제외
        { month: "2026-07-01", totalAssets: 90, totalLiabilities: 40 },
      ],
      70,
      "2026-09",
    );
    expect(trend).toEqual([
      { month: "2026-07", net: 50, current: false },
      { month: "2026-08", net: 60, current: false },
      { month: "2026-09", net: 70, current: true },
    ]);
  });
});

describe("goalProgress / goalHint", () => {
  it("기한까지 남은 달(이번 달 포함)로 나눠 올림", () => {
    // 1,000만 목표, 400만 모음, 오늘 9월 27일, 기한 12월 31일 → 9·10·11·12월 4달
    const p = goalProgress(10_000_000, 4_000_000, "2026-12-31", "2026-09-27");
    expect(p).toEqual({ saved: 4_000_000, percent: 40, remaining: 6_000_000, monthsLeft: 4, perMonth: 1_500_000 });
    expect(goalHint(p, "2026-12-31")).toBe("6,000,000원 남았어요 · 매달 1,500,000원씩 모으면 돼요");
  });

  it("기한 없음", () => {
    const p = goalProgress(1000, 250, null, "2026-09-27");
    expect(p).toMatchObject({ percent: 25, monthsLeft: null, perMonth: null });
    expect(goalHint(p, null)).toBe("750원 남았어요");
  });

  it("기한이 지남, 다 모음, 넘게 모음", () => {
    expect(goalHint(goalProgress(1000, 0, "2026-08-31", "2026-09-27"), "2026-08-31")).toBe("기한이 지났어요 · 1,000원 남았어요");
    expect(goalHint(goalProgress(1000, 1000, "2026-12-31", "2026-09-27"), "2026-12-31")).toBe("목표액을 다 모았어요");
    expect(goalProgress(1000, 1500, null, "2026-09-27")).toMatchObject({ percent: 100, remaining: 0 });
  });

  it("같은 달 기한이면 1달", () => {
    expect(goalProgress(300, 0, "2026-09-30", "2026-09-27").monthsLeft).toBe(1);
  });
});

describe("toAssetKind", () => {
  it("모르는 값은 기타", () => {
    expect(toAssetKind("loan")).toBe("loan");
    expect(toAssetKind("bitcoin")).toBe("other");
  });
});
