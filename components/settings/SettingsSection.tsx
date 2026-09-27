import type { ReactNode } from "react";

type Props = { title: string; description?: string; children: ReactNode };

/** 설정 화면의 카드 한 장 */
export function SettingsSection({ title, description, children }: Props) {
  const headingId = `settings-${title}`;
  return (
    <section aria-labelledby={headingId} className="rounded-md bg-surface-raised p-5">
      <h2 id={headingId} className="text-heading text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-caption text-ink-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
