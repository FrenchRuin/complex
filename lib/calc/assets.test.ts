import { describe, expect, it } from "vitest";
import { goalHint, goalProgress, netWorth, netWorthOn, netWorthTrend, toAssetKind } from "./assets";

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

describe("netWorthOn / netWorthTrend (금액 기록 기준)", () => {
  const assets = [
    { id: "saving", isLiability: false, deletedOn: null },
    { id: "loan", isLiability: true, deletedOn: null },
    { id: "car", isLiability: false, deletedOn: "2026-09-10" }, // 9월 10일에 팔아서 삭제
  ];
  const values = [
    { assetId: "saving", asOf: "2026-07-15", amount: 1000 },
    { assetId: "saving", asOf: "2026-08-31", amount: 1200 },
    { assetId: "saving", asOf: "2026-09-20", amount: 1500 },
    { assetId: "loan", asOf: "2026-08-10", amount: 500 },
    { assetId: "car", asOf: "2026-07-01", amount: 300 },
  ];

  it("그날까지의 가장 최근 금액, 삭제 전까지만 포함", () => {
    expect(netWorthOn("2026-07-31", assets, values)).toBe(1000 + 300);
    expect(netWorthOn("2026-08-31", assets, values)).toBe(1200 - 500 + 300);
    expect(netWorthOn("2026-09-28", assets, values)).toBe(1500 - 500); // 차는 9월 10일 삭제
    expect(netWorthOn("2026-06-30", assets, values)).toBe(0);
  });

  it("처음 기록한 달부터 매달 말 기준 + 이번 달은 오늘 기준", () => {
    expect(netWorthTrend(assets, values, "2026-09", "2026-09-28")).toEqual([
      { month: "2026-07", net: 1300, current: false },
      { month: "2026-08", net: 1000, current: false },
      { month: "2026-09", net: 1000, current: true },
    ]);
  });

  it("지난 날짜로 기록을 넣으면 그 달 값이 바뀐다", () => {
    const more = [...values, { assetId: "saving", asOf: "2026-07-31", amount: 1100 }];
    expect(netWorthTrend(assets, more, "2026-09", "2026-09-28")[0]).toEqual({ month: "2026-07", net: 1400, current: false });
  });

  it("최근 12개월만, 기록이 없으면 빈 목록", () => {
    const old = [{ assetId: "saving", asOf: "2024-01-01", amount: 1 }];
    expect(netWorthTrend(assets, old, "2026-09", "2026-09-28")).toHaveLength(12);
    expect(netWorthTrend(assets, [], "2026-09", "2026-09-28")).toEqual([]);
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
