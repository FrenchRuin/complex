import type { ReactNode } from "react";

type Props = { title: string; description?: ReactNode; children?: ReactNode };

/** 로그인·온보딩·초대처럼 가운데 카드 한 장인 화면 */
export function CenteredCard({ title, description, children }: Props) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8">
      <section className="w-full max-w-[400px] rounded-md bg-surface-raised p-5 sm:p-8">
        <h1 className="text-title text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 text-caption text-ink-muted">{description}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}
