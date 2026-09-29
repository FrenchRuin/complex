/**
 * 자산·순자산·저축 목표 계산 (F-40~F-42).
 */
import { monthOf, monthRange, shiftMonth, type DateString, type MonthString } from "@/lib/date";
import type { Owner } from "@/lib/domain";
import { formatWon } from "@/lib/money";

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

export type TrendPoint = { month: MonthString; net: number; current: boolean };

export type HistoryAsset = { id: string; isLiability: boolean; deletedOn: DateString | null };
export type HistoryValue = { assetId: string; asOf: DateString; amount: number };

/**
 * 그 날짜 기준 순자산: 항목마다 그날까지의 가장 최근 금액 기록을 쓴다.
 * 그날 이전에 삭제한 항목, 그날까지 기록이 없는 항목은 빠진다.
 */
export function netWorthOn(date: DateString, assets: readonly HistoryAsset[], values: readonly HistoryValue[]): number {
  let net = 0;
  for (const asset of assets) {
    if (asset.deletedOn && asset.deletedOn <= date) continue;
    let latest: HistoryValue | null = null;
    for (const v of values) {
      if (v.assetId === asset.id && v.asOf <= date && (!latest || v.asOf > latest.asOf)) latest = v;
    }
    if (latest) net += asset.isLiability ? -latest.amount : latest.amount;
  }
  return net;
}

/**
 * 순자산 추이 (F-41): 최근 12개월 각 달 말일 기준 + 이번 달은 오늘 기준("지금").
 * 금액 기록이 처음 생긴 달부터 보여준다. 지난 날짜로 기록을 넣으면 그 달 값도 바뀐다.
 */
export function netWorthTrend(
  assets: readonly HistoryAsset[],
  values: readonly HistoryValue[],
  currentMonth: MonthString,
  today: DateString,
): TrendPoint[] {
  if (values.length === 0) return [];
  const firstMonth = values.reduce((min, v) => (monthOf(v.asOf) < min ? monthOf(v.asOf) : min), currentMonth);
  const points: TrendPoint[] = [];
  for (let i = 11; i >= 1; i--) {
    const month = shiftMonth(currentMonth, -i);
    if (month < firstMonth) continue;
    points.push({ month, net: netWorthOn(monthRange(month).end, assets, values), current: false });
  }
  points.push({ month: currentMonth, net: netWorthOn(today, assets, values), current: true });
  return points;
}

export type GoalProgress = {
  saved: number;
  /** 진행률 % (100 넘으면 100) */
  percent: number;
  remaining: number;
  /** 이번 달 포함 기한 달까지 남은 달 수 (기한 없으면 null, 지났으면 0) */
  monthsLeft: number | null;
  /** 기한까지 매달 모아야 할 금액 (올림) */
  perMonth: number | null;
};

export function goalProgress(target: number, saved: number, dueDate: DateString | null, today: DateString): GoalProgress {
  const remaining = Math.max(0, target - saved);
  const percent = Math.min(100, Math.floor((saved / target) * 100));
  if (!dueDate) return { saved, percent, remaining, monthsLeft: null, perMonth: null };

  const [dy, dm] = dueDate.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  const monthsLeft = dueDate < today ? 0 : dy * 12 + dm - (ty * 12 + tm) + 1;
  const perMonth = monthsLeft > 0 && remaining > 0 ? Math.ceil(remaining / monthsLeft) : null;
  return { saved, percent, remaining, monthsLeft, perMonth };
}

/** 목표 카드 아래 한 줄 */
export function goalHint(p: GoalProgress, dueDate: DateString | null): string {
  if (p.remaining === 0) return "목표액을 다 모았어요";
  if (!dueDate) return `${formatWon(p.remaining)} 남았어요`;
  if (p.monthsLeft === 0) return `기한이 지났어요 · ${formatWon(p.remaining)} 남았어요`;
  return `${formatWon(p.remaining)} 남았어요 · 매달 ${formatWon(p.perMonth ?? 0)}씩 모으면 돼요`;
}
