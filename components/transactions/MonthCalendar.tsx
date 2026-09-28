"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WEEKDAY_LABELS, calendarWeeks } from "@/lib/calc/calendar";
import { filtersToHref, type TransactionFilters } from "@/lib/calc/filters";
import type { DayTotal } from "@/lib/calc/group";
import { formatDayHeader, type DateString, type MonthString } from "@/lib/date";
import { formatWon, formatWonShort } from "@/lib/money";

/** 날짜 칸 금액. 웹(lg 이상)은 칸이 넓어서 "+807.8만"도 한 줄로 둔다 */
const AMOUNT = "text-[11px] leading-4 lg:whitespace-nowrap xl:text-[12px]";

type Props = {
  filters: TransactionFilters;
  currentMonth: MonthString;
  today: DateString;
  totals: Record<DateString, DayTotal>;
};

/**
 * 월 달력 (F-13). 날짜마다 지출 합계를 짧게, 수입은 파란 +로.
 * 날짜를 누르면 그날만 보고, 다시 누르면 해제. 모바일에서는 접을 수 있다.
 */
export function MonthCalendar({ filters, currentMonth, today, totals }: Props) {
  const [open, setOpen] = useState(true);
  const weeks = calendarWeeks(filters.month);

  return (
    <section aria-label="달력" className="rounded-md bg-surface-raised p-3 lg:sticky lg:top-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="month-calendar-grid"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center gap-2 rounded-sm px-2 text-body text-ink lg:hidden"
      >
        <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">달력</span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div id="month-calendar-grid" className={open ? "block" : "hidden lg:block"}>
        <div className="grid grid-cols-7 pb-1 text-center text-label text-ink-muted" aria-hidden>
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((date, index) => {
            if (!date) return <span key={`empty-${index}`} aria-hidden />;
            const total = totals[date];
            const selected = filters.day === date;
            const label = [
              formatDayHeader(date),
              total?.expense ? `지출 ${formatWon(total.expense)}` : null,
              total?.income ? `수입 ${formatWon(total.income)}` : null,
              selected ? "선택됨" : null,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <Link
                key={date}
                href={filtersToHref(filters, currentMonth, { day: selected ? null : date })}
                scroll={false}
                aria-label={label}
                aria-current={selected ? "date" : undefined}
                className={`flex min-h-14 flex-col items-center rounded-sm xl:min-h-16 px-0.5 pt-1 pb-1 tabular-nums ${
                  selected ? "bg-primary-soft" : "hover:bg-surface-sunken"
                }`}
              >
                <span
                  className={`text-caption ${date === today ? "font-bold text-primary" : "text-ink"}`}
                >
                  {Number(date.slice(8))}
                </span>
                {total?.expense ? (
                  <span className={`${AMOUNT} text-ink-muted`}>
                    {formatWonShort(total.expense)}
                  </span>
                ) : null}
                {total?.income ? (
                  <span className={`${AMOUNT} text-primary`}>
                    +{formatWonShort(total.income)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
