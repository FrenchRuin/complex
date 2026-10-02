"use client";

import { Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSyncStatus } from "@/components/realtime/RealtimeProvider";
import { useTransactionPanel } from "@/components/transactions/TransactionPanelProvider";
import { MoodBadge } from "@/components/mood/MoodBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { TodayMood } from "@/lib/calc/mood";
import type { HouseholdMember } from "@/lib/household";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { RailPartner } from "./SidebarPartner";
import { DOT_STATUS, SYNC_LABEL } from "./status";

/** 마우스를 올리거나 키보드로 오면 오른쪽에 뜨는 이름표 (이름은 aria-label로도 읽힌다) */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 hidden -translate-y-1/2 rounded-sm bg-ink px-2 py-1 text-caption whitespace-nowrap text-surface shadow-float group-hover:block group-focus-visible:block"
    >
      {children}
    </span>
  );
}

const ITEM =
  "group relative inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary";

type Props = { me: HouseholdMember; members: HouseholdMember[]; moods: Record<string, TodayMood>; recurringDue: number };

/** 접힌 웹 사이드바 (폭 64px, 머리 줄의 펼치기 버튼 아래): 알림, 내역 추가, 메뉴 아이콘, 상대 접속 상태, 내 연결 상태, 설정 */
export function SidebarRail({ me, members, moods, recurringDue }: Props) {
  const pathname = usePathname();
  const { openNew } = useTransactionPanel();
  const status = useSyncStatus();
  const partner = members.find((m) => m.id !== me.id);
  const mood = moods[me.id];

  return (
    <>
      <div className="flex flex-col items-center gap-1 border-b border-line pt-3 pb-3">
        <NotificationBell />
        <button
          type="button"
          onClick={openNew}
          aria-label="내역 추가"
          className="group relative mt-2 inline-flex size-11 items-center justify-center rounded-md bg-primary text-on-primary hover:bg-primary/90"
        >
          <Plus size={22} strokeWidth={1.75} aria-hidden />
          <Tip>내역 추가</Tip>
        </button>
      </div>

      <nav aria-label="메뉴" className="flex-1">
        <ul className="flex flex-col items-center gap-1 pt-3 pb-1">
          {NAV_ITEMS.filter((item) => item.inSidebar).map((item) => {
            const due = item.href === "/recurring" && recurringDue > 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={due ? `${item.label}, 미납 ${recurringDue}건` : item.label}
                  aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                  className={ITEM}
                >
                  <item.icon size={22} strokeWidth={1.75} aria-hidden />
                  {due ? (
                    <span
                      aria-hidden
                      className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-on-primary tabular-nums"
                    >
                      {recurringDue}
                    </span>
                  ) : null}
                  <Tip>{item.label}</Tip>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col items-center gap-1 border-t border-line pt-3 pb-3">
        {/* 상대(접속 상태)가 위, 내가 아래 (2026-10-02) */}
        {partner ? (
          <span className="pb-2">
            <RailPartner partner={partner} mood={moods[partner.id]} />
          </span>
        ) : null}
        <span className="relative" title={`${me.displayName} · ${SYNC_LABEL[status]}`}>
          <Avatar slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
          {/* 오늘 기분 (F-04): 고르기는 펼친 사이드바에서 */}
          <MoodBadge name={me.displayName} mood={mood} className="-top-1 -right-1" />
          <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[status]}`} />
          <span className="sr-only">
            {me.displayName} · {SYNC_LABEL[status]}
          </span>
        </span>
        <Link
          href="/settings"
          aria-label="설정"
          aria-current={isActivePath(pathname, "/settings") ? "page" : undefined}
          className={`${ITEM} text-ink-muted hover:text-ink`}
        >
          <Settings size={22} strokeWidth={1.75} aria-hidden />
          <Tip>설정</Tip>
        </Link>
      </div>
    </>
  );
}
