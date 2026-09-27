/**
 * 자산·순자산·저축 목표 계산 (F-40~F-42).
 */
import { monthOf, shiftMonth, type DateString, type MonthString } from "@/lib/date";
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

export type TrendPoint = { month: MonthString; net: number; current: boolean };

/**
 * 추이 그래프: 기록된 월말 순자산(최근 11개월) + 이번 달 "지금" 값.
 * 기록이 없는 달은 건너뛴다.
 */
export function netWorthTrend(
  snapshots: readonly { month: DateString; totalAssets: number; totalLiabilities: number }[],
  currentNet: number,
  currentMonth: MonthString,
): TrendPoint[] {
  const oldest = shiftMonth(currentMonth, -11);
  const past = snapshots
    .map((s) => ({ month: monthOf(s.month), net: s.totalAssets - s.totalLiabilities, current: false }))
    .filter((p) => p.month >= oldest && p.month < currentMonth)
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  return [...past, { month: currentMonth, net: currentNet, current: true }];
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
