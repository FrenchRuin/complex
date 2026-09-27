"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatMonthLabel, type MonthString } from "@/lib/date";

type Props = {
  month: MonthString;
  currentMonth: MonthString;
  /** 이동할 화면 경로 (예: /transactions, /stats) */
  path: string;
  /** month를 뺀 나머지 주소 쿼리 (필터 유지용) */
  query: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 제목 "2026년 9월"을 누르면 연도 이동 + 12개월 버튼으로 고르는 창이 열린다 */
export function MonthPicker({ month, currentMonth, path, query }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));

  const hrefFor = (target: MonthString) => {
    const params = new URLSearchParams(query);
    params.delete("month");
    if (target !== currentMonth) params.set("month", target);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setYear(Number(month.slice(0, 4)));
      }}
    >
      <Popover.Trigger
        aria-label={`${formatMonthLabel(month)}, 연월 고르기`}
        className="inline-flex items-center gap-1 rounded-sm px-1 hover:bg-surface-sunken"
      >
        {formatMonthLabel(month)}
        <ChevronDown size={18} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[296px] rounded-md bg-surface-raised p-4 shadow-float motion-safe:animate-[fade-in_150ms_ease-out]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="이전 해"
              className="inline-flex size-10 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
            >
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
            </button>
            <span className="text-heading text-ink tabular-nums" aria-live="polite">
              {year}년
            </span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="다음 해"
              className="inline-flex size-10 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
            >
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <ul className="grid grid-cols-4 gap-2">
            {MONTHS.map((m) => {
              const value = `${year}-${String(m).padStart(2, "0")}`;
              const selected = value === month;
              const isCurrent = value === currentMonth;
              return (
                <li key={m}>
                  <Link
                    href={hrefFor(value)}
                    scroll={false}
                    onClick={() => setOpen(false)}
                    aria-current={selected ? "date" : undefined}
                    aria-label={`${year}년 ${m}월${isCurrent ? ", 이번 달" : ""}`}
                    className={`flex h-11 items-center justify-center rounded-sm text-body tabular-nums ${
                      selected
                        ? "bg-primary font-semibold text-on-primary"
                        : isCurrent
                          ? "bg-primary-soft font-semibold text-primary"
                          : "text-ink hover:bg-surface-sunken"
                    }`}
                  >
                    {m}월
                  </Link>
                </li>
              );
            })}
          </ul>

          {month !== currentMonth ? (
            <Link
              href={hrefFor(currentMonth)}
              scroll={false}
              onClick={() => setOpen(false)}
              className="mt-3 flex h-10 items-center justify-center rounded-sm border border-line-strong text-body font-semibold text-ink"
            >
              이번 달로
            </Link>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
