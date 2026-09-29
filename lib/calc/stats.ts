/**
 * 통계 계산 (F-23).
 */
import { monthOf, shiftMonth, type MonthString } from "@/lib/date";
import type { CategoryType, Scope, Slot } from "@/lib/domain";
import type { BudgetItem } from "./budget";

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
  budget: number | null;
  /** 예산 사용률 %, 예산 없으면 null */
  percent: number | null;
  overBy: number;
  /** 지난달 대비 증감 (양수 = 더 씀) */
  diff: number;
};

/** 카테고리별: 쓴 돈 / 예산 / 사용률 / 지난달 대비. 쓴 돈이나 예산이 있는 것만, 많이 쓴 순 */
export function categoryStats(
  thisMonth: readonly Row[],
  lastMonth: readonly Row[],
  budgets: readonly BudgetItem[],
): CategoryStat[] {
  const sum = (rows: readonly Row[]) => {
    const map: Record<string, number> = {};
    for (const r of rows) if (r.type === "expense") map[r.categoryId] = (map[r.categoryId] ?? 0) + r.amount;
    return map;
  };
  const now = sum(thisMonth);
  const before = sum(lastMonth);
  const budgetOf = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount]));
  const ids = new Set([...Object.keys(now), ...Object.keys(budgetOf)]);

  return [...ids]
    .map((categoryId) => {
      const spent = now[categoryId] ?? 0;
      const budget = budgetOf[categoryId] ?? null;
      return {
        categoryId,
        spent,
        budget,
        percent: budget ? Math.round((spent / budget) * 100) : null,
        overBy: budget ? Math.max(0, spent - budget) : 0,
        diff: spent - (before[categoryId] ?? 0),
      };
    })
    .sort((a, b) => b.spent - a.spent || (b.budget ?? 0) - (a.budget ?? 0));
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

/** 예산 없는 고정지출: 정기지출로 기록된 지출 중 예산이 없는 카테고리의 합계 */
export function unbudgetedFixedTotal(rows: readonly Row[], budgets: readonly BudgetItem[]): number {
  const budgeted = new Set(budgets.map((b) => b.categoryId));
  return rows
    .filter((r) => r.type === "expense" && r.source === "recurring" && !budgeted.has(r.categoryId))
    .reduce((sum, r) => sum + r.amount, 0);
}
