"use client";

import { useOptimistic, useTransition } from "react";
import { toggleNoteItem } from "@/app/(app)/notes/actions";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import type { NoteItem } from "@/lib/calc/notes";

type Props = { noteId: string; items: readonly NoteItem[]; max?: number };

/** 카드 안 체크리스트: 바로 체크할 수 있다 (알림 없음, F-18) */
export function NoteChecklist({ noteId, items, max }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    items,
    (current: readonly NoteItem[], change: { id: string; done: boolean }) =>
      current.map((item) => (item.id === change.id ? { ...item, done: change.done } : item)),
  );
  const shown = max ? optimistic.slice(0, max) : optimistic;
  const hidden = optimistic.length - shown.length;

  function toggle(id: string, done: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done });
      const result = await toggleNoteItem(noteId, id, done);
      if (result.error) toast(result.error);
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((item) => (
        <li key={item.id}>
          <Checkbox checked={item.done} onChange={(done) => toggle(item.id, done)}>
            <span className={item.done ? "text-ink-muted line-through" : ""}>{item.text}</span>
          </Checkbox>
        </li>
      ))}
      {hidden > 0 ? <li className="pl-7 text-caption text-ink-muted">외 {hidden}개</li> : null}
    </ul>
  );
}
