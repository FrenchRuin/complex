"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { SmsImport } from "./sms/SmsImport";
import { TransactionForm } from "./TransactionForm";
import type { PanelState } from "./TransactionPanelProvider";
import type { PanelData } from "./types";

type Props = {
  state: PanelState;
  data: PanelData;
  onClose: () => void;
  /** 저장한 가맹점 → 카테고리를 바로 기억한다 */
  onLearn: (merchant: string, categoryId: string) => void;
};

/**
 * 웹(1024px 이상): 오른쪽 440px 패널. 모바일: 바텀시트.
 * Radix Dialog가 포커스 가두기, Esc 닫기, 바깥 누르면 닫기를 맡는다.
 */
export function TransactionPanel({ state, data, onClose, onLearn }: Props) {
  const open = state.mode !== "closed";
  const record = state.mode === "edit" ? state.record : null;
  const [tab, setTab] = useState<"manual" | "sms">("manual");
  const showSms = !record && tab === "sms";

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 motion-safe:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lg bg-surface-raised shadow-sheet outline-none motion-safe:animate-[sheet-in_200ms_ease-out] lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:rounded-none lg:shadow-float lg:motion-safe:animate-[panel-in_200ms_ease-out]"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <Dialog.Title className="text-title text-ink">
              {record ? "내역 수정" : "내역 추가"}
            </Dialog.Title>
            <Dialog.Close
              aria-label="닫기"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X size={22} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          {record ? null : (
            <div role="tablist" aria-label="입력 방식" className="mx-5 mb-2 flex rounded-sm bg-surface-sunken p-1">
              {(
                [
                  { id: "manual", label: "직접 입력" },
                  { id: "sms", label: "문자로 추가" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-[6px] text-body ${
                    tab === t.id ? "bg-surface-raised font-semibold text-ink" : "text-ink-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {open && showSms ? <SmsImport data={data} onDone={onClose} onLearn={onLearn} /> : null}
          {open && !showSms ? (
            <TransactionForm record={record} data={data} onDone={onClose} onLearn={onLearn} />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
