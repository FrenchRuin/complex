import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HeaderFilters } from "./HeaderFilters";
import { MobileMenuButton } from "./MobileMenu";

type Props = {
  title: ReactNode;
  /** 제목 앞뒤에 붙는 것 (예: 월 이동 버튼) */
  titleStart?: ReactNode;
  titleEnd?: ReactNode;
  /** 제목 줄 오른쪽 끝 버튼 (폰은 알림 종 왼쪽) */
  actions?: ReactNode;
  children?: ReactNode;
};

/** 메인 영역 위쪽 헤더. 스크롤해도 붙어 있다. */
export function PageHeader({ title, titleStart, titleEnd, actions, children }: Props) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:top-0 lg:px-8 print:hidden!">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 lg:gap-y-3">
        {/* 폰: 제목 줄이 한 줄을 다 쓰고(오른쪽 끝 종), 필터 같은 children은 다음 줄로 */}
        <div className="flex w-full min-w-0 items-center gap-1 lg:w-auto lg:flex-1">
          {/* 폰: 왼쪽 끝 ☰ 메뉴 (웹은 사이드바가 늘 보임) */}
          <MobileMenuButton />
          {titleStart}
          <h1 className="text-title text-ink tabular-nums">{title}</h1>
          {titleEnd}
          <div className="ml-auto flex items-center gap-1">
            {actions}
            {/* 폰: 알림 종은 제목 줄 오른쪽 끝 (웹은 사이드바에 있음) */}
            <NotificationBell className="-mr-2 lg:hidden" />
          </div>
        </div>
        {/* 폰: 아래로 스크롤하면 필터 줄은 접힌다 */}
        {children ? <HeaderFilters>{children}</HeaderFilters> : null}
      </div>
    </header>
  );
}
