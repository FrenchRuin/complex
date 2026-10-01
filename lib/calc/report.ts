/**
 * 월말 결산 계산 (F-25). 한 달을 둘이 같이 돌아보는 화면용.
 * 달은 한 달 기준(F-56)의 기간이다. 부르는 쪽이 기간(range)을 넘긴다.
 */
import { addDays, formatMonthLabel, shiftMonth, type DateRange, type DateString, type MonthString } from "@/lib/date";
import { formatWon } from "@/lib/money";
import { goalProgress, netWorthOn, type HistoryAsset, type HistoryValue } from "./assets";
import { overText, type SpendBudgetRow } from "./budget";
import type { DayTotal } from "./group";
import type { CategoryStat } from "./stats";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 주소의 month → 보여줄 달. 없거나 형식이 틀리거나 이번 달보다 뒤면 지난달(가장 최근에 끝난 달) */
export function reportMonth(param: string | undefined, current: MonthString): MonthString {
  if (param && MONTH.test(param) && param <= current) return param;
  return shiftMonth(current, -1);
}

/** "감자밭 2026년 9월 결산" (인쇄할 때 파일 이름으로 제안된다) */
export function reportTitle(month: MonthString): string {
  return `감자밭 ${formatMonthLabel(month)} 결산`;
}

/** "10월 1일에 만들었어요" */
export function madeOnText(today: DateString): string {
  return `${Number(today.slice(5, 7))}월 ${Number(today.slice(8, 10))}일에 만들었어요`;
}

/** 남은 돈(수입 − 지출): "500,000원 남았어요" / "30,000원 더 썼어요" */
export function balanceText(totals: DayTotal): string {
  const diff = totals.income - totals.expense;
  if (diff === 0) return "수입과 지출이 같아요";
  return diff > 0 ? `${formatWon(diff)} 남았어요` : `${formatWon(-diff)} 더 썼어요`;
}

/** 끝난 달끼리라 "같은 기간"이 아니라 지난달 전체와 비교한다 */
export function compareWithLastPeriod(thisExpense: number, lastExpense: number): string {
  const diff = thisExpense - lastExpense;
  if (diff === 0) return "지난달과 똑같이 썼어요";
  return `지난달보다 ${formatWon(Math.abs(diff))} ${diff < 0 ? "적게" : "많이"} 썼어요`;
}

/** 가장 크게 쓴 지출 n건: 금액 큰 순, 같으면 날짜 빠른 순 */
export function topExpenses<T extends { type: string; amount: number; occurredOn: DateString }>(
  rows: readonly T[],
  count = 5,
): T[] {
  return rows
    .filter((r) => r.type === "expense")
    .sort((a, b) => b.amount - a.amount || (a.occurredOn < b.occurredOn ? -1 : a.occurredOn > b.occurredOn ? 1 : 0))
    .slice(0, count);
}

/** 넘은 예산 문구 모음 (F-22 문구): 카테고리 예산 먼저, 그다음 통장·카드 예산 */
export function overBudgetTexts(
  categories: readonly CategoryStat[],
  spend: readonly SpendBudgetRow[],
  categoryName: (id: string) => string,
): string[] {
  return [
    ...categories.filter((c) => c.overBy > 0).map((c) => overText(categoryName(c.categoryId), c.overBy)),
    ...spend.filter((s) => s.over).map((s) => overText(s.name, s.overBy)),
  ];
}

export type ReportGoal = {
  id: string;
  name: string;
  targetAmount: number;
  /** 기간 마지막 날까지 모은 금액 */
  saved: number;
  percent: number;
  /** 그 기간에 적립한 금액 */
  addedThisPeriod: number;
};

type GoalInput = {
  id: string;
  name: string;
  targetAmount: number;
  isDone: boolean;
  contributions: readonly { amount: number; contributedOn: DateString }[];
};

/** 결산에 보일 목표: 끝나지 않은 목표 + 그 기간에 적립이 있는 목표. 진행률은 기간 마지막 날까지 모은 금액 기준 */
export function reportGoals(goals: readonly GoalInput[], range: DateRange): ReportGoal[] {
  return goals.flatMap((g) => {
    const sum = (from: DateString | null) =>
      g.contributions
        .filter((c) => c.contributedOn <= range.end && (from === null || c.contributedOn >= from))
        .reduce((s, c) => s + c.amount, 0);
    const added = sum(range.start);
    if (g.isDone && added === 0) return [];
    const saved = sum(null);
    return [
      {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        saved,
        percent: goalProgress(g.targetAmount, saved, null, range.end).percent,
        addedThisPeriod: added,
      },
    ];
  });
}

export type NetWorthChange = { net: number; diff: number };

/**
 * 기간 마지막 날 기준 순자산(진행 중인 달이면 오늘 기준)과 지난 기간 마지막 날 대비 변화 (F-41과 같은 계산).
 * 금액 기록이 하나도 없으면 null.
 */
export function netWorthChange(
  history: { assets: readonly HistoryAsset[]; values: readonly HistoryValue[] },
  range: DateRange,
  today: DateString,
): NetWorthChange | null {
  if (history.values.length === 0) return null;
  const end = range.end < today ? range.end : today;
  const net = netWorthOn(end, history.assets, history.values);
  const before = netWorthOn(addDays(range.start, -1), history.assets, history.values);
  return { net, diff: net - before };
}

/** "지난달보다 500,000원 늘었어요" / "…줄었어요" / "지난달과 같아요" */
export function netWorthDiffText(diff: number): string {
  if (diff === 0) return "지난달과 같아요";
  return `지난달보다 ${formatWon(Math.abs(diff))} ${diff > 0 ? "늘었어요" : "줄었어요"}`;
}

/** 그 달에 안 낸 정기지출 이름 */
export function unpaidNames(rows: readonly { item: { name: string }; paidAmount: number | null }[]): string[] {
  return rows.filter((r) => r.paidAmount === null).map((r) => r.item.name);
}
