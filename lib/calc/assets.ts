/**
 * 자산·순자산 계산 (F-40, F-41).
 */
import type { DateString } from "@/lib/date";
import type { Owner, TransactionType } from "@/lib/domain";

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

export type BalanceRecord = { assetId: string; asOf: DateString; amount: number; createdAt: string };
export type BalanceTx = {
  type: TransactionType;
  amount: number;
  occurredOn: DateString;
  createdAt: string;
  assetId: string | null;
  toAssetId: string | null;
};
export type AssetBalance = { balance: number; asOf: DateString; txCount: number };

const time = (iso: string) => Date.parse(iso);

/** 기록 뒤에 넣은 내역인지: 기록 날짜 다음 날부터, 같은 날이면 기록보다 나중에 저장한 것 */
function isAfter(tx: BalanceTx, record: BalanceRecord): boolean {
  return tx.occurredOn > record.asOf || (tx.occurredOn === record.asOf && time(tx.createdAt) > time(record.createdAt));
}

/** 그 자산(자산 기준 부호)에 내역이 더하는 값. 관계없으면 0 */
function effect(tx: BalanceTx, assetId: string): number {
  if (tx.type === "transfer") {
    if (tx.toAssetId === assetId) return tx.amount;
    if (tx.assetId === assetId) return -tx.amount;
    return 0;
  }
  if (tx.assetId !== assetId) return 0;
  return tx.type === "income" ? tx.amount : -tx.amount;
}

/**
 * 자산 잔액 (2026-10-25): 가장 최근 잔액 기록 + 그 기록 뒤에 넣은 내역.
 * 자산은 수입 +, 지출 −, 이체 받기 +, 보내기 −. 부채는 반대(지출하면 빚이 늘어남).
 * 지운 내역·기록은 미리 빼고 넘긴다. 기록이 없는 자산은 결과에 없다.
 */
export function assetBalances(
  assets: readonly { id: string; isLiability: boolean }[],
  records: readonly BalanceRecord[],
  txs: readonly BalanceTx[],
): Record<string, AssetBalance> {
  const result: Record<string, AssetBalance> = {};
  for (const asset of assets) {
    let latest: BalanceRecord | null = null;
    for (const r of records) {
      if (r.assetId !== asset.id) continue;
      if (!latest || r.asOf > latest.asOf || (r.asOf === latest.asOf && time(r.createdAt) > time(latest.createdAt))) latest = r;
    }
    if (!latest) continue;
    let delta = 0;
    let txCount = 0;
    for (const tx of txs) {
      const e = effect(tx, asset.id);
      if (e === 0 || !isAfter(tx, latest)) continue;
      delta += e;
      txCount += 1;
    }
    result[asset.id] = { balance: latest.amount + (asset.isLiability ? -delta : delta), asOf: latest.asOf, txCount };
  }
  return result;
}

/** 순자산에 더하는 값: 자산은 그대로, 부채는 뺀다 */
export function netContribution(amount: number, isLiability: boolean): number {
  return isLiability ? -amount : amount;
}
