import Link from "next/link";
import { overText, type BudgetSummary, type CategoryBudgetRow } from "@/lib/calc/budget";
import { formatWon } from "@/lib/money";
import { BudgetBar } from "./BudgetBar";

type Props = {
  summary: BudgetSummary;
  /** 사용률 높은 순 상위 5개 */
  top: CategoryBudgetRow[];
  categoryNames: Record<string, { name: string }>;
};

/** 홈 "변동지출 예산" 카드 (F-21, F-22) */
export function BudgetCard({ summary, top, categoryNames }: Props) {
  if (summary.budgetTotal === 0) {
    return (
      <section className="rounded-md bg-surface-raised p-5">
        <h2 className="text-heading text-ink">변동지출 예산</h2>
        <p className="mt-1 text-body text-ink-muted">
          아직 예산이 없어요.{" "}
          <Link href="/settings#budget" className="font-semibold text-primary underline-offset-4 hover:underline">
            설정에서 카테고리별 예산을 정해 보세요
          </Link>
        </p>
      </section>
    );
  }

  const overRows = top.filter((r) => r.over);
  const name = (id: string) => categoryNames[id]?.name ?? "카테고리";

  return (
    <section className="rounded-md bg-surface-raised p-5">
      <h2 className="text-heading text-ink">변동지출 예산</h2>
      <p className="mt-2 text-amount text-ink tabular-nums">
        {formatWon(summary.spentTotal)}
        <span className="text-body text-ink-muted"> / {formatWon(summary.budgetTotal)}</span>
      </p>
      <div className="mt-2">
        <BudgetBar percent={summary.percent} overBy={Math.max(0, -summary.remaining)} label="변동지출" />
      </div>
      <p className="mt-2 text-caption text-ink-muted tabular-nums">
        {summary.remaining >= 0
          ? `${formatWon(summary.remaining)} 남았어요` + (summary.daysLeft > 0 ? ` · 남은 ${summary.daysLeft}일 동안 하루 ${formatWon(summary.dailyAllowance)}씩 쓰면 돼요` : "")
          : `예산보다 ${formatWon(-summary.remaining)} 더 썼어요`}
      </p>

      {overRows.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {overRows.map((r) => (
            <li key={r.categoryId} className="text-caption text-danger">
              {overText(name(r.categoryId), r.overBy)}
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="mt-5 text-label text-ink-muted">카테고리 예산 (많이 쓴 순)</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {top.map((r) => (
          <li key={r.categoryId}>
            <div className="mb-1 flex justify-between text-body tabular-nums">
              <span className="text-ink">{name(r.categoryId)}</span>
              <span className="text-caption text-ink-muted">
                {formatWon(r.spent)} / {formatWon(r.budget)}
              </span>
            </div>
            <BudgetBar percent={r.percent} overBy={r.overBy} label={name(r.categoryId)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
