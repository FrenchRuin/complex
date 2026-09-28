"use client";

import { Pin } from "lucide-react";
import { notePreview, type Note } from "@/lib/calc/notes";
import { notificationTimeLabel } from "@/lib/calc/notifications";
import type { HouseholdMember } from "@/lib/household";
import { PersonChip } from "@/components/ui/PersonChip";
import { NoteChecklist } from "./NoteChecklist";

type Props = {
  note: Note;
  members: readonly HouseholdMember[];
  onOpen: (note: Note) => void;
  /** 목록 카드에서 보일 체크리스트 항목 수 (나머지는 "외 N개") */
  maxItems?: number;
};

/** 메모 카드: 제목·요약(또는 체크리스트 항목)·마지막으로 고친 사람 (F-18) */
export function NoteCard({ note, members, onOpen, maxItems = 5 }: Props) {
  const { title, summary } = notePreview(note);
  const editor = members.find((m) => m.id === note.updatedBy);
  const body = note.kind === "text" ? summary : null;

  return (
    <article className="flex flex-col gap-3 rounded-md bg-surface-raised p-5">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="-m-2 flex items-start gap-2 rounded-sm p-2 text-left hover:bg-surface-sunken/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-heading text-ink">{title}</span>
          {body ? <span className="mt-1 line-clamp-2 block text-body text-ink-muted">{body}</span> : null}
          {note.kind === "checklist" ? (
            <span className="mt-1 block text-caption text-ink-muted tabular-nums">{summary}</span>
          ) : null}
        </span>
        {note.isPinned ? (
          <Pin size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" aria-label="고정한 메모" />
        ) : null}
      </button>

      {note.kind === "checklist" && note.items.length > 0 ? (
        <NoteChecklist noteId={note.id} items={note.items} max={maxItems} />
      ) : null}

      <p className="flex items-center gap-2 text-caption text-ink-muted">
        {editor ? <PersonChip owner={editor.slot} label={editor.displayName} /> : null}
        <span>{notificationTimeLabel(note.updatedAt)}</span>
      </p>
    </article>
  );
}
