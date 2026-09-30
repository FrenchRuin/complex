"use client";

import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { PaymentMethodOption } from "@/lib/household-data";

const DOT: Record<string, string> = { joint: "bg-joint", a: "bg-member-a", b: "bg-member-b" };
/** 접었는지는 기기마다 기억한다 (웹 사이드바와 폰 ☰ 메뉴가 함께 쓴다) */
const STORAGE_KEY = "sidebar-methods-collapsed";

const listeners = new Set<() => void>();
// 저장이 안 되는 환경(사생활 보호 모드 등)에서는 이번 화면 동안만 기억
let memoryCollapsed = false;

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryCollapsed;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function save(collapsed: boolean) {
  memoryCollapsed = collapsed;
  try {
    if (collapsed) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장이 안 되면 memoryCollapsed로만
  }
  listeners.forEach((l) => l());
}

type Props = {
  paymentMethods: PaymentMethodOption[];
  names: MemberNames;
  onNavigate?: () => void;
};

/** 사이드바 "함께 보는 계좌·카드" (SPEC §4.2). 제목을 누르면 목록을 접고 편다 */
export function SidebarMethods({ paymentMethods, names, onNavigate }: Props) {
  // 서버에서는 펼친 상태로 그린다
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  return (
    <section aria-labelledby="sidebar-methods" className="pt-6">
      <div className="flex items-center gap-1 pb-1">
        <h2 id="sidebar-methods" className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="sidebar-methods-list"
            onClick={() => save(!collapsed)}
            className="flex h-8 w-full items-center gap-1 rounded-sm px-3 text-left text-label text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <span className="min-w-0 flex-1 truncate">함께 보는 계좌·카드</span>
            {collapsed ? <span className="text-caption tabular-nums">{paymentMethods.length}</span> : null}
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>
        </h2>
        <Link
          href="/settings/payment-methods"
          onClick={onNavigate}
          aria-label="계좌·카드 추가"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <ul id="sidebar-methods-list" hidden={collapsed}>
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
  );
}
