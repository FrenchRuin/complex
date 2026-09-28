"use client";

import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { PersonChip } from "@/components/ui/PersonChip";
import { dateRangeLabel, repeatLabel, timeLabel, type Occurrence } from "@/lib/calc/events";
import { notificationTimeLabel } from "@/lib/calc/notifications";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";

type Props = {
  occurrence: Occurrence;
  names: MemberNames;
  members: readonly HouseholdMember[];
  pending: boolean;
  onDelete: () => void;
};

/** 일정 보기 (F-19): 날짜·시각·반복·누구·메모(링크). 고치려면 창 머리의 "수정" */
export function EventView({ occurrence, names, members, pending, onDelete }: Props) {
  const { event } = occurrence;
  const editor = members.find((m) => m.id === event.updatedBy);
  const repeat = repeatLabel(event);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-body">
          <dt className="text-ink-muted">날짜</dt>
          <dd className="text-ink tabular-nums">{dateRangeLabel(occurrence.start, occurrence.end)}</dd>
          <dt className="text-ink-muted">시각</dt>
          <dd className="text-ink tabular-nums">{timeLabel(event)}</dd>
          {repeat ? (
            <>
              <dt className="text-ink-muted">반복</dt>
              <dd className="text-ink">{repeat}</dd>
            </>
          ) : null}
          <dt className="text-ink-muted">누구</dt>
          <dd>
            <PersonChip owner={event.owner} label={ownerLabel(event.owner, names)} />
          </dd>
        </dl>

        {event.memo.trim() ? (
          <p className="rounded-sm bg-surface px-4 py-3 text-body whitespace-pre-wrap text-ink">
            <LinkifiedText text={event.memo.trim()} />
          </p>
        ) : null}

        <p className="flex items-center gap-2 text-caption text-ink-muted">
          {editor ? <PersonChip owner={editor.slot} label={editor.displayName} /> : null}
          <span>{notificationTimeLabel(event.updatedAt)} 마지막 수정</span>
        </p>
        {event.repeat !== "none" ? (
          <p className="text-caption text-ink-muted">반복 일정은 고치거나 삭제하면 모든 회차에 적용돼요.</p>
        ) : null}
      </div>

      <div className="flex border-t border-line px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <DeleteButton disabled={pending} onDelete={onDelete} />
      </div>
    </>
  );
}
