"use client";

import { useState, useTransition } from "react";
import { clearPeriodOverride, setPeriodOverride } from "@/app/(app)/settings/period-actions";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import type { DateString, MonthString } from "@/lib/date";

export type PeriodMonthRow = {
  month: MonthString;
  /** "10월" (해가 다르면 "2027년 1월") */
  name: string;
  /** "9월 23일 (수) ~ 10월 22일 (목)" */
  rangeText: string;
  start: DateString;
  /** 직접 고친 달 */
  overridden: boolean;
  current: boolean;
};

const LINK = "inline-flex h-10 shrink-0 items-center rounded-sm px-3 text-caption font-semibold text-primary hover:bg-surface-sunken disabled:opacity-60";

/** 달마다의 기간 미리보기 + 그 달만 시작일 바꾸기·원래대로 (F-56) */
export function PeriodMonthList({ rows }: { rows: PeriodMonthRow[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<MonthString | null>(null);
  const [date, setDate] = useState<DateString>("");
  const [error, setError] = useState<string | null>(null);

  function save(month: MonthString) {
    setError(null);
    startTransition(async () => {
      const result = await setPeriodOverride(month, date);
      if (result.error) return setError(result.error);
      setEditing(null);
      toast("시작일을 바꿨어요");
    });
  }

  function reset(month: MonthString) {
    startTransition(async () => {
      const result = await clearPeriodOverride(month);
      toast(result.error ?? "시작일을 원래대로 했어요");
    });
  }

  return (
    <ul>
      {rows.map((row) => (
        <li key={row.month} className="border-b border-line py-2 last:border-b-0">
          <div className="flex min-h-12 items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink">
                {row.name}
                {row.current ? <span className="ml-2 text-caption text-primary">이번 달</span> : null}
              </span>
              <span className="block text-caption text-ink-muted tabular-nums">
                {row.rangeText}
                {row.overridden ? " · 직접 고침" : ""}
              </span>
            </span>
            {row.overridden ? (
              <button type="button" disabled={pending} className={LINK} aria-label={`${row.name} 시작일 원래대로`} onClick={() => reset(row.month)}>
                원래대로
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              className={LINK}
              aria-label={`${row.name} 시작일 바꾸기`}
              aria-expanded={editing === row.month}
              onClick={() => {
                setError(null);
                setDate(row.start);
                setEditing(editing === row.month ? null : row.month);
              }}
            >
              시작일 바꾸기
            </button>
          </div>
          {editing === row.month ? (
            <div className="flex flex-col gap-2 rounded-sm bg-surface p-3">
              <DatePicker label={`${row.name} 시작일`} value={date} onChange={setDate} />
              <p role="alert" className="text-caption text-danger empty:hidden">
                {error}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => save(row.month)} pending={pending} className="flex-1">
                  {pending ? "저장하는 중" : "저장"}
                </Button>
                <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending} className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
