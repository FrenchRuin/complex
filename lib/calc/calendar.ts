/**
 * 월 달력 칸 (F-13). 일요일 시작, 그 달이 아닌 칸은 null.
 */
import { monthRange, type DateString, type MonthString } from "@/lib/date";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function calendarWeeks(month: MonthString): (DateString | null)[][] {
  const { start, end } = monthRange(month);
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lastDay = Number(end.slice(8, 10));

  const cells: (DateString | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= lastDay; day++) {
    cells.push(`${start.slice(0, 8)}${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DateString | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
