import { PageHeader } from "./PageHeader";

type Props = { title: string; milestone: string; description: string };

/** 아직 만들지 않은 메뉴의 안내 화면 */
export function ComingSoon({ title, milestone, description }: Props) {
  return (
    <>
      <PageHeader title={title} />
      <div className="px-5 py-6 lg:px-8">
        <section className="rounded-md bg-surface-raised p-5">
          <h2 className="text-heading text-ink">준비 중이에요</h2>
          <p className="mt-1 text-body text-ink-muted">
            {description} {milestone}에서 만들어요.
          </p>
        </section>
      </div>
    </>
  );
}
