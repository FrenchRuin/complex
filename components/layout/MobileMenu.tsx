"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { SidebarContent, type SidebarData } from "./SidebarContent";

const OpenContext = createContext<(() => void) | null>(null);

/**
 * 폰(1024px 미만) ☰ 메뉴: 왼쪽에서 밀려 나오는 사이드바. 하단 탭바는 그대로 두고,
 * 탭바에 없는 메모·자산·목표 등은 여기서 간다 (사용자 요청 2026-09-28).
 */
export function MobileMenuProvider({ data, children }: { data: SidebarData; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <OpenContext.Provider value={() => setOpen(true)}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 motion-safe:animate-[fade-in_150ms_ease-out] lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-surface-raised pt-[env(safe-area-inset-top,0px)] shadow-float outline-none motion-safe:animate-[drawer-in_200ms_ease-out] lg:hidden"
          >
            <Dialog.Title className="sr-only">메뉴</Dialog.Title>
            <SidebarContent
              {...data}
              onNavigate={close}
              headerAction={
                <Dialog.Close
                  aria-label="메뉴 닫기"
                  className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
                >
                  <X size={22} strokeWidth={1.75} aria-hidden />
                </Dialog.Close>
              }
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </OpenContext.Provider>
  );
}

/** 폰 화면 제목 줄 왼쪽 끝 ☰ 버튼 (웹에서는 숨김) */
export function MobileMenuButton() {
  const open = useContext(OpenContext);
  if (!open) return null;
  return (
    <button
      type="button"
      aria-label="메뉴 열기"
      onClick={open}
      className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken lg:hidden"
    >
      <Menu size={22} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
