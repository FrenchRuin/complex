import { BudgetBar } from "@/components/dashboard/BudgetBar";
import { allowanceText, overText, type AllowanceRow, type BudgetSummary, type CategoryBudgetRow } from "@/lib/calc/budget";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";

/** 변동지출 예산 합계: 쓴 돈 / 예산, 진행바, 남은 예산·하루 예산 (F-21) */
export function BudgetTotals({ summary }: { summary: BudgetSummary }) {
  return (
    <>
      <p className="text-amount text-ink tabular-nums">
        {formatWon(summary.spentTotal)}
        <span className="text-body text-ink-muted"> / {formatWon(summary.budgetTotal)}</span>
      </p>
      <div className="mt-2">
        <BudgetBar percent={summary.percent} overBy={Math.max(0, -summary.remaining)} label="변동지출" />
      </div>
      <p className="mt-2 text-caption text-ink-muted tabular-nums">
        {summary.remaining >= 0
          ? `${formatWon(summary.remaining)} 남았어요` +
            (summary.daysLeft > 0 ? ` · 남은 ${summary.daysLeft}일 동안 하루 ${formatWon(summary.dailyAllowance)}씩 쓰면 돼요` : "")
          : `예산보다 ${formatWon(-summary.remaining)} 더 썼어요`}
      </p>
    </>
  );
}

type CategoryProps = {
  rows: readonly CategoryBudgetRow[];
  categoryNames: Record<string, { name: string }>;
};

/** 넘은 카테고리 문구 + 카테고리별 쓴 돈 / 예산 막대 (F-22). 넘은 것은 문구를 위에 한 번 더 */
export function CategoryBudgetList({ rows, categoryNames }: CategoryProps) {
  const name = (id: string) => categoryNames[id]?.name ?? "카테고리";
  const overRows = rows.filter((r) => r.over);
  return (
    <>
      {overRows.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1">
          {overRows.map((r) => (
            <li key={r.categoryId} className="text-caption text-danger">
              {overText(name(r.categoryId), r.overBy)}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
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
    </>
  );
}

/** 용돈: 사람마다 개인 지출 / 한도, 막대, 남은 금액 (사람 이름을 글자로 함께) */
export function AllowanceList({ rows, names }: { rows: readonly AllowanceRow[]; names: MemberNames }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const name = ownerLabel(r.slot, names);
        return (
          <li key={r.slot}>
            <div className="mb-1 flex justify-between text-body tabular-nums">
              <span className="text-ink">{name} 용돈</span>
              <span className="text-caption text-ink-muted">
                {formatWon(r.spent)} / {formatWon(r.limit)}
              </span>
            </div>
            <BudgetBar percent={r.percent} overBy={r.overBy} label={`${name} 용돈`} />
            <p className={`mt-1 text-caption tabular-nums ${r.over ? "text-danger" : "text-ink-muted"}`}>
              {allowanceText(r, name)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
