"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { markNotificationsRead } from "@/app/(app)/notification-actions";
import { notificationHref, notificationSentence, notificationTimeLabel } from "@/lib/calc/notifications";
import { useNotifications } from "./NotificationsProvider";

/**
 * 알림 목록 (최근 30일). 안 읽은 알림은 굵게 + 파란 점 (F-17).
 * 누르면 화면이 넘어갈 때까지 목록을 열어 두고 그 알림에 도는 표시를 보여준다 (주소가 바뀌면 닫힘).
 */
export function NotificationList({ onNavigate }: { onNavigate: () => void }) {
  const { items, names } = useNotifications();
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((n) => !n.read);
  const pathname = usePathname();
  const params = useSearchParams();
  const here = params.size ? `${pathname}?${params}` : pathname;
  const [opening, setOpening] = useState<{ id: string; from: string } | null>(null);

  useEffect(() => {
    if (opening && here !== opening.from) onNavigate();
  }, [here, opening, onNavigate]);

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
          {items.map((n) => {
            const href = notificationHref(n);
            const busy = opening?.id === n.id;
            return (
              <li key={n.id} className="border-b border-line last:border-b-0">
                <Link
                  href={href}
                  scroll={false}
                  aria-busy={busy || undefined}
                  onClick={() => {
                    if (!n.read) void markNotificationsRead([n.id]);
                    // 지금 보고 있는 주소면 넘어갈 게 없으니 바로 닫는다
                    if (href === here) onNavigate();
                    else setOpening({ id: n.id, from: here });
                  }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-surface-sunken"
                >
                  {/* 점 자리(8px)에 도는 표시를 겹쳐 글자가 밀리지 않게 */}
                  <span aria-hidden className="relative mt-2 size-2 shrink-0">
                    {busy ? (
                      <LoaderCircle
                        size={14}
                        strokeWidth={2}
                        className="absolute -top-[3px] -left-[3px] animate-spin text-primary motion-reduce:animate-none"
                      />
                    ) : (
                      <span className={`block size-2 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-body tabular-nums ${n.read ? "text-ink-muted" : "font-semibold text-ink"}`}>
                      {!n.read ? <span className="sr-only">안 읽음, </span> : null}
                      {notificationSentence(n, names[n.actorId] ?? "구성원")}
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-muted">{notificationTimeLabel(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
