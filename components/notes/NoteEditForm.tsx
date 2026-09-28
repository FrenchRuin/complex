"use client";

import { useState, useTransition } from "react";
import { saveNote, setNotePinned } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { convertNote, type Note, type NoteItem, type NoteKind } from "@/lib/calc/notes";
import { ChecklistEditor } from "./ChecklistEditor";

type Props = {
  /** null이면 새 메모 */
  note: Note | null;
  /** 새 메모에 걸 고정 (있는 메모는 창 머리에서 바로 바뀐다) */
  pinned: boolean;
  /** 저장 끝. 있는 메모면 보기로, 새 메모면 창을 닫는다 */
  onSaved: () => void;
  /** 있는 메모를 고치다가 취소 → 보기로 */
  onCancel?: () => void;
};

const KIND_OPTIONS = [
  { value: "text", label: "글" },
  { value: "checklist", label: "체크리스트" },
] as const;

const newItem = (): NoteItem => ({ id: crypto.randomUUID(), text: "", done: false });

/** 메모 편집 (F-18). 글 ↔ 체크리스트를 바꾸면 줄과 항목을 서로 옮겨 내용을 잃지 않는다. */
export function NoteEditForm({ note, pinned, onSaved, onCancel }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<NoteKind>(note?.kind ?? "text");
  const [body, setBody] = useState(note?.body ?? "");
  const [items, setItems] = useState<NoteItem[]>(note?.items.length ? note.items : [newItem()]);
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
      if (!note && result.id && pinned) await setNotePinned(result.id, true);
      toast(note ? "메모를 고쳤어요" : "메모를 저장했어요");
      onSaved();
    });
  }

  return (
    <>
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
              autoFocus
              placeholder="첫 줄이 목록에서 제목으로 보여요. 주소를 붙이면 링크가 돼요"
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
          {onCancel ? (
            <Button variant="secondary" onClick={onCancel} disabled={pending} className="flex-1">
              취소
            </Button>
          ) : null}
          <Button pending={pending} onClick={save} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </div>
    </>
  );
}
