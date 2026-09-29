"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import type { Occurrence, RecurringDue } from "@/lib/calc/events";
import { formatDayHeader, type DateString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { OccurrenceRow } from "./OccurrenceRow";

type Props = {
  date: DateString;
  occurrences: readonly Occurrence[];
  dues: readonly RecurringDue[];
  /** 그날 공휴일 이름 (F-55) */
  holidayNames: readonly string[];
  names: MemberNames;
  onOpen: (occurrence: Occurrence) => void;
  onAdd: (date: DateString) => void;
};

/** 고른 날의 일정 목록 + 그날 정기지출 결제일 (F-19) + 공휴일 이름 (F-55) */
export function DayAgenda({ date, occurrences, dues, holidayNames, names, onOpen, onAdd }: Props) {
  return (
    <section aria-labelledby="day-agenda" className="rounded-md bg-surface-raised p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="day-agenda" className="text-heading text-ink">
          {formatDayHeader(date)}
        </h2>
        <button
          type="button"
          onClick={() => onAdd(date)}
          className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body font-semibold text-primary hover:bg-surface-sunken"
        >
          <Plus size={18} strokeWidth={1.75} aria-hidden />이 날 일정 추가
        </button>
      </div>
      {holidayNames.length ? (
        <p className="mt-1 text-caption font-semibold text-holiday">공휴일 · {holidayNames.join(", ")}</p>
      ) : null}

      {occurrences.length === 0 && dues.length === 0 ? (
        <p className="mt-2 text-body text-ink-muted">일정이 없어요.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {occurrences.map((occ) => (
            <li key={occ.key}>
              <OccurrenceRow occurrence={occ} names={names} onOpen={onOpen} />
            </li>
          ))}
          {dues.map((due) => (
            <li key={due.itemId}>
              <Link href="/recurring" className="flex items-center gap-3 py-3 hover:bg-surface-sunken/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink-muted">{due.name}</span>
                  <span className="block text-caption text-ink-muted">정기지출 결제일</span>
                </span>
                <span className="text-body text-expense tabular-nums">{formatWon(due.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
