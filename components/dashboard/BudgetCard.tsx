import Link from "next/link";
import { BudgetTotals, CategoryBudgetList, SpendBudgetList } from "@/components/budget/BudgetParts";
import type { BudgetSummary, CategoryBudgetRow, SpendBudgetRow } from "@/lib/calc/budget";

type Props = {
  /** 카테고리 예산 (사람 필터가 "전체"일 때만, 아니면 null) */
  category: { summary: BudgetSummary; top: CategoryBudgetRow[] } | null;
  categoryNames: Record<string, { name: string }>;
  /** 통장·카드 예산: 전체면 모두, 사람(공동)을 고르면 그 계좌·카드가 들어간 것만 */
  spendBudgets: SpendBudgetRow[];
};

const MORE_LINK = "text-body font-semibold text-primary underline-offset-4 hover:underline";

/** 홈 "예산" 카드 (F-21, F-22): 변동지출 예산 + 통장·카드 예산. 자세히는 예산 화면 */
export function BudgetCard({ category, categoryNames, spendBudgets }: Props) {
  const hasCategory = category !== null && category.summary.budgetTotal > 0;

  if (!hasCategory && spendBudgets.length === 0) {
    return (
      <section aria-labelledby="home-budget" className="rounded-md bg-surface-raised p-5">
        <h2 id="home-budget" className="text-heading text-ink">
          예산
        </h2>
        <p className="mt-1 text-body text-ink-muted">
          아직 예산이 없어요.{" "}
          <Link href="/budget" className="font-semibold text-primary underline-offset-4 hover:underline">
            카테고리 예산과 통장·카드 예산을 정해 보세요
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-budget" className="flex flex-col gap-5 rounded-md bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <h2 id="home-budget" className="text-heading text-ink">
          예산
        </h2>
        <Link href="/budget" className={MORE_LINK}>
          자세히
        </Link>
      </div>

      {hasCategory ? (
        <div>
          <h3 className="mb-2 text-label text-ink-muted">변동지출 예산</h3>
          <BudgetTotals summary={category.summary} />
          <h3 className="mt-4 mb-2 text-label text-ink-muted">카테고리 예산 (많이 쓴 순)</h3>
          <CategoryBudgetList rows={category.top} categoryNames={categoryNames} />
        </div>
      ) : null}

      {spendBudgets.length > 0 ? (
        <div>
          <h3 className="mb-2 text-label text-ink-muted">통장·카드 예산</h3>
          <SpendBudgetList rows={spendBudgets} />
        </div>
      ) : null}
    </section>
  );
}
