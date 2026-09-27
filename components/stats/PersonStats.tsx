import { PersonChip } from "@/components/ui/PersonChip";
import type { PersonStat } from "@/lib/calc/stats";
import { OWNERS, ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";

type Props = {
  stats: Record<"joint" | "a" | "b", PersonStat>;
  names: MemberNames;
  categoryNames: Record<string, { name: string }>;
};

/** 사람별: 공동 / A / B 합계와 각자 많이 쓴 카테고리 2개 (F-23). 색이 아니라 이름 칩으로 구분 */
export function PersonStats({ stats, names, categoryNames }: Props) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {OWNERS.map((owner) => {
        const s = stats[owner];
        return (
          <li key={owner} className="rounded-sm bg-surface p-4">
            <PersonChip owner={owner} label={ownerLabel(owner, names)} />
            <p className="mt-2 text-amount text-expense tabular-nums">{formatWon(s.total)}</p>
            <p className="mt-1 text-caption text-ink-muted">
              {s.top.length === 0
                ? "지출 없음"
                : s.top.map((t) => `${categoryNames[t.categoryId]?.name ?? "카테고리"} ${formatWon(t.amount)}`).join(" · ")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
