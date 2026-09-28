"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationsRead } from "@/app/(app)/notification-actions";
import { notificationHref, notificationSentence, notificationTimeLabel } from "@/lib/calc/notifications";
import { useNotifications } from "./NotificationsProvider";

/** 알림 목록 (최근 30일). 안 읽은 알림은 굵게 + 파란 점 (F-17) */
export function NotificationList({ onNavigate }: { onNavigate: () => void }) {
  const { items, names } = useNotifications();
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((n) => !n.read);

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-heading text-ink">알림</h2>
        <button
          type="button"
          disabled={!hasUnread || pending}
          onClick={() => startTransition(() => void markNotificationsRead())}
          className="rounded-sm px-2 py-1 text-caption font-semibold text-primary hover:bg-surface-sunken disabled:text-ink-muted disabled:hover:bg-transparent"
        >
          모두 읽음
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-body text-ink-muted">최근 30일 동안 온 알림이 없어요.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className="border-b border-line last:border-b-0">
              <Link
                href={notificationHref(n)}
                scroll={false}
                onClick={() => {
                  if (!n.read) void markNotificationsRead([n.id]);
                  onNavigate();
                }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-surface-sunken"
              >
                <span
                  aria-hidden
                  className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-body tabular-nums ${n.read ? "text-ink-muted" : "font-semibold text-ink"}`}>
                    {!n.read ? <span className="sr-only">안 읽음, </span> : null}
                    {notificationSentence(n, names[n.actorId] ?? "구성원")}
                  </span>
                  <span className="mt-0.5 block text-caption text-ink-muted">{notificationTimeLabel(n.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
