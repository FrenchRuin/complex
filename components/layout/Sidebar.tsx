"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
 * 맨 위 머리 줄(접기·감자밭·알림)은 오른쪽 화면 제목 줄(PageHeader)과 높이·아래 선을 맞춰 한 줄로 보인다.
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

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "사이드바 펼치기" : "사이드바 접기";

  return (
    <aside
      className={`hidden h-dvh shrink-0 flex-col border-r border-line bg-surface-raised lg:flex print:hidden! ${collapsed ? "w-16" : "w-[248px]"}`}
    >
      {/* 머리 줄: PageHeader와 같은 높이 (py-3 + 44px + 아래 선). 접기 버튼은 접든 펴든 같은 자리 */}
      <div className={`flex shrink-0 items-center border-b border-line py-3 ${collapsed ? "justify-center" : "gap-1 px-3"}`}>
        <button
          type="button"
          onClick={() => {
            setFocusSearch(false);
            setAndSave(!collapsed);
          }}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <ToggleIcon size={22} strokeWidth={1.75} aria-hidden />
        </button>
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1 truncate pl-1 text-heading text-ink">감자밭</span>
            <NotificationBell />
          </>
        )}
      </div>
      {collapsed ? (
        <SidebarRail me={data.me} members={data.members} moods={data.moods} recurringDue={data.recurringDue} />
      ) : (
        <SidebarContent {...data} shortcut autoFocusSearch={focusSearch} />
      )}
    </aside>
  );
}
