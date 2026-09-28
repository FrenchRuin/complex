"use client";

import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { PersonChip } from "@/components/ui/PersonChip";
import type { Note } from "@/lib/calc/notes";
import { notificationTimeLabel } from "@/lib/calc/notifications";
import type { HouseholdMember } from "@/lib/household";
import { NoteChecklist } from "./NoteChecklist";

const HAS_LINK = /https?:\/\/|www\./i;

type Props = {
  note: Note;
  members: readonly HouseholdMember[];
  pending: boolean;
  onDelete: () => void;
};

/**
 * 메모 보기 (F-18): 읽기, 링크 누르기, 체크리스트 체크. 고치려면 창 머리의 "수정".
 * 글 메모는 첫 줄(제목)이 창 머리에 있으므로 본문에는 둘째 줄부터 보여준다.
 */
export function NoteView({ note, members, pending, onDelete }: Props) {
  const editor = members.find((m) => m.id === note.updatedBy);
  const lines = note.body.split("\n");
  const firstLine = lines.findIndex((line) => line.trim());
  // 첫 줄에 주소가 있으면 창 머리에서는 누를 수 없으므로 본문에 첫 줄부터 보여준다
  const titleHasLink = firstLine >= 0 && HAS_LINK.test(lines[firstLine]);
  const rest =
    note.kind === "text" && firstLine >= 0
      ? (titleHasLink ? note.body : lines.slice(firstLine + 1).join("\n")).trim()
      : "";
  const checklistTitle = note.kind === "checklist" ? note.body.trim() : "";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <p className="flex items-center gap-2 text-caption text-ink-muted">
          {editor ? <PersonChip owner={editor.slot} label={editor.displayName} /> : null}
          <span>{notificationTimeLabel(note.updatedAt)} 마지막 수정</span>
        </p>

        {note.kind === "text" ? (
          rest ? (
            <p className="text-body whitespace-pre-wrap text-ink">
              <LinkifiedText text={rest} />
            </p>
          ) : null
        ) : (
          <>
            {/* 제목에 주소만 있는 경우 등, 제목 줄에도 링크를 살린다 */}
            {checklistTitle && HAS_LINK.test(checklistTitle) ? (
              <p className="text-body text-ink">
                <LinkifiedText text={checklistTitle} />
              </p>
            ) : null}
            {note.items.length ? (
              <NoteChecklist noteId={note.id} items={note.items} linkify />
            ) : (
              <p className="text-body text-ink-muted">항목이 없어요. 수정을 눌러 추가해 주세요.</p>
            )}
          </>
        )}
      </div>

      <div className="flex border-t border-line px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <DeleteButton disabled={pending} onDelete={onDelete} />
      </div>
    </>
  );
}
