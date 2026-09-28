"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { setEventDeleted } from "@/app/(app)/schedule/actions";
import { useToast } from "@/components/ui/Toast";
import type { Occurrence } from "@/lib/calc/events";
import type { DateString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";
import { EventEditForm } from "./EventEditForm";
import { EventView } from "./EventView";

type Props = {
  /** null이면 새 일정 (바로 편집) */
  occurrence: Occurrence | null;
  defaultDate: DateString;
  names: MemberNames;
  members: readonly HouseholdMember[];
  onClose: () => void;
};

/**
 * 일정 창 (F-19). 메모 창과 같은 방식: 웹은 오른쪽 패널, 폰은 바텀시트.
 * 있는 일정은 먼저 보기, "수정"으로 편집. 새 일정은 바로 편집.
 */
export function EventPanel({ occurrence, defaultDate, names, members, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit">(occurrence ? "view" : "edit");
  const event = occurrence?.event ?? null;
  const title = mode === "edit" ? (event ? "일정 수정" : "일정 추가") : (event?.title ?? "일정");

  function remove() {
    if (!event) return;
    startTransition(async () => {
      const result = await setEventDeleted(event.id, true);
      if (result.error) return toast(result.error);
      onClose();
      toast("일정을 삭제했어요", {
        action: { label: "되돌리기", onClick: () => void setEventDeleted(event.id, false) },
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
          <div className="flex items-center gap-1 px-5 pt-5 pb-2">
            <Dialog.Title className="min-w-0 flex-1 truncate text-title text-ink">{title}</Dialog.Title>
            {mode === "view" ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex h-11 items-center gap-1 rounded-sm px-3 text-caption font-semibold text-primary hover:bg-surface-sunken"
              >
                <Pencil size={18} strokeWidth={1.75} aria-hidden />
                수정
              </button>
            ) : null}
            <Dialog.Close
              aria-label="닫기"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X size={22} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>

          {mode === "view" && occurrence ? (
            <EventView occurrence={occurrence} names={names} members={members} pending={pending} onDelete={remove} />
          ) : (
            <EventEditForm
              event={event}
              defaultDate={defaultDate}
              names={names}
              onSaved={() => (event ? setMode("view") : onClose())}
              onCancel={event ? () => setMode("view") : undefined}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
