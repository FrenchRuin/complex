"use client";

import { Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSyncStatus } from "@/components/realtime/RealtimeProvider";
import { MoodPicker } from "@/components/mood/MoodPicker";
import { useTransactionPanel } from "@/components/transactions/TransactionPanelProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { moodOf, moodText, type TodayMood } from "@/lib/calc/mood";
import type { MemberNames } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";
import type { PaymentMethodOption } from "@/lib/household-data";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { SidebarMethods } from "./SidebarMethods";
import { SidebarPartner } from "./SidebarPartner";
import { DOT_STATUS, SYNC_LABEL } from "./status";

export type SidebarData = {
  me: HouseholdMember;
  members: HouseholdMember[];
  names: MemberNames;
  paymentMethods: PaymentMethodOption[];
  /** 정기지출 미납 배지 (결제일이 오늘이거나 지난 것) */
  recurringDue: number;
  /** 오늘 기분 (F-04), 사람 id → 기분 */
  moods: Record<string, TodayMood>;
};

type Props = SidebarData & {
  /** 링크·버튼을 누른 뒤 (폰 메뉴는 닫는다) */
  onNavigate?: () => void;
  /** Ctrl K로 검색칸 (웹 사이드바만) */
  shortcut?: boolean;
  /** 처음 그릴 때 검색칸에 포커스 (접힌 사이드바에서 Ctrl K로 펼쳤을 때) */
  autoFocusSearch?: boolean;
};

/** 사이드바 내용 (SPEC §4.2), 머리 줄 아래 검색부터. 웹은 왼쪽에 고정, 폰은 ☰ 메뉴에서 같은 내용을 쓴다 */
export function SidebarContent({ me, members, names, paymentMethods, recurringDue, moods, onNavigate, shortcut = false, autoFocusSearch = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { openNew } = useTransactionPanel();
  const status = useSyncStatus();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  const partner = members.find((m) => m.id !== me.id);

  return (
    <>
      <form
        role="search"
        className="px-3 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = searchRef.current?.value.trim() ?? "";
          router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
          onNavigate?.();
        }}
      >
        <label className="flex h-10 items-center gap-2 rounded-sm bg-surface-sunken px-3 text-ink-muted">
          <Search size={18} strokeWidth={1.75} aria-hidden />
          <span className="sr-only">내역 검색</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="검색"
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
          {shortcut ? <kbd className="text-label text-ink-muted">Ctrl K</kbd> : null}
        </label>
      </form>

      {/* 위: 도구(검색·내역 추가) | 아래: 메뉴. 아래쪽 내 프로필 위 선과 같은 구분선 */}
      <div className="border-b border-line px-3 pt-3 pb-4">
        <Button
          onClick={() => {
            onNavigate?.();
            openNew();
          }}
          className="h-11 w-full"
        >
          <Plus size={20} strokeWidth={1.75} aria-hidden />
          내역 추가
        </Button>
      </div>

      {/* 가운데(메뉴 + 계좌·카드)만 한 덩어리로 스크롤. 위(검색·내역 추가)와 아래(프로필)는 고정 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <nav aria-label="메뉴" className="pt-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => item.inSidebar).map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-3 rounded-sm px-3 text-body ${
                      active ? "bg-primary-soft font-semibold text-primary" : "text-ink hover:bg-surface-sunken"
                    }`}
                  >
                    <item.icon size={20} strokeWidth={1.75} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/recurring" ? <CountBadge count={recurringDue} label="미납" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <SidebarMethods paymentMethods={paymentMethods} names={names} onNavigate={onNavigate} />
      </div>

      {/* 아래: 상대(접속 상태) 위에, 맨 아래 내 프로필 + 오른쪽 톱니바퀴(설정) (2026-10-02) */}
      <div className="border-t border-line pt-2 pr-3 pl-6 pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
        {partner ? <SidebarPartner partner={partner} mood={moods[partner.id]} /> : null}
        <div className="flex items-center gap-2">
          {/* 내 프로필 줄을 누르면 오늘 기분 고르기 (F-04) */}
          <MoodPicker current={moods[me.id] ?? null}>
            <button
              type="button"
              aria-label={`${me.displayName} · ${SYNC_LABEL[status]} · 오늘 기분 고르기, 지금 ${moods[me.id] ? moodText(moods[me.id]) : "아직 안 정했어요"}`}
              className="-ml-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm px-2 text-left hover:bg-surface-sunken"
            >
              <span className="relative shrink-0" title={SYNC_LABEL[status]}>
                <Avatar slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
                <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[status]}`} />
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-ink">
                {me.displayName}
                {moods[me.id] ? <span aria-hidden> {moodOf(moods[me.id].mood).emoji}</span> : null}
                <span className="sr-only"> · {SYNC_LABEL[status]}</span>
              </span>
            </button>
          </MoodPicker>
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-label="설정"
            aria-current={isActivePath(pathname, "/settings") ? "page" : undefined}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </>
  );
}
