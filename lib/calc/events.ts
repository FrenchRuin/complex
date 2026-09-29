/**
 * 공유 일정 계산 (F-19): 반복 펼치기, 날짜별 묶기, 다가오는 일정, 표시 글자.
 * 날짜는 "yyyy-MM-dd", 시각은 "HH:mm" 문자열. 매달·매년 반복에서 그 달에 없는 날은 말일로 (정기지출과 같은 규칙).
 */
import { dueDate, isActiveInMonth } from "@/lib/calc/recurring";
import { addDays, daysBetween, monthOf, shiftMonth, type DateRange, type DateString, type MonthString } from "@/lib/date";
import type { Owner } from "@/lib/domain";

export type EventRepeat = "none" | "weekly" | "monthly" | "yearly";

export type CalendarEvent = {
  id: string;
  title: string;
  memo: string;
  owner: Owner;
  startDate: DateString;
  endDate: DateString;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  repeat: EventRepeat;
  repeatUntil: DateString | null;
  /** 반복에서 빠진 회차의 시작 날짜 ("이 일정만" 지우거나 떼어 낸 날) */
  skipDates: readonly DateString[];
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};

/** 펼친 일정 한 번: 이번 회차의 시작·끝 날짜 */
export type Occurrence = { event: CalendarEvent; start: DateString; end: DateString; key: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 예전부터 여기서 가져다 쓰는 곳이 있어 다시 내보낸다
export { daysBetween };

function weekday(date: DateString): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** n번째 회차의 시작 날짜 */
function nthStart(event: CalendarEvent, n: number): DateString {
  const day = Number(event.startDate.slice(8, 10));
  switch (event.repeat) {
    case "weekly":
      return addDays(event.startDate, 7 * n);
    case "monthly":
      return dueDate(shiftMonth(monthOf(event.startDate), n), day);
    case "yearly":
      return dueDate(shiftMonth(monthOf(event.startDate), 12 * n), day);
    default:
      return event.startDate;
  }
}

/** 기간(range)과 겹치는 회차를 모두 펼친다. 날짜·시각 순 */
export function occurrencesBetween(events: readonly CalendarEvent[], range: DateRange): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    const span = daysBetween(event.startDate, event.endDate);
    const skip = new Set(event.skipDates);
    // 매주 반복은 기간 근처 회차부터 센다
    let n =
      event.repeat === "weekly"
        ? Math.max(0, Math.floor((daysBetween(event.startDate, range.start) - span) / 7))
        : 0;
    for (let guard = 0; guard < 2000; guard += 1, n += 1) {
      const start = nthStart(event, n);
      if (start > range.end) break;
      if (event.repeatUntil && start > event.repeatUntil) break;
      const end = addDays(start, span);
      if (end >= range.start && !skip.has(start)) out.push({ event, start, end, key: `${event.id}:${start}` });
      if (event.repeat === "none") break;
    }
  }
  return out.sort(compareOccurrences);
}

function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1;
  return (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "") || a.event.title.localeCompare(b.event.title);
}

/** 날짜 → 그날에 걸친 회차 (여러 날 일정은 걸친 날마다) */
export function occurrencesByDay(occurrences: readonly Occurrence[], range: DateRange): Map<DateString, Occurrence[]> {
  const map = new Map<DateString, Occurrence[]>();
  for (const occ of occurrences) {
    const from = occ.start < range.start ? range.start : occ.start;
    const to = occ.end > range.end ? range.end : occ.end;
    for (let date = from; date <= to; date = addDays(date, 1)) {
      map.set(date, [...(map.get(date) ?? []), occ]);
    }
  }
  return map;
}

/** 오늘부터 days일 안의 회차, 최대 limit개 (오늘 걸쳐 있는 여러 날 일정 포함) */
export function upcomingOccurrences(events: readonly CalendarEvent[], today: DateString, limit: number, days = 60): Occurrence[] {
  return occurrencesBetween(events, { start: today, end: addDays(today, days) }).slice(0, limit);
}

/** "하루 종일" / "14:00" / "14:00~16:30" */
export function timeLabel(event: Pick<CalendarEvent, "allDay" | "startTime" | "endTime">): string {
  if (event.allDay || !event.startTime) return "하루 종일";
  return event.endTime ? `${event.startTime}~${event.endTime}` : event.startTime;
}

/** "9월 28일 (월)" 또는 여러 날이면 "9월 28일 (월) ~ 9월 30일 (수)" */
export function dateRangeLabel(start: DateString, end: DateString): string {
  const one = (d: DateString) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 (${WEEKDAYS[weekday(d)]})`;
  return start === end ? one(start) : `${one(start)} ~ ${one(end)}`;
}

/** "매주 월요일" / "매달 28일" / "매년 9월 28일" (+ "~ 12월 31일까지") */
export function repeatLabel(event: Pick<CalendarEvent, "repeat" | "startDate" | "repeatUntil">): string | null {
  const m = Number(event.startDate.slice(5, 7));
  const d = Number(event.startDate.slice(8, 10));
  const base =
    event.repeat === "weekly"
      ? `매주 ${WEEKDAYS[weekday(event.startDate)]}요일`
      : event.repeat === "monthly"
        ? `매달 ${d}일`
        : event.repeat === "yearly"
          ? `매년 ${m}월 ${d}일`
          : null;
  if (!base) return null;
  if (!event.repeatUntil) return base;
  const [uy, um, ud] = event.repeatUntil.split("-").map(Number);
  return `${base}, ${uy}년 ${um}월 ${ud}일까지`;
}

/** 시각 고르기용 30분 단위 "00:00" ~ "23:30" */
export const TIME_OPTIONS: readonly string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 === 0 ? "00" : "30"}`;
});

/** 달력에 같이 보일 정기지출 결제일 (읽기만) */
export type RecurringDue = { itemId: string; date: DateString; name: string; amount: number };

export function recurringDuesInMonth(
  items: readonly { id: string; name: string; amount: number; dayOfMonth: number; startMonth: DateString; endMonth: DateString | null }[],
  month: MonthString,
): RecurringDue[] {
  return items
    .filter((item) => isActiveInMonth(item, month))
    .map((item) => ({ itemId: item.id, date: dueDate(month, item.dayOfMonth), name: item.name, amount: item.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
