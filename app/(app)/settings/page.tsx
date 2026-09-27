import {
  ChevronRight,
  CreditCard,
  Gauge,
  LogOut,
  Smartphone,
  Tags,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMonthBudgets } from "@/lib/budget";
import { FREE_DB_LIMIT_BYTES, usagePercent } from "@/lib/calc/usage";
import { currentMonthKST } from "@/lib/date";
import { getHouseholdMembers, requireMember } from "@/lib/household";
import { formatWon } from "@/lib/money";
import { getAllCategories, getAllPaymentMethods, getUsage } from "@/lib/settings-data";
import { logout } from "./actions";

export const metadata: Metadata = { title: "설정 · 우리 둘 가계부" };

type MenuItem = { href: string; label: string; icon: LucideIcon; summary: string };

/** 설정 첫 화면: 메뉴 목록 + 각 메뉴의 현재 상태 요약 */
export default async function SettingsPage() {
  const me = await requireMember();
  const [members, categories, methods, budgets, usage] = await Promise.all([
    getHouseholdMembers(),
    getAllCategories(),
    getAllPaymentMethods(),
    getMonthBudgets(currentMonthKST()),
    getUsage(),
  ]);

  const visible = categories.filter((c) => !c.is_hidden);
  const hidden = categories.length - visible.length;
  const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);

  const items: MenuItem[] = [
    { href: "/settings/profile", label: "프로필", icon: User, summary: me.displayName },
    {
      href: "/settings/household",
      label: "가구·초대",
      icon: Users,
      summary: members.length >= 2 ? members.map((m) => m.displayName).join(" · ") : "혼자예요 · 배우자 초대하기",
    },
    {
      href: "/settings/categories",
      label: "카테고리",
      icon: Tags,
      summary:
        `지출 ${visible.filter((c) => c.type === "expense").length}개 · 수입 ${visible.filter((c) => c.type === "income").length}개` +
        (hidden ? ` · 숨김 ${hidden}개` : ""),
    },
    {
      href: "/settings/payment-methods",
      label: "계좌·카드",
      icon: CreditCard,
      summary: `${methods.filter((m) => !m.is_hidden).length}개`,
    },
    {
      href: "/settings/budget",
      label: "예산",
      icon: Wallet,
      summary: budgets.length ? `이번 달 ${budgets.length}개 · ${formatWon(budgetTotal)}` : "아직 없어요",
    },
    { href: "/settings/app", label: "앱으로 설치", icon: Smartphone, summary: "홈 화면에 추가" },
    {
      href: "/settings/usage",
      label: "서비스 사용량",
      icon: Gauge,
      summary: usage ? `DB ${usagePercent(usage.dbSizeBytes, FREE_DB_LIMIT_BYTES)}% 사용` : "",
    },
  ];

  return (
    <>
      <PageHeader title="설정" />
      <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
        <nav aria-label="설정 메뉴" className="rounded-md bg-surface-raised">
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-line last:border-b-0">
                <Link href={item.href} className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-surface-sunken/60">
                  <item.icon size={22} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden />
                  <span className="flex-1 text-body text-ink">{item.label}</span>
                  <span className="max-w-[55%] truncate text-caption text-ink-muted tabular-nums">{item.summary}</span>
                  <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form action={logout}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-surface-raised text-body font-semibold text-ink"
          >
            <LogOut size={20} strokeWidth={1.75} aria-hidden />
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}
