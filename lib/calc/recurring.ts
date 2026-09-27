/**
 * 정기지출 계산 (F-30, F-31). 날짜는 "yyyy-MM-dd", 월은 "yyyy-MM" 문자열.
 */
import { monthRange, type DateString, type MonthString } from "@/lib/date";
import { formatWon } from "@/lib/money";

/** 그 달의 결제일. 그 달에 없는 날(예: 31일)은 말일로 */
export function dueDate(month: MonthString, dayOfMonth: number): DateString {
  const lastDay = Number(monthRange(month).end.slice(8, 10));
  const day = Math.min(Math.max(dayOfMonth, 1), lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** start_month·end_month(각 달 1일, "yyyy-MM-01")로 그 달에 보여야 하는지 */
export function isActiveInMonth(
  item: { startMonth: DateString; endMonth: DateString | null },
  month: MonthString,
): boolean {
  const first = `${month}-01`;
  return item.startMonth <= first && (item.endMonth === null || first <= item.endMonth);
}

function daysBetween(from: DateString, to: DateString): number {
  const toUtc = (d: DateString) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export type RecurringStatus =
  | { kind: "paid" }
  | { kind: "today" }
  | { kind: "upcoming"; days: number }
  | { kind: "overdue"; days: number };

export function recurringStatus(due: DateString, today: DateString, paid: boolean): RecurringStatus {
  if (paid) return { kind: "paid" };
  const days = daysBetween(today, due);
  if (days === 0) return { kind: "today" };
  return days > 0 ? { kind: "upcoming", days } : { kind: "overdue", days: -days };
}

export function statusLabel(status: RecurringStatus): string {
  switch (status.kind) {
    case "paid":
      return "납부 완료";
    case "today":
      return "오늘";
    case "upcoming":
      return `${status.days}일 후`;
    case "overdue":
      return `${status.days}일 지남`;
  }
}

/** 미납 배지: 결제일이 오늘이거나 지난 미납 항목 수 */
export function dueUnpaidCount(statuses: readonly RecurringStatus[]): number {
  return statuses.filter((s) => s.kind === "today" || s.kind === "overdue").length;
}

export type SummaryItem = {
  /** 납부했으면 실제 낸 금액, 아니면 null */
  paidAmount: number | null;
  /** 아직 안 냈을 때 낼 것으로 보는 금액 */
  expectedAmount: number;
};

export type RecurringSummary = { paidCount: number; total: number; paidSum: number; remainingSum: number };

export function summarize(items: readonly SummaryItem[]): RecurringSummary {
  return items.reduce(
    (acc, item) =>
      item.paidAmount !== null
        ? { ...acc, paidCount: acc.paidCount + 1, paidSum: acc.paidSum + item.paidAmount }
        : { ...acc, remainingSum: acc.remainingSum + item.expectedAmount },
    { paidCount: 0, total: items.length, paidSum: 0, remainingSum: 0 },
  );
}

/** "3/4 납부 · 157,500원 냈고 180,000원 남았어요" */
export function summaryText(s: RecurringSummary): string {
  if (s.total === 0) return "이번 달 정기지출이 없어요";
  if (s.paidCount === s.total) return `${s.total}/${s.total} 납부 · ${formatWon(s.paidSum)} 모두 냈어요`;
  return `${s.paidCount}/${s.total} 납부 · ${formatWon(s.paidSum)} 냈고 ${formatWon(s.remainingSum)} 남았어요`;
}
