/**
 * 예산 계산 (F-21, F-22).
 */
import { daysBetween, type DateRange, type DateString } from "@/lib/date";
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

/**
 * 오늘 포함 남은 일수. 기간(달력의 한 달 또는 월급날 주기, F-56)이 지났으면 0, 앞으로의 기간이면 전체.
 */
export function daysLeftInRange(range: DateRange, today: DateString): number {
  if (today > range.end) return 0;
  if (today < range.start) return daysBetween(range.start, range.end) + 1;
  return daysBetween(today, range.end) + 1;
}

/** 변동지출 예산 카드: 예산이 있는 카테고리들의 지출 합계 / 예산 합계. range는 그 달의 기간 */
export function budgetSummary(rows: readonly CategoryBudgetRow[], range: DateRange, today: DateString): BudgetSummary {
  const budgetTotal = rows.reduce((sum, r) => sum + r.budget, 0);
  const spentTotal = rows.reduce((sum, r) => sum + r.spent, 0);
  const remaining = budgetTotal - spentTotal;
  const daysLeft = daysLeftInRange(range, today);
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

/**
 * 통장·카드 예산 (F-21, 2026-09-29): 이름 + 한 달 금액 + 셀 결제수단(하나 이상, 공동·개인 모두).
 * 그 결제수단들로 쓴 지출 합계를 금액과 비교한다. 공동으로 적은 지출도 그 카드로 냈으면 센다. 수입은 세지 않는다.
 */
export type SpendBudget = {
  id: string;
  name: string;
  methodIds: readonly string[];
  /** 그 달 금액 (정하지 않았으면 null) */
  amount: number | null;
};

export type SpendBudgetRow = {
  id: string;
  name: string;
  limit: number;
  spent: number;
  percent: number;
  /** 남은 금액 (넘었으면 음수) */
  remaining: number;
  over: boolean;
  overBy: number;
};

/** 그 달 금액이 있는 예산만, 순서 그대로 */
export function spendBudgetRows(
  budgets: readonly SpendBudget[],
  rows: readonly { type: string; amount: number; paymentMethodId: string | null }[],
): SpendBudgetRow[] {
  return budgets.flatMap((b) => {
    if (b.amount === null) return [];
    const methods = new Set(b.methodIds);
    const spent = rows
      .filter((r) => r.type === "expense" && r.paymentMethodId !== null && methods.has(r.paymentMethodId))
      .reduce((sum, r) => sum + r.amount, 0);
    return [
      {
        id: b.id,
        name: b.name,
        limit: b.amount,
        spent,
        percent: Math.round((spent / b.amount) * 100),
        remaining: b.amount - spent,
        over: spent > b.amount,
        overBy: Math.max(0, spent - b.amount),
      },
    ];
  });
}

/** "70,000원 남았어요" / "생활비 예산을 30,000원 넘었어요" */
export function spendBudgetText(row: SpendBudgetRow): string {
  return row.over ? overText(row.name, row.overBy) : `${formatWon(row.remaining)} 남았어요`;
}
