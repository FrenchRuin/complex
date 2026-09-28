"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WEEKDAY_LABELS, calendarWeeks } from "@/lib/calc/calendar";
import { filtersToHref, type TransactionFilters } from "@/lib/calc/filters";
import type { DayTotal } from "@/lib/calc/group";
import { formatDayHeader, type DateString, type MonthString } from "@/lib/date";
import { formatWon, formatWonShort, formatWonTiny } from "@/lib/money";

/** 날짜 칸 금액. 항상 한 줄. 폰(640px 미만)은 칸이 좁아 더 짧은 표기(172만, 1.2억) */
const AMOUNT = "block max-w-full whitespace-nowrap text-[11px] leading-4 xl:text-[12px]";

function DayAmount({ amount, prefix = "", className }: { amount: number; prefix?: string; className: string }) {
  return (
    <span className={`${AMOUNT} ${className}`}>
      <span className="sm:hidden">
        {prefix}
        {formatWonTiny(amount)}
      </span>
      <span className="hidden sm:inline">
        {prefix}
        {formatWonShort(amount)}
      </span>
    </span>
  );
}

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
        className="flex h-10 w-full items-center gap-2 rounded-sm px-2 text-body text-ink hover:bg-surface-sunken lg:hidden"
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
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                className={`flex min-h-14 min-w-0 flex-col items-center rounded-sm px-0 pt-1 pb-1 tabular-nums sm:px-0.5 xl:min-h-16 ${
                  selected ? "bg-primary-soft" : "hover:bg-surface-sunken"
                }`}
              >
                <span
                  className={`text-caption ${date === today ? "font-bold text-primary" : "text-ink"}`}
                >
                  {Number(date.slice(8))}
                </span>
                {total?.expense ? <DayAmount amount={total.expense} className="text-expense" /> : null}
                {total?.income ? <DayAmount amount={total.income} prefix="+" className="text-primary" /> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
