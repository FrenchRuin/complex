"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WEEKDAY_LABELS, dayCellLabel, rangeWeeks } from "@/lib/calc/calendar";
import { filtersToHref, type TransactionFilters } from "@/lib/calc/filters";
import type { DayTotal } from "@/lib/calc/group";
import { formatDayHeader, type DateRange, type DateString, type MonthString } from "@/lib/date";
import { formatWon, formatWonShort, formatWonTiny } from "@/lib/money";

/** 날짜 칸 금액. 항상 한 줄. 폰(640px 미만)은 칸이 좁아 더 짧은 표기(172만, 1.2억) */
const AMOUNT = "block max-w-full whitespace-nowrap text-[11px] leading-4 xl:text-[12px]";

function DayAmount({ amount, prefix = "", className }: { amount: number; prefix?: string; className: string }) {
  const tiny = `${prefix}${formatWonTiny(amount)}`;
  return (
    <span className={`${AMOUNT} ${className}`}>
      {/* 1,000만 이상(+1235만처럼 6자 이상)은 360px 폰 칸을 넘치지 않게 한 단계 작게 */}
      <span className={`sm:hidden ${tiny.length >= 6 ? "text-[10px] tracking-[-0.02em]" : ""}`}>{tiny}</span>
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
  /** 그 달의 기간 (한 달 기준 F-56. 1일 기준이면 달력의 한 달) */
  range: DateRange;
  /** 기간이 달력의 한 달과 같은지 (날짜 글자에 월을 붙일지) */
  calendarMonth: boolean;
};

/**
 * 월 달력 (F-13). 날짜마다 지출 합계를 짧게, 수입은 파란 +로.
 * 날짜를 누르면 그날만 보고, 다시 누르면 해제. 모바일에서는 접을 수 있다.
 * 월급날 주기면 기간(예: 9/25~10/24)만 그리고, 첫날과 달이 바뀌는 날은 "10/1"처럼 월을 붙인다.
 */
export function MonthCalendar({ filters, currentMonth, today, totals, range, calendarMonth }: Props) {
  const [open, setOpen] = useState(true);
  const weeks = rangeWeeks(range);

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
                  {dayCellLabel(date, range, calendarMonth)}
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
