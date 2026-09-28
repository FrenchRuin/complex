"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pin, X } from "lucide-react";
import { useState, useTransition } from "react";
import { saveNote, setNoteDeleted, setNotePinned } from "@/app/(app)/notes/actions";
import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { convertNote, type Note, type NoteItem, type NoteKind } from "@/lib/calc/notes";
import { ChecklistEditor } from "./ChecklistEditor";

type Props = {
  /** null이면 새 메모 */
  note: Note | null;
  onClose: () => void;
};

const KIND_OPTIONS = [
  { value: "text", label: "글" },
  { value: "checklist", label: "체크리스트" },
] as const;

const newItem = (): NoteItem => ({ id: crypto.randomUUID(), text: "", done: false });

/**
 * 메모 쓰기·고치기 창 (F-18). 웹은 오른쪽 패널, 폰은 바텀시트 (내역 창과 같은 모양).
 * 글 ↔ 체크리스트를 바꾸면 줄과 항목을 서로 옮겨 내용을 잃지 않는다.
 */
export function NoteEditor({ note, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<NoteKind>(note?.kind ?? "text");
  const [body, setBody] = useState(note?.body ?? "");
  const [items, setItems] = useState<NoteItem[]>(note?.items.length ? note.items : [newItem()]);
  const [pinned, setPinned] = useState(note?.isPinned ?? false);
  const [error, setError] = useState<string | null>(null);

  function changeKind(next: NoteKind) {
    const converted = convertNote({ kind, body, items }, next, () => crypto.randomUUID());
    setKind(next);
    setBody(converted.body);
    setItems(converted.items.length ? converted.items : [newItem()]);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveNote({ id: note?.id, kind, body, items });
      if (result.error) return setError(result.error);
      // 새 메모의 고정은 저장 뒤에 따로 건다
      if (result.id && pinned !== (note?.isPinned ?? false)) await setNotePinned(result.id, pinned);
      toast(note ? "메모를 고쳤어요" : "메모를 저장했어요");
      onClose();
    });
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    // 이미 있는 메모는 바로 반영 (고정은 알림 없음)
    if (note) startTransition(async () => void (await setNotePinned(note.id, next)));
  }

  function remove() {
    if (!note) return;
    startTransition(async () => {
      const result = await setNoteDeleted(note.id, true);
      if (result.error) return setError(result.error);
      onClose();
      toast("메모를 지웠어요", {
        action: { label: "되돌리기", onClick: () => void setNoteDeleted(note.id, false) },
      });
    });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 motion-safe:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lg bg-surface-raised shadow-sheet outline-none motion-safe:animate-[sheet-in_200ms_ease-out] lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:rounded-none lg:shadow-float lg:motion-safe:animate-[panel-in_200ms_ease-out]"
        >
          <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
            <Dialog.Title className="text-title text-ink">{note ? "메모 고치기" : "메모 쓰기"}</Dialog.Title>
            <div className="-mr-2 flex items-center">
              <button
                type="button"
                aria-pressed={pinned}
                onClick={togglePin}
                className={`inline-flex h-11 items-center gap-1 rounded-sm px-3 text-caption font-semibold hover:bg-surface-sunken ${
                  pinned ? "text-primary" : "text-ink-muted"
                }`}
              >
                <Pin size={18} strokeWidth={pinned ? 2.25 : 1.75} aria-hidden />
                {pinned ? "고정됨" : "고정"}
              </button>
              <Dialog.Close
                aria-label="닫기"
                className="inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
              >
                <X size={22} strokeWidth={1.75} aria-hidden />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
            <SegmentedControl legend="메모 형식" options={KIND_OPTIONS} value={kind} onChange={changeKind} />
            {kind === "text" ? (
              <label className="flex flex-col gap-2">
                <span className="sr-only">메모 내용</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  rows={10}
                  autoFocus={!note}
                  placeholder="첫 줄이 목록에서 제목으로 보여요"
                  className="min-h-48 resize-y rounded-sm bg-surface-sunken px-4 py-3 text-body text-ink placeholder:text-ink-muted"
                />
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-caption font-semibold text-ink-muted">제목 (선택)</span>
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={100}
                    placeholder="예: 장보기"
                    className="h-12 rounded-sm bg-surface-sunken px-4 text-body text-ink placeholder:text-ink-muted"
                  />
                </label>
                <ChecklistEditor items={items} onChange={setItems} />
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-line px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
            <p role="alert" className="text-caption text-danger empty:hidden">
              {error}
            </p>
            <div className="flex gap-2">
              {note ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
              <Button pending={pending} onClick={save} className="flex-1">
                {pending ? "저장하는 중" : "저장"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
