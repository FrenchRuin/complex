"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/** 가운데 뜨는 작은 창 (모바일은 바텀시트). 포커스 가두기·Esc 닫기는 Radix가 맡는다. */
export function ModalDialog({ open, onOpenChange, title, description, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 motion-safe:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-lg bg-surface-raised p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-sheet outline-none motion-safe:animate-[sheet-in_200ms_ease-out] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md sm:shadow-float sm:motion-safe:animate-[fade-in_150ms_ease-out]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-title text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-caption text-ink-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="닫기"
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X size={22} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
