/**
 * 자산·순자산 계산 (F-40, F-41).
 */
import type { Owner } from "@/lib/domain";

export const ASSET_KINDS = [
  "deposit",
  "savings",
  "investment",
  "lease_deposit",
  "real_estate",
  "car",
  "loan",
  "other",
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  deposit: "예금",
  savings: "적금",
  investment: "투자",
  lease_deposit: "보증금",
  real_estate: "부동산",
  car: "자동차",
  loan: "대출",
  other: "기타",
};

export function toAssetKind(value: string): AssetKind {
  return (ASSET_KINDS as readonly string[]).includes(value) ? (value as AssetKind) : "other";
}

type AssetAmount = { amount: number; isLiability: boolean };

export type NetWorth = { assets: number; liabilities: number; net: number };

export function netWorth(items: readonly AssetAmount[]): NetWorth {
  const assets = items.filter((i) => !i.isLiability).reduce((s, i) => s + i.amount, 0);
  const liabilities = items.filter((i) => i.isLiability).reduce((s, i) => s + i.amount, 0);
  return { assets, liabilities, net: assets - liabilities };
}

/** 자산 목록 필터: 자산/부채, 누구 것 */
export type AssetFilter = { side: "all" | "asset" | "liability"; owner: "all" | Owner };

export type AssetGroup<T> = { key: string; label: string; isLiability: boolean; items: T[]; total: number };

/** 묶음 이름: 대출(부채)은 "대출", 다른 종류의 부채는 "기타 부채"처럼 */
function groupLabel(kind: AssetKind, isLiability: boolean): string {
  if (!isLiability || kind === "loan") return ASSET_KIND_LABEL[kind];
  return `${ASSET_KIND_LABEL[kind]} 부채`;
}

/**
 * 자산 목록을 필터하고 종류별로 묶는다 (자산 먼저, 그다음 부채. 종류 순서는 ASSET_KINDS).
 * 묶음 안은 금액 큰 순.
 */
export function groupAssets<T extends { kind: AssetKind; isLiability: boolean; owner: Owner; amount: number }>(
  items: readonly T[],
  filter: AssetFilter,
): AssetGroup<T>[] {
  const shown = items.filter(
    (i) =>
      (filter.side === "all" || (filter.side === "liability") === i.isLiability) &&
      (filter.owner === "all" || i.owner === filter.owner),
  );
  const groups: AssetGroup<T>[] = [];
  for (const isLiability of [false, true]) {
    for (const kind of ASSET_KINDS) {
      const inGroup = shown.filter((i) => i.kind === kind && i.isLiability === isLiability).sort((a, b) => b.amount - a.amount);
      if (inGroup.length === 0) continue;
      groups.push({
        key: `${isLiability ? "debt" : "asset"}-${kind}`,
        label: groupLabel(kind, isLiability),
        isLiability,
        items: inGroup,
        total: inGroup.reduce((s, i) => s + i.amount, 0),
      });
    }
  }
  return groups;
}
