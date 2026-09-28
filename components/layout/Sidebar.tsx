"use client";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarContent, type SidebarData } from "./SidebarContent";

/** 웹(1024px 이상) 왼쪽 사이드바 248px (SPEC §4.2) */
export function Sidebar(props: SidebarData) {
  return (
    <aside className="hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface-raised lg:flex">
      <SidebarContent {...props} headerAction={<NotificationBell className="-mr-1" />} shortcut />
    </aside>
  );
}
