"use client";

import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { WEEKDAY_LABELS, calendarWeeks } from "@/lib/calc/calendar";
import {
  addDays,
  formatDayHeader,
  formatFullDate,
  formatMonthLabel,
  monthOf,
  shiftMonth,
  todayKST,
  type DateString,
} from "@/lib/date";

type Props = {
  label: string;
  value: DateString;
  onChange: (value: DateString) => void;
  /** 좁은 곳(문자 미리보기 행)용 작은 크기 */
  compact?: boolean;
};

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/**
 * 날짜 고르기: 앱 디자인에 맞춘 달력 (폰 기본 날짜 창 대신).
 * 화살표로 하루(←→)·일주일(↑↓) 이동, Enter로 선택, Esc로 닫기.
 */
export function DatePicker({ label, value, onChange, compact = false }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(monthOf(value));
  const [focused, setFocused] = useState<DateString>(value);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = todayKST();

  // 키보드로 옮긴 날짜 버튼에 포커스를 준다 (창이 떠 있고 포커스가 달력 안에 있을 때만)
  useEffect(() => {
    const grid = gridRef.current;
    if (!open || !grid || !grid.contains(document.activeElement)) return;
    grid.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, view]);

  function pick(date: DateString) {
    onChange(date);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(focused, step);
    setFocused(next);
    setView(monthOf(next));
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={compact ? "text-label text-ink-muted" : "text-caption font-semibold text-ink-muted"}>
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setView(monthOf(value));
            setFocused(value);
          }
        }}
      >
        <Popover.Trigger
          id={id}
          className={`flex items-center justify-between gap-2 rounded-sm bg-surface-sunken text-left text-ink tabular-nums ${
            compact ? "h-10 px-3 text-body" : "h-12 px-4 text-body"
          }`}
        >
          <span className="truncate">{formatFullDate(value)}</span>
          <CalendarDays size={18} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            collisionPadding={16}
            onOpenAutoFocus={(e) => {
              // 창이 실제로 뜬 뒤에 고른 날짜 버튼에 포커스 (키보드 화살표로 바로 이동 가능)
              e.preventDefault();
              gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus();
            }}
            className="z-[70] w-[312px] rounded-md bg-surface-raised p-4 shadow-float motion-safe:animate-[fade-in_150ms_ease-out]"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => setView((v) => shiftMonth(v, -1))}
                className="inline-flex size-10 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
              >
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
              </button>
              <span className="text-heading text-ink tabular-nums" aria-live="polite">
                {formatMonthLabel(view)}
              </span>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() => setView((v) => shiftMonth(v, 1))}
                className="inline-flex size-10 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
              >
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-7 pb-1 text-center text-label text-ink-muted" aria-hidden>
              {WEEKDAY_LABELS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div ref={gridRef} role="group" aria-label={`${formatMonthLabel(view)} 날짜`} onKeyDown={onKeyDown} className="grid grid-cols-7 gap-1">
              {calendarWeeks(view)
                .flat()
                .map((date, i) =>
                  date ? (
                    <button
                      key={date}
                      type="button"
                      data-date={date}
                      tabIndex={date === focused ? 0 : -1}
                      aria-label={`${formatDayHeader(date)}${date === today ? ", 오늘" : ""}`}
                      aria-pressed={date === value}
                      onClick={() => pick(date)}
                      onFocus={() => setFocused(date)}
                      className={`flex h-10 items-center justify-center rounded-sm text-body tabular-nums ${
                        date === value
                          ? "bg-primary font-semibold text-on-primary"
                          : date === today
                            ? "font-bold text-primary hover:bg-primary-soft"
                            : "text-ink hover:bg-surface-sunken"
                      }`}
                    >
                      {Number(date.slice(8))}
                    </button>
                  ) : (
                    <span key={`blank-${i}`} aria-hidden />
                  ),
                )}
            </div>

            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              {[
                { label: "오늘", date: today },
                { label: "어제", date: addDays(today, -1) },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => pick(q.date)}
                  className={`h-10 flex-1 rounded-sm text-body font-semibold ${
                    q.date === value ? "bg-primary-soft text-primary" : "border border-line-strong text-ink hover:bg-surface-sunken"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
