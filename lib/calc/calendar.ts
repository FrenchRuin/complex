/**
 * 달력 칸 (F-13). 일요일 시작, 기간 밖의 칸은 null.
 * 내역 달력은 한 달 기준(F-56)의 기간(예: 9/25~10/24)을, 일정·날짜 선택은 달력의 한 달을 그린다.
 */
import { addDays, monthRange, weekdayOf, type DateRange, type DateString, type MonthString } from "@/lib/date";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 기간을 주 단위(7칸)로. 첫 주 앞과 마지막 주 뒤는 null */
export function rangeWeeks(range: DateRange): (DateString | null)[][] {
  const cells: (DateString | null)[] = Array.from({ length: weekdayOf(range.start) }, () => null);
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) cells.push(date);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DateString | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 달력의 한 달 */
export function calendarWeeks(month: MonthString): (DateString | null)[][] {
  return rangeWeeks(monthRange(month));
}

/** 달력 칸 날짜 글자: 기간의 첫날과 달이 바뀌는 1일은 "10/1", 나머지는 "25" (달력의 한 달이면 늘 숫자만) */
export function dayCellLabel(date: DateString, range: DateRange, calendarMonth: boolean): string {
  const day = Number(date.slice(8, 10));
  if (calendarMonth || (date !== range.start && day !== 1)) return String(day);
  return `${Number(date.slice(5, 7))}/${day}`;
}
