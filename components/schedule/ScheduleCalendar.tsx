"use client";

import { WEEKDAY_LABELS, calendarWeeks } from "@/lib/calc/calendar";
import type { Occurrence, RecurringDue } from "@/lib/calc/events";
import type { HolidayMap } from "@/lib/calc/holidays";
import { formatDayHeader, type DateString, type MonthString } from "@/lib/date";
import type { Owner } from "@/lib/domain";

type Props = {
  month: MonthString;
  today: DateString;
  selected: DateString | null;
  byDay: Map<DateString, Occurrence[]>;
  dues: Map<DateString, RecurringDue[]>;
  holidays: HolidayMap;
  onSelect: (date: DateString) => void;
};

/** 사람 색 (항상 이름 글자와 함께 쓰는 곳이 따로 있다: 목록의 사람 칩) */
const BAR: Record<Owner, string> = { joint: "border-joint", a: "border-member-a", b: "border-member-b" };
const DOT: Record<Owner, string> = { joint: "bg-joint", a: "bg-member-a", b: "bg-member-b" };
const MAX_TITLES = 3;

/**
 * 일정 월 달력 (F-19). 웹은 칸마다 일정 제목(최대 3개 + 외 N), 폰은 점.
 * 정기지출 결제일은 회색 글자/점으로 함께 (읽기만). 공휴일은 날짜 숫자를 holiday 색으로, 웹은 이름도 (F-55).
 * 날짜를 누르면 옆(폰은 아래)에 그날 목록.
 */
export function ScheduleCalendar({ month, today, selected, byDay, dues, holidays, onSelect }: Props) {
  return (
    <section aria-label="일정 달력" className="rounded-md bg-surface-raised p-3 lg:p-4">
      <div className="grid grid-cols-7 pb-1 text-center text-label text-ink-muted" aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {calendarWeeks(month)
          .flat()
          .map((date, index) => {
            if (!date) return <span key={`empty-${index}`} aria-hidden />;
            const list = byDay.get(date) ?? [];
            const dayDues = dues.get(date) ?? [];
            const isSelected = selected === date;
            const holiday = holidays[date]?.join(", ") ?? null;
            const label = [
              formatDayHeader(date),
              holiday,
              list.length ? `일정 ${list.length}개` : null,
              dayDues.length ? `정기지출 ${dayDues.length}건` : null,
              isSelected ? "선택됨" : null,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={date}
                type="button"
                aria-label={label}
                aria-pressed={isSelected}
                onClick={() => onSelect(date)}
                className={`flex min-h-16 min-w-0 flex-col items-stretch gap-0.5 rounded-sm px-0.5 pt-1 pb-1 text-left lg:min-h-24 lg:px-1 ${
                  isSelected ? "bg-primary-soft" : "hover:bg-surface-sunken"
                }`}
              >
                <span
                  className={`self-center text-caption tabular-nums lg:self-start lg:px-1 ${
                    date === today ? "font-bold text-primary" : holiday ? "text-holiday" : "text-ink"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {holiday ? (
                  <span className="hidden truncate px-1 text-[11px] leading-4 text-holiday lg:block" aria-hidden>
                    {holiday}
                  </span>
                ) : null}

                {/* 폰: 점 */}
                <span className="flex flex-wrap justify-center gap-0.5 lg:hidden" aria-hidden>
                  {list.slice(0, 3).map((occ) => (
                    <span key={occ.key} className={`size-1.5 rounded-full ${DOT[occ.event.owner]}`} />
                  ))}
                  {dayDues.length ? <span className="size-1.5 rounded-full bg-line-strong" /> : null}
                </span>

                {/* 웹: 제목 */}
                <span className="hidden flex-col gap-0.5 lg:flex" aria-hidden>
                  {list.slice(0, MAX_TITLES).map((occ) => (
                    <span
                      key={occ.key}
                      className={`truncate border-l-2 pl-1 text-[12px] leading-4 text-ink ${BAR[occ.event.owner]}`}
                    >
                      {occ.event.title}
                    </span>
                  ))}
                  {list.length > MAX_TITLES ? (
                    <span className="pl-1 text-[12px] leading-4 text-ink-muted">외 {list.length - MAX_TITLES}개</span>
                  ) : null}
                  {dayDues.slice(0, 1).map((due) => (
                    <span key={due.itemId} className="truncate pl-1 text-[12px] leading-4 text-ink-muted">
                      {due.name}
                      {dayDues.length > 1 ? ` 외 ${dayDues.length - 1}` : ""}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
