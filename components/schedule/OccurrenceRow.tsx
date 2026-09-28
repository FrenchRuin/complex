"use client";

import { Repeat } from "lucide-react";
import { PersonChip } from "@/components/ui/PersonChip";
import { dateRangeLabel, timeLabel, type Occurrence } from "@/lib/calc/events";
import { ownerLabel, type MemberNames } from "@/lib/domain";

type Props = {
  occurrence: Occurrence;
  names: MemberNames;
  /** 다가오는 목록처럼 날짜도 보여줄 때 */
  showDate?: boolean;
  onOpen: (occurrence: Occurrence) => void;
};

/** 일정 한 줄: 시각 · 제목 · 사람 칩 (F-19). 누르면 보기 창 */
export function OccurrenceRow({ occurrence, names, showDate = false, onOpen }: Props) {
  const { event } = occurrence;
  const multiDay = occurrence.start !== occurrence.end;

  return (
    <button
      type="button"
      onClick={() => onOpen(occurrence)}
      className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-sunken/60"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-body text-ink">
          <span className="truncate">{event.title}</span>
          {event.repeat !== "none" ? (
            <Repeat size={14} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-label="반복 일정" />
          ) : null}
        </span>
        <span className="block truncate text-caption text-ink-muted tabular-nums">
          {showDate || multiDay ? `${dateRangeLabel(occurrence.start, occurrence.end)} · ` : ""}
          {timeLabel(event)}
        </span>
      </span>
      <PersonChip owner={event.owner} label={ownerLabel(event.owner, names)} />
    </button>
  );
}
