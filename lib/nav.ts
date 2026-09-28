import { ChartColumn, House, NotebookPen, PiggyBank, ReceiptText, Repeat, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 모바일 하단 탭바에 보일지 (5개) */
  inTabBar: boolean;
  /** 웹 사이드바 메뉴에 보일지 (설정은 사이드바 맨 아래에 따로 둔다) */
  inSidebar: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: House, inTabBar: true, inSidebar: true },
  { href: "/transactions", label: "내역", icon: ReceiptText, inTabBar: true, inSidebar: true },
  { href: "/stats", label: "통계", icon: ChartColumn, inTabBar: true, inSidebar: true },
  { href: "/recurring", label: "정기지출", icon: Repeat, inTabBar: true, inSidebar: true },
  { href: "/notes", label: "메모", icon: NotebookPen, inTabBar: false, inSidebar: true },
  { href: "/assets", label: "자산·목표", icon: PiggyBank, inTabBar: false, inSidebar: true },
  { href: "/settings", label: "설정", icon: Settings, inTabBar: true, inSidebar: false },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
