import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  /** 제목 앞뒤에 붙는 것 (예: 월 이동 버튼) */
  titleStart?: ReactNode;
  titleEnd?: ReactNode;
  children?: ReactNode;
};

/** 메인 영역 위쪽 헤더. 스크롤해도 붙어 있다. */
export function PageHeader({ title, titleStart, titleEnd, children }: Props) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:top-0 lg:px-8">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {titleStart}
          <h1 className="text-title text-ink tabular-nums">{title}</h1>
          {titleEnd}
        </div>
        {children}
      </div>
    </header>
  );
}
