/**
 * 예산 계산 (F-21, F-22).
 */
import { monthRange, type DateString, type MonthString } from "@/lib/date";
import { formatWon } from "@/lib/money";

export type BudgetItem = { categoryId: string; amount: number };

export type CategoryBudgetRow = {
  categoryId: string;
  budget: number;
  spent: number;
  /** 사용률 %, 반올림 (100 넘을 수 있음) */
  percent: number;
  over: boolean;
  /** 초과 금액 (넘지 않았으면 0) */
  overBy: number;
};

export type BudgetSummary = {
  budgetTotal: number;
  spentTotal: number;
  percent: number;
  /** 남은 예산 (넘었으면 음수) */
  remaining: number;
  /** 오늘 포함 이번 달 남은 일수 (지난달이면 0) */
  daysLeft: number;
  /** 남은 기간 하루 예산 (남은 예산이 없으면 0) */
  dailyAllowance: number;
};

/** 카테고리별 지출 합계 (지출만) */
export function spentByCategory(rows: readonly { type: string; categoryId: string; amount: number }[]): Record<string, number> {
  const spent: Record<string, number> = {};
  for (const row of rows) {
    if (row.type === "expense") spent[row.categoryId] = (spent[row.categoryId] ?? 0) + row.amount;
  }
  return spent;
}

/** 예산이 있는 카테고리만, 사용률 높은 순 */
export function categoryBudgetRows(budgets: readonly BudgetItem[], spent: Record<string, number>): CategoryBudgetRow[] {
  return budgets
    .map((b) => {
      const s = spent[b.categoryId] ?? 0;
      return {
        categoryId: b.categoryId,
        budget: b.amount,
        spent: s,
        percent: Math.round((s / b.amount) * 100),
        over: s > b.amount,
        overBy: Math.max(0, s - b.amount),
      };
    })
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget);
}

/** 오늘 포함 남은 일수. today가 그 달이 아니면(지난달) 0, 앞으로의 달이면 그 달 전체 */
export function daysLeftInMonth(month: MonthString, today: DateString): number {
  const { start, end } = monthRange(month);
  if (today > end) return 0;
  const lastDay = Number(end.slice(8, 10));
  if (today < start) return lastDay;
  return lastDay - Number(today.slice(8, 10)) + 1;
}

/** 변동지출 예산 카드: 예산이 있는 카테고리들의 지출 합계 / 예산 합계 */
export function budgetSummary(rows: readonly CategoryBudgetRow[], month: MonthString, today: DateString): BudgetSummary {
  const budgetTotal = rows.reduce((sum, r) => sum + r.budget, 0);
  const spentTotal = rows.reduce((sum, r) => sum + r.spent, 0);
  const remaining = budgetTotal - spentTotal;
  const daysLeft = daysLeftInMonth(month, today);
  return {
    budgetTotal,
    spentTotal,
    percent: budgetTotal === 0 ? 0 : Math.round((spentTotal / budgetTotal) * 100),
    remaining,
    daysLeft,
    dailyAllowance: remaining > 0 && daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0,
  };
}

/** "식비 예산을 32,000원 넘었어요" (F-22) */
export function overText(categoryName: string, overBy: number): string {
  return `${categoryName} 예산을 ${formatWon(overBy)} 넘었어요`;
}

/** 진행바 채움 폭 (0~100) */
export function barWidth(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}
