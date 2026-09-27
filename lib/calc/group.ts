/**
 * 내역 합계와 날짜별 묶음 (F-12, F-13). 삭제된 내역은 미리 빼고 넘긴다.
 */
import type { CategoryType } from "@/lib/domain";
import type { DateString } from "@/lib/date";

export type Summable = { type: CategoryType; amount: number; occurredOn: DateString };
export type DayTotal = { expense: number; income: number };

export function sumTotals(rows: readonly Summable[]): DayTotal {
  return rows.reduce(
    (acc, row) => ({ ...acc, [row.type]: acc[row.type] + row.amount }),
    { expense: 0, income: 0 },
  );
}

/** 날짜 → 그날 지출·수입 합계 */
export function dailyTotals(rows: readonly Summable[]): Record<DateString, DayTotal> {
  const totals: Record<DateString, DayTotal> = {};
  for (const row of rows) {
    const day = (totals[row.occurredOn] ??= { expense: 0, income: 0 });
    day[row.type] += row.amount;
  }
  return totals;
}

export type DayGroup<T> = { date: DateString; total: DayTotal; items: T[] };

/** 날짜별로 묶는다. 최근 날짜가 먼저, 같은 날 안의 순서는 넘긴 순서 그대로 */
export function groupByDay<T extends Summable>(rows: readonly T[]): DayGroup<T>[] {
  const groups = new Map<DateString, T[]>();
  for (const row of rows) {
    const list = groups.get(row.occurredOn);
    if (list) list.push(row);
    else groups.set(row.occurredOn, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({ date, total: sumTotals(items), items }));
}
