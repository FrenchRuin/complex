import { SpendBudgetList } from "@/components/budget/BudgetParts";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CategoryStatsTable } from "@/components/stats/CategoryStatsTable";
import type { SpendBudgetRow } from "@/lib/calc/budget";
import type { CategoryStat } from "@/lib/calc/stats";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { LabelMaps, TransactionRecord } from "@/lib/transactions";

type Props = {
  stats: CategoryStat[];
  categories: LabelMaps["categories"];
  spend: SpendBudgetRow[];
  overTexts: string[];
  top: TransactionRecord[];
  names: MemberNames;
};

/** "9/14" */
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 카테고리·예산 (F-25): 넘은 예산 문장, 카테고리별 표, 통장·카드 예산, 가장 크게 쓴 5건 */
export function CategoryBudgetSection({ stats, categories, spend, overTexts, top, names }: Props) {
  const who = (r: TransactionRecord) => (r.scope === "joint" ? "공동" : (names[r.memberSlot] ?? "개인"));
  return (
    <SettingsSection title="카테고리·예산">
      {overTexts.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1 break-inside-avoid">
          {overTexts.map((text, i) => (
            <li key={i} className="text-body text-danger">
              {text}
            </li>
          ))}
        </ul>
      ) : null}
      <CategoryStatsTable stats={stats} categories={categories} />
      {spend.length > 0 ? (
        <div className="mt-6 break-inside-avoid">
          <h3 className="mb-3 text-label text-ink-muted">통장·카드 예산</h3>
          <SpendBudgetList rows={spend} />
        </div>
      ) : null}
      {top.length > 0 ? (
        <div className="mt-6 break-inside-avoid">
          <h3 className="mb-2 text-label text-ink-muted">가장 크게 쓴 내역</h3>
          <ol className="divide-y divide-line">
            {top.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-body tabular-nums">
                <span className="w-10 shrink-0 text-caption text-ink-muted">{shortDate(r.occurredOn)}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.merchant ?? categories[r.categoryId]?.name ?? "내역"}</span>
                <span className="shrink-0 text-caption text-ink-muted">{who(r)}</span>
                <span className="shrink-0 text-amount text-expense">{formatWon(r.amount)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </SettingsSection>
  );
}
