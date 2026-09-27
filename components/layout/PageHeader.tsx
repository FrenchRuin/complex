import type { ReactNode } from "react";

type Props = { title: ReactNode; children?: ReactNode };

/** 메인 영역 위쪽 헤더. 스크롤해도 붙어 있다. */
export function PageHeader({ title, children }: Props) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:px-8">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <h1 className="text-title text-ink">{title}</h1>
        {children}
      </div>
    </header>
  );
}
