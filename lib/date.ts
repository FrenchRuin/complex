/**
 * 날짜 계산. 모든 "오늘", "이번 달"은 한국 시간(Asia/Seoul) 기준이다.
 * 날짜는 DB의 date 컬럼과 같은 "yyyy-MM-dd" 문자열, 월은 "yyyy-MM" 문자열로 다룬다.
 */
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const TIME_ZONE = "Asia/Seoul";

/** "yyyy-MM-dd" */
export type DateString = string;
/** "yyyy-MM" */
export type MonthString = string;

export type DateRange = { start: DateString; end: DateString };

const pad = (n: number) => String(n).padStart(2, "0");

function toDateString(year: number, month: number, day: number): DateString {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseMonth(month: MonthString): { year: number; month: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y, month: m };
}

function parseDate(date: DateString): { year: number; month: number; day: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** 그 달의 일수. month는 1~12 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 한국 시간 기준 오늘 */
export function todayKST(now: Date = new Date()): DateString {
  return format(new TZDate(now, TIME_ZONE), "yyyy-MM-dd");
}

/** 시각(timestamptz)을 한국 시간 "10월 4일"로 */
export function formatMonthDayKST(timestamp: string | Date): string {
  return format(new TZDate(new Date(timestamp), TIME_ZONE), "M월 d일");
}

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/** "2026-09-27" → "9월 27일 일요일" (날짜만 다루므로 시간대와 무관) */
export function formatDayHeader(date: DateString): string {
  const { year, month, day } = parseDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${month}월 ${day}일 ${WEEKDAYS[weekday]}`;
}

/** "2026-09" → "2026년 9월" */
export function formatMonthLabel(month: MonthString): string {
  const { year, month: m } = parseMonth(month);
  return `${year}년 ${m}월`;
}

/** 한국 시간 기준 이번 달 */
export function currentMonthKST(now: Date = new Date()): MonthString {
  return todayKST(now).slice(0, 7);
}

/** 날짜가 속한 달 */
export function monthOf(date: DateString): MonthString {
  return date.slice(0, 7);
}

/** 그 달의 1일 ~ 말일 */
export function monthRange(month: MonthString): DateRange {
  const { year, month: m } = parseMonth(month);
  return {
    start: toDateString(year, m, 1),
    end: toDateString(year, m, daysInMonth(year, m)),
  };
}

/** 월 이동. shiftMonth("2026-01", -1) → "2025-12" */
export function shiftMonth(month: MonthString, delta: number): MonthString {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/**
 * 지난달 같은 기간: 지난달 1일 ~ 오늘과 같은 날짜.
 * 지난달에 그 날짜가 없으면 지난달 말일까지.
 */
export function samePeriodLastMonth(today: DateString): DateRange {
  const { day } = parseDate(today);
  const prev = shiftMonth(monthOf(today), -1);
  const { year, month } = parseMonth(prev);
  return {
    start: toDateString(year, month, 1),
    end: toDateString(year, month, Math.min(day, daysInMonth(year, month))),
  };
}
