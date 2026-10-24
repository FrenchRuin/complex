/**
 * 통계 계산 (F-23).
 */
import { monthOf, shiftMonth, type MonthString } from "@/lib/date";
import type { CategoryType, Scope, Slot } from "@/lib/domain";

type Row = {
  type: CategoryType;
  amount: number;
  occurredOn: string;
  categoryId: string;
  scope: Scope;
  memberSlot: Slot;
  source: string;
};

/** 기준 달 포함 최근 n개월 (오래된 달 먼저) */
export function recentMonths(month: MonthString, count: number): MonthString[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - (count - 1)));
}

/** 달별 지출 합계. periodOfDate: 날짜 → 그 날짜가 속한 달 (한 달 기준 F-56, 기본은 달력의 달) */
export function monthlyExpense(
  rows: readonly Row[],
  months: readonly MonthString[],
  periodOfDate: (date: string) => MonthString = monthOf,
): { month: MonthString; expense: number }[] {
  return months.map((month) => ({
    month,
    expense: rows
      .filter((r) => r.type === "expense" && periodOfDate(r.occurredOn) === month)
      .reduce((sum, r) => sum + r.amount, 0),
  }));
}

export type CategoryStat = {
  categoryId: string;
  spent: number;
  /** 지난달 대비 증감 (양수 = 더 씀) */
  diff: number;
};

/** 카테고리별: 쓴 돈 / 지난달 대비. 쓴 돈이 있는 것만, 많이 쓴 순 */
export function categoryStats(thisMonth: readonly Row[], lastMonth: readonly Row[]): CategoryStat[] {
  const sum = (rows: readonly Row[]) => {
    const map: Record<string, number> = {};
    for (const r of rows) if (r.type === "expense") map[r.categoryId] = (map[r.categoryId] ?? 0) + r.amount;
    return map;
  };
  const now = sum(thisMonth);
  const before = sum(lastMonth);
  return Object.entries(now)
    .map(([categoryId, spent]) => ({ categoryId, spent, diff: spent - (before[categoryId] ?? 0) }))
    .sort((a, b) => b.spent - a.spent);
}

export type PersonStat = { total: number; top: { categoryId: string; amount: number }[] };

/** 사람별 (공동 / A 개인 / B 개인): 합계와 상위 카테고리 2개 */
export function personStats(rows: readonly Row[]): Record<"joint" | "a" | "b", PersonStat> {
  const groups = { joint: [] as Row[], a: [] as Row[], b: [] as Row[] };
  for (const r of rows) {
    if (r.type !== "expense") continue;
    groups[r.scope === "joint" ? "joint" : r.memberSlot].push(r);
  }
  const stat = (list: Row[]): PersonStat => {
    const byCategory: Record<string, number> = {};
    for (const r of list) byCategory[r.categoryId] = (byCategory[r.categoryId] ?? 0) + r.amount;
    return {
      total: list.reduce((s, r) => s + r.amount, 0),
      top: Object.entries(byCategory)
        .map(([categoryId, amount]) => ({ categoryId, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 2),
    };
  };
  return { joint: stat(groups.joint), a: stat(groups.a), b: stat(groups.b) };
}
