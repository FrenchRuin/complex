"use client";

import { Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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

type Props = {
  me: HouseholdMember;
  members: HouseholdMember[];
  names: MemberNames;
  paymentMethods: PaymentMethodOption[];
  /** 정기지출 미납 배지 (결제일이 오늘이거나 지난 것) */
  recurringDue: number;
};

/** 웹(1024px 이상) 왼쪽 사이드바 248px (SPEC §4.2) */
export function Sidebar({ me, members, names, paymentMethods, recurringDue }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { openNew } = useTransactionPanel();
  const status = useSyncStatus();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <aside className="hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface-raised lg:flex">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <span className="flex -space-x-2">
          {members.map((m) => (
            <Avatar key={m.id} slot={m.slot} name={m.displayName} avatarUrl={m.avatarUrl} />
          ))}
        </span>
        <span className="min-w-0">
          <span className="block text-heading text-ink">우리 둘 가계부</span>
          <span className="block truncate text-caption text-ink-muted">
            {members.map((m) => m.displayName).join(" · ")}
          </span>
        </span>
      </div>

      <form
        role="search"
        className="px-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = searchRef.current?.value.trim() ?? "";
          router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
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
          <kbd className="text-label text-ink-muted">Ctrl K</kbd>
        </label>
      </form>

      <div className="px-3 pt-3">
        <Button onClick={openNew} className="h-11 w-full">
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

      <div className="border-t border-line p-3">
        <Link
          href="/settings"
          aria-current={isActivePath(pathname, "/settings") ? "page" : undefined}
          className="flex h-10 items-center gap-3 rounded-sm px-3 text-body text-ink hover:bg-surface-sunken aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
        >
          <Settings size={20} strokeWidth={1.75} aria-hidden />
          설정
        </Link>
        <div className="flex items-center gap-2 px-3 pt-2">
          <Avatar slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
          <span className="min-w-0">
            <span className="block truncate text-body text-ink">{me.displayName}</span>
            <span className="block text-caption text-ink-muted">{SYNC_LABEL[status]}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
