"use client";

import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "./NotificationsProvider";

/** 종 아이콘 + 안 읽은 개수. 누르면 알림 목록이 뜬다 (F-17) */
export function NotificationBell({ className = "" }: { className?: string }) {
  const { items } = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread > 0 ? `알림, 안 읽은 알림 ${unread}건` : "알림"}
        className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken ${className}`}
      >
        <Bell size={22} strokeWidth={1.75} aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-on-primary tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-[70] flex max-h-[min(560px,calc(100dvh-96px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-md bg-surface-raised shadow-float motion-safe:animate-[fade-in_150ms_ease-out]"
        >
          <NotificationList onNavigate={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
