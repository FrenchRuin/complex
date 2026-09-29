"use client";

import { Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useSyncStatus } from "@/components/realtime/RealtimeProvider";
import { useTransactionPanel } from "@/components/transactions/TransactionPanelProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";
import type { PaymentMethodOption } from "@/lib/household-data";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";

const DOT: Record<string, string> = { joint: "bg-joint", a: "bg-member-a", b: "bg-member-b" };
const SYNC_LABEL = { connecting: "연결하는 중", online: "실시간 연결됨", offline: "연결 끊김" } as const;
/** 아바타 오른쪽 아래 상태 점: 연결됨 초록, 연결 중 회색, 끊김 속 빈 동그라미 (색만으로 구분하지 않게 모양도 다르게) */
const DOT_STATUS = {
  online: "bg-online",
  connecting: "bg-line-strong",
  offline: "border-2 border-line-strong bg-surface-raised",
} as const;

export type SidebarData = {
  me: HouseholdMember;
  members: HouseholdMember[];
  names: MemberNames;
  paymentMethods: PaymentMethodOption[];
  /** 정기지출 미납 배지 (결제일이 오늘이거나 지난 것) */
  recurringDue: number;
};

type Props = SidebarData & {
  /** 머리 오른쪽 (웹: 알림 종, 폰 메뉴: 닫기) */
  headerAction: ReactNode;
  /** 링크·버튼을 누른 뒤 (폰 메뉴는 닫는다) */
  onNavigate?: () => void;
  /** Ctrl K로 검색칸 (웹 사이드바만) */
  shortcut?: boolean;
};

/** 사이드바 내용 (SPEC §4.2). 웹은 왼쪽에 고정, 폰은 ☰ 메뉴에서 같은 내용을 쓴다 */
export function SidebarContent({ me, members, names, paymentMethods, recurringDue, headerAction, onNavigate, shortcut = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { openNew } = useTransactionPanel();
  const status = useSyncStatus();
  const searchRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <span className="flex -space-x-2">
          {members.map((m) => (
            <Avatar key={m.id} slot={m.slot} name={m.displayName} avatarUrl={m.avatarUrl} />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-heading text-ink">우리 둘 가계부</span>
        {headerAction}
      </div>

      <form
        role="search"
        className="px-3"
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

      <div className="px-3 pt-3">
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

      <nav aria-label="메뉴" className="px-3 pt-4">
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

      <section aria-labelledby="sidebar-methods" className="min-h-0 flex-1 overflow-y-auto px-3 pt-6">
        <div className="flex items-center justify-between px-3 pb-1">
          <h2 id="sidebar-methods" className="text-label text-ink-muted">
            함께 보는 계좌·카드
          </h2>
          <Link
            href="/settings/payment-methods"
            onClick={onNavigate}
            aria-label="계좌·카드 추가"
            className="inline-flex size-7 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        <ul>
          {paymentMethods.map((m) => (
            <li key={m.id}>
              <Link
                href={`/transactions?pm=${m.id}`}
                onClick={onNavigate}
                className="flex h-9 items-center gap-2 rounded-sm px-3 text-body text-ink hover:bg-surface-sunken"
              >
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[m.owner]}`} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="shrink-0 text-caption text-ink-muted">{ownerLabel(m.owner, names)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 아래: 내 프로필 + 오른쪽 톱니바퀴(설정) */}
      <div className="flex items-center gap-2 border-t border-line pt-2 pr-3 pl-6 pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
        <span className="relative shrink-0" title={SYNC_LABEL[status]}>
          <Avatar slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
          <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[status]}`} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body text-ink">
          {me.displayName}
          <span className="sr-only"> · {SYNC_LABEL[status]}</span>
        </span>
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
    </>
  );
}
