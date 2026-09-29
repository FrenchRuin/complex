"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Pin, X } from "lucide-react";
import { useState, useTransition } from "react";
import { setNoteDeleted, setNotePinned } from "@/app/(app)/notes/actions";
import { useToast } from "@/components/ui/Toast";
import { notePreview, type Note } from "@/lib/calc/notes";
import type { HouseholdMember } from "@/lib/household";
import { NoteEditForm } from "./NoteEditForm";
import { NoteView } from "./NoteView";

type Props = {
  /** null이면 새 메모 (바로 편집) */
  note: Note | null;
  members: readonly HouseholdMember[];
  onClose: () => void;
};

const HEADER_BUTTON = "inline-flex h-11 items-center gap-1 rounded-sm px-3 text-caption font-semibold hover:bg-surface-sunken";

/**
 * 메모 창 (F-18). 웹은 오른쪽 패널, 폰은 바텀시트 (내역 창과 같은 모양).
 * 있는 메모는 먼저 "보기"로 열고, 머리의 "수정"을 눌러야 편집한다. 새 메모는 바로 편집.
 */
export function NotePanel({ note, members, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit">(note ? "view" : "edit");
  const [pinned, setPinned] = useState(note?.isPinned ?? false);

  const title = mode === "edit" ? (note ? "메모 고치기" : "메모 쓰기") : note ? notePreview(note).title : "메모";

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    // 이미 있는 메모는 바로 반영 (고정은 알림 없음). 새 메모는 저장할 때 건다
    if (note) startTransition(async () => void (await setNotePinned(note.id, next)));
  }

  function remove() {
    if (!note) return;
    startTransition(async () => {
      const result = await setNoteDeleted(note.id, true);
      if (result.error) return toast(result.error);
      onClose();
      toast("메모를 지웠어요", {
        action: { label: "되돌리기", onClick: () => void setNoteDeleted(note.id, false) },
      });
    });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim motion-safe:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lg bg-surface-raised shadow-sheet outline-none motion-safe:animate-[sheet-in_200ms_ease-out] lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:rounded-none lg:shadow-float lg:motion-safe:animate-[panel-in_200ms_ease-out]"
        >
          <div className="flex items-center gap-1 px-5 pt-5 pb-2">
            <Dialog.Title className="min-w-0 flex-1 truncate text-title text-ink">{title}</Dialog.Title>
            {mode === "view" ? (
              <button type="button" onClick={() => setMode("edit")} className={`${HEADER_BUTTON} text-primary`}>
                <Pencil size={18} strokeWidth={1.75} aria-hidden />
                수정
              </button>
            ) : null}
            <button
              type="button"
              aria-pressed={pinned}
              onClick={togglePin}
              className={`${HEADER_BUTTON} ${pinned ? "text-primary" : "text-ink-muted"}`}
            >
              <Pin size={18} strokeWidth={pinned ? 2.25 : 1.75} aria-hidden />
              {pinned ? "고정됨" : "고정"}
            </button>
            <Dialog.Close
              aria-label="닫기"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X size={22} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>

          {mode === "view" && note ? (
            <NoteView note={note} members={members} pending={pending} onDelete={remove} />
          ) : (
            <NoteEditForm
              note={note}
              pinned={pinned}
              onSaved={() => (note ? setMode("view") : onClose())}
              onCancel={note ? () => setMode("view") : undefined}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
