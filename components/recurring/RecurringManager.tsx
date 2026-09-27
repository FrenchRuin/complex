"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { resumeRecurringItem, stopRecurringItem } from "@/app/(app)/recurring/actions";
import { useActionRunner } from "@/components/settings/useActionRunner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PersonChip } from "@/components/ui/PersonChip";
import { ownerOfTransaction } from "@/lib/calc/assignment";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { RecurringItem } from "@/lib/recurring";
import { RecurringEditor, type RecurringEditorData } from "./RecurringEditor";

type Props = {
  items: RecurringItem[];
  /** 이번 달 1일 ("yyyy-MM-01") — 중지 안내 문구용 */
  monthFirst: string;
  data: RecurringEditorData;
};

/** 정기지출 등록·수정·중지·다시 시작 (F-30) */
export function RecurringManager({ items, monthFirst, data }: Props) {
  const [editing, setEditing] = useState<RecurringItem | "new" | null>(null);
  const { pending, error, run } = useActionRunner();
  const active = items.filter((i) => i.endMonth === null);
  const stopped = items.filter((i) => i.endMonth !== null);

  const rowProps = {
    names: data.names,
    monthFirst,
    pending,
    onEdit: (item: RecurringItem) => setEditing(item),
    onToggleStop: (item: RecurringItem) =>
      run(() => (item.endMonth !== null ? resumeRecurringItem(item.id) : stopRecurringItem(item.id))),
  };

  return (
    <div>
      {active.length === 0 ? (
        <p className="py-3 text-body text-ink-muted">등록한 정기지출이 없어요.</p>
      ) : (
        <ul>
          {active.map((item) => (
            <ManagerRow key={item.id} item={item} {...rowProps} />
          ))}
        </ul>
      )}
      {stopped.length > 0 ? (
        <>
          <h3 className="mt-5 text-label text-ink-muted">멈춘 정기지출</h3>
          <ul>
            {stopped.map((item) => (
              <ManagerRow key={item.id} item={item} {...rowProps} />
            ))}
          </ul>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="secondary" onClick={() => setEditing("new")} className="mt-3 w-full">
        <Plus size={20} strokeWidth={1.75} aria-hidden />
        정기지출 추가
      </Button>
      {editing ? (
        <RecurringEditor
          key={editing === "new" ? "new" : editing.id}
          open
          item={editing === "new" ? null : editing}
          data={data}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

type RowProps = {
  item: RecurringItem;
  names: MemberNames;
  monthFirst: string;
  pending: boolean;
  onEdit: (item: RecurringItem) => void;
  onToggleStop: (item: RecurringItem) => void;
};

function ManagerRow({ item, names, monthFirst, pending, onEdit, onToggleStop }: RowProps) {
  const owner = ownerOfTransaction(item.scope, item.memberSlot);
  const isStopped = item.endMonth !== null;

  return (
    <li className="flex items-center gap-2 border-b border-line py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-body ${isStopped ? "text-ink-muted" : "text-ink"}`}>
          {item.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted tabular-nums">
          <PersonChip owner={owner} label={ownerLabel(owner, names)} />
          매월 {item.dayOfMonth}일 · {formatWon(item.amount)}
          {item.isVariable ? " (매달 다름)" : ""}
        </span>
        {isStopped ? (
          <span className="mt-1 block text-caption text-ink-muted">
            {item.endMonth === monthFirst ? "이번 달까지 보이고 다음 달부터 멈춰요" : "멈춤"}
          </span>
        ) : null}
      </span>
      <IconButton icon={Pencil} label={`${item.name} 수정`} size="sm" onClick={() => onEdit(item)} />
      <button
        type="button"
        disabled={pending}
        onClick={() => onToggleStop(item)}
        className="h-9 shrink-0 rounded-sm border border-line-strong px-3 text-caption font-semibold text-ink disabled:opacity-60"
      >
        {isStopped ? "다시 시작" : "중지"}
      </button>
    </li>
  );
}
