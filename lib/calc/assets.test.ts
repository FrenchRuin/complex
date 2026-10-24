import { describe, expect, it } from "vitest";
import { assetBalances, groupAssets, netContribution, netWorth, toAssetKind, type BalanceTx } from "./assets";

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


describe("assetBalances", () => {
  const bank = { id: "bank", isLiability: false };
  const card = { id: "card", isLiability: true };
  const rec = (assetId: string, asOf: string, amount: number, createdAt = `${asOf}T03:00:00+00:00`) => ({ assetId, asOf, amount, createdAt });
  const tx = (over: Partial<BalanceTx>): BalanceTx => ({
    type: "expense", amount: 1_000, occurredOn: "2026-10-26", createdAt: "2026-10-26T01:00:00+00:00", assetId: "bank", toAssetId: null, ...over,
  });

  it("자산: 기록 뒤 수입 +, 지출 −, 이체로 받으면 +, 보내면 −", () => {
    const r = assetBalances([bank, card], [rec("bank", "2026-10-25", 100_000), rec("card", "2026-10-25", 0)], [
      tx({ type: "income", amount: 50_000 }),
      tx({ type: "expense", amount: 12_000 }),
      tx({ type: "transfer", amount: 30_000, assetId: "card", toAssetId: "bank" }),
      tx({ type: "transfer", amount: 5_000, assetId: "bank", toAssetId: "card" }),
    ]);
    expect(r.bank).toEqual({ balance: 100_000 + 50_000 - 12_000 + 30_000 - 5_000, asOf: "2026-10-25", txCount: 4 });
  });

  it("부채: 지출 +, 수입 −, 이체로 받으면(갚으면) −, 보내면 +", () => {
    const r = assetBalances([bank, card], [rec("bank", "2026-10-25", 0), rec("card", "2026-10-25", 200_000)], [
      tx({ type: "expense", amount: 40_000, assetId: "card" }),
      tx({ type: "income", amount: 3_000, assetId: "card" }),
      tx({ type: "transfer", amount: 150_000, assetId: "bank", toAssetId: "card" }),
      tx({ type: "transfer", amount: 10_000, assetId: "card", toAssetId: "bank" }),
    ]);
    expect(r.card.balance).toBe(200_000 + 40_000 - 3_000 - 150_000 + 10_000);
  });

  it("기록 날짜보다 앞선 내역은 빼고, 같은 날이면 기록보다 나중에 넣은 것만 (Review Focus 1)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 100_000, "2026-10-25T05:00:00+00:00")], [
      tx({ occurredOn: "2026-10-24", amount: 1 }),
      tx({ occurredOn: "2026-10-25", createdAt: "2026-10-25T04:59:59+00:00", amount: 10 }),
      tx({ occurredOn: "2026-10-25", createdAt: "2026-10-25T05:00:01+00:00", amount: 100 }),
    ]);
    expect(r.bank).toEqual({ balance: 99_900, asOf: "2026-10-25", txCount: 1 });
  });

  it("가장 최근 기록에서 시작한다 (날짜, 같은 날이면 나중 기록)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-01", 1), rec("bank", "2026-10-20", 500), rec("bank", "2026-10-10", 9)], []);
    expect(r.bank).toEqual({ balance: 500, asOf: "2026-10-20", txCount: 0 });
  });

  it("0보다 작아질 수 있다 (마이너스 통장)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 10_000)], [tx({ amount: 30_000 })]);
    expect(r.bank.balance).toBe(-20_000);
  });

  it("자산이 없는 예전 내역과 다른 자산의 내역은 영향이 없다", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 10_000)], [tx({ assetId: null }), tx({ assetId: "other" })]);
    expect(r.bank).toEqual({ balance: 10_000, asOf: "2026-10-25", txCount: 0 });
  });

  it("기록이 없는 자산은 결과에 없다", () => {
    expect(assetBalances([bank], [], [])).toEqual({});
  });
});

describe("netContribution", () => {
  it("자산은 그대로, 부채는 빼는 값", () => {
    expect(netContribution(1_000, false)).toBe(1_000);
    expect(netContribution(1_000, true)).toBe(-1_000);
    expect(netContribution(-500, true)).toBe(500);
  });
});
