"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransactionPanel } from "@/components/transactions/TransactionPanelProvider";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";

/** 1024px 미만: 하단 탭바 5개 + 오른쪽 아래 둥근 추가 버튼 (SPEC §4.1) */
export function MobileTabBar() {
  const pathname = usePathname();
  const { openNew } = useTransactionPanel();

  return (
    <>
      <button
        type="button"
        aria-label="내역 추가"
        onClick={openNew}
        className="fixed right-5 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float lg:hidden"
      >
        <Plus size={26} strokeWidth={1.75} aria-hidden />
      </button>

      <nav
        aria-label="메뉴"
        className="fixed inset-x-0 bottom-0 z-30 bg-surface-raised pb-[env(safe-area-inset-bottom,0px)] shadow-float lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.filter((item) => item.inTabBar).map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-label ${
                    active ? "text-primary" : "text-ink-muted"
                  }`}
                >
                  <item.icon size={22} strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
