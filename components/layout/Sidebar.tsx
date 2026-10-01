"use client";

import { PanelLeftClose } from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { saveSidebarCollapsed } from "@/lib/sidebar";
import { SidebarContent, type SidebarData } from "./SidebarContent";
import { SidebarRail } from "./SidebarRail";

type Props = SidebarData & {
  /** 쿠키에서 읽은 접힘 상태 (서버가 처음부터 맞는 폭으로 그린다) */
  initialCollapsed: boolean;
};

/**
 * 웹(1024px 이상) 왼쪽 사이드바 (SPEC §4.2). 펼치면 248px, 접으면 아이콘만 64px.
 * 접힘 상태는 기기마다 기억한다. 접혀 있을 때 Ctrl K를 누르면 펼치고 검색칸으로 간다.
 */
export function Sidebar({ initialCollapsed, ...data }: Props) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [focusSearch, setFocusSearch] = useState(false);

  const setAndSave = (next: boolean) => {
    setCollapsed(next);
    saveSidebarCollapsed(next);
  };

  useEffect(() => {
    if (!collapsed) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") {
        e.preventDefault();
        setFocusSearch(true);
        setAndSave(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  return (
    <aside
      className={`hidden h-dvh shrink-0 flex-col border-r border-line bg-surface-raised lg:flex print:hidden! ${collapsed ? "w-16" : "w-[248px]"}`}
    >
      {collapsed ? (
        <SidebarRail me={data.me} recurringDue={data.recurringDue} onExpand={() => setAndSave(false)} />
      ) : (
        <SidebarContent
          {...data}
          headerAction={
            <span className="-mr-1 flex items-center">
              <NotificationBell />
              <button
                type="button"
                onClick={() => {
                  setFocusSearch(false);
                  setAndSave(true);
                }}
                aria-label="사이드바 접기"
                title="사이드바 접기"
                className="inline-flex size-10 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
              >
                <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          }
          shortcut
          autoFocusSearch={focusSearch}
        />
      )}
    </aside>
  );
}
