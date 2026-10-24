import { describe, expect, it } from "vitest";
import { groupAssets, netWorth, toAssetKind } from "./assets";

describe("groupAssets", () => {
  const items = [
    { id: "1", kind: "savings", isLiability: false, owner: "a", amount: 100 },
    { id: "2", kind: "deposit", isLiability: false, owner: "joint", amount: 50 },
    { id: "3", kind: "deposit", isLiability: false, owner: "b", amount: 300 },
    { id: "4", kind: "loan", isLiability: true, owner: "joint", amount: 1000 },
    { id: "5", kind: "other", isLiability: true, owner: "a", amount: 20 },
  ] as const;
  const all = { side: "all", owner: "all" } as const;

  it("자산 먼저, 종류 순서대로 묶고 합계, 묶음 안은 금액 큰 순", () => {
    const groups = groupAssets(items, all);
    expect(groups.map((g) => [g.label, g.total, g.items.map((i) => i.id)])).toEqual([
      ["예금", 350, ["3", "2"]],
      ["적금", 100, ["1"]],
      ["대출", 1000, ["4"]],
      ["기타 부채", 20, ["5"]],
    ]);
    expect(groups.map((g) => g.isLiability)).toEqual([false, false, true, true]);
  });

  it("자산/부채, 누구 것 필터", () => {
    expect(groupAssets(items, { side: "liability", owner: "all" }).map((g) => g.label)).toEqual(["대출", "기타 부채"]);
    expect(groupAssets(items, { side: "all", owner: "a" }).map((g) => g.items.map((i) => i.id))).toEqual([["1"], ["5"]]);
    expect(groupAssets(items, { side: "asset", owner: "joint" }).map((g) => g.total)).toEqual([50]);
    expect(groupAssets([], all)).toEqual([]);
  });
});

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

describe("toAssetKind", () => {
  it("모르는 값은 기타", () => {
    expect(toAssetKind("loan")).toBe("loan");
    expect(toAssetKind("bitcoin")).toBe("other");
  });
});

