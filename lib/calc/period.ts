/**
 * 한 달 기준(월급날 주기) 계산 (F-56).
 * 기간은 달 이름(MonthString "yyyy-MM")으로 부른다. 시작일 = 직접 고친 날 또는 월급날(주말·공휴일이면 앞 평일),
 * 종료일 = 다음 달 시작일 전날이라 겹치거나 빠지는 날이 없다.
 * 시작일이 1일이면(기본값) 달력의 한 달과 같다.
 */
import { previousBusinessDay, type HolidayMap } from "@/lib/calc/holidays";
import { addDays, daysBetween, monthOf, shiftMonth, type DateRange, type DateString, type MonthString } from "@/lib/date";

export type PeriodLabel = "start" | "end";

export type PeriodSettings = {
  /** 1~28. 1이면 달력의 한 달 */
  startDay: number;
  /** 기간 이름: 시작하는 달 / 끝나는 달 */
  label: PeriodLabel;
  /** 월급날이 주말·공휴일이면 앞 평일로 */
  shift: boolean;
};

export type PeriodConfig = PeriodSettings & {
  /** 달 이름 → 직접 고친 시작일 */
  overrides: Readonly<Record<MonthString, DateString>>;
  /** 쉬는 공휴일 (기본 + 추가 − 빼기) */
  holidays: HolidayMap;
};

/** 설정이 없을 때: 달력의 한 달 */
export const CALENDAR_MONTH: PeriodConfig = { startDay: 1, label: "end", shift: true, overrides: {}, holidays: {} };

const pad = (n: number) => String(n).padStart(2, "0");

/** 규칙대로의 시작일 (직접 고친 날 무시) */
export function ruleStart(month: MonthString, cfg: PeriodSettings & { holidays: HolidayMap }): DateString {
  if (cfg.startDay === 1) return `${month}-01`;
  // "끝나는 달" 이름이면 10월 기간은 9월 월급날에 시작한다
  const payMonth = cfg.label === "end" ? shiftMonth(month, -1) : month;
  const payday = `${payMonth}-${pad(cfg.startDay)}`;
  return cfg.shift ? previousBusinessDay(payday, cfg.holidays) : payday;
}

export function periodStart(month: MonthString, cfg: PeriodConfig): DateString {
  return cfg.overrides[month] ?? ruleStart(month, cfg);
}

export function periodRange(month: MonthString, cfg: PeriodConfig): DateRange {
  return { start: periodStart(month, cfg), end: addDays(periodStart(shiftMonth(month, 1), cfg), -1) };
}

/** 날짜가 속한 기간의 이름 */
export function periodOf(date: DateString, cfg: PeriodConfig): MonthString {
  const base = monthOf(date);
  // 이름 방식·직접 고친 날 때문에 달력의 달과 앞뒤로 어긋날 수 있다
  for (const delta of [0, 1, -1, 2, -2]) {
    const month = shiftMonth(base, delta);
    const { start, end } = periodRange(month, cfg);
    if (start <= date && date <= end) return month;
  }
  return base;
}

/** 지난 기간의 같은 날까지: 이번 기간 시작부터 오늘까지 지난 날수만큼 (지난 기간이 짧으면 그 끝까지) */
export function samePeriodLastPeriod(today: DateString, cfg: PeriodConfig): DateRange {
  const month = periodOf(today, cfg);
  const current = periodRange(month, cfg);
  const previous = periodRange(shiftMonth(month, -1), cfg);
  const end = addDays(previous.start, daysBetween(current.start, today));
  return { start: previous.start, end: end > previous.end ? previous.end : end };
}

/** 여러 기간을 한 번에 (통계 6개월 등) */
export function periodRanges(months: readonly MonthString[], cfg: PeriodConfig): Record<MonthString, DateRange> {
  return Object.fromEntries(months.map((m) => [m, periodRange(m, cfg)]));
}

/** 기간이 달력의 한 달과 같은지 (같으면 날짜 범위를 따로 보여주지 않는다) */
export function isCalendarRange(range: DateRange): boolean {
  return range.start.endsWith("-01") && monthOf(range.end) === monthOf(range.start) && addDays(range.end, 1).endsWith("-01");
}

/** "9월 25일 ~ 10월 24일" */
export function formatPeriodRange(range: DateRange): string {
  const one = (d: DateString) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  return `${one(range.start)} ~ ${one(range.end)}`;
}

/** 머리글용 짧은 표기 "9/25~10/24" */
export function formatPeriodRangeShort(range: DateRange): string {
  const one = (d: DateString) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return `${one(range.start)}~${one(range.end)}`;
}

/** 시작일 직접 고치기 검사: 앞 기간 시작일보다 뒤, 다음 기간 시작일보다 앞이어야 한다 */
export function overrideError(month: MonthString, start: DateString, cfg: PeriodConfig): string | null {
  const prev = periodStart(shiftMonth(month, -1), cfg);
  const next = periodStart(shiftMonth(month, 1), cfg);
  if (start <= prev) return "앞 달 시작일보다 뒤 날짜로 골라 주세요";
  if (start >= next) return "다음 달 시작일보다 앞 날짜로 골라 주세요";
  return null;
}
