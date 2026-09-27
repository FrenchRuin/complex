import { BudgetBar } from "@/components/dashboard/BudgetBar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import type { CategoryStat } from "@/lib/calc/stats";
import { formatWon } from "@/lib/money";

type Props = {
  stats: CategoryStat[];
  categories: Record<string, { name: string; icon: string }>;
};

/** "▲ 23,000원" / "▼ 5,000원" / "변화 없음". 색이 아니라 기호와 글자로 표시 */
function diffText(diff: number): string {
  if (diff === 0) return "변화 없음";
  return `${diff > 0 ? "▲" : "▼"} ${formatWon(Math.abs(diff))}`;
}

/** 카테고리별: 쓴 돈 / 예산 / 사용률 / 지난달 대비 (F-23) */
export function CategoryStatsTable({ stats, categories }: Props) {
  if (stats.length === 0) {
    return <p className="py-6 text-center text-body text-ink-muted">이 달에는 지출이 없어요.</p>;
  }

  return (
    <ul>
      {stats.map((s) => {
        const category = categories[s.categoryId];
        const name = category?.name ?? "카테고리";
        return (
          <li key={s.categoryId} className="border-b border-line py-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <CategoryIcon name={category?.icon ?? "circle-ellipsis"} size="sm" />
              <span className="min-w-0 flex-1 truncate text-body text-ink">{name}</span>
              <span className="text-amount text-expense tabular-nums">{formatWon(s.spent)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between pl-11 text-caption text-ink-muted tabular-nums">
              <span>{s.budget ? `예산 ${formatWon(s.budget)}` : "예산 없음"}</span>
              <span>지난달 대비 {diffText(s.diff)}</span>
            </div>
            {s.budget && s.percent !== null ? (
              <div className="mt-2 pl-11">
                <BudgetBar percent={s.percent} overBy={s.overBy} label={name} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
