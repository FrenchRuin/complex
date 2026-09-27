import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { AssetsOverview } from "@/lib/assets";
import { goalProgress, netWorth } from "@/lib/calc/assets";
import { todayKST } from "@/lib/date";
import { formatWon } from "@/lib/money";

/** 홈 자산·목표 요약 카드: 순자산 + 진행 중인 목표 2개. 누르면 자산·목표 화면 */
export function AssetsCard({ overview }: { overview: AssetsOverview }) {
  const worth = netWorth(overview.assets);
  const goals = overview.goals.filter((g) => !g.isDone).slice(0, 2);
  const empty = overview.assets.length === 0 && goals.length === 0;
  const today = todayKST();

  return (
    <Link href="/assets" className="block rounded-md bg-surface-raised p-5 hover:bg-surface-raised/80">
      <span className="flex items-center justify-between">
        <span className="text-heading text-ink">자산·목표</span>
        <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
      </span>
      {empty ? (
        <span className="mt-1 block text-body text-ink-muted">통장·대출·저축 목표를 등록하고 순자산을 확인해 보세요.</span>
      ) : (
        <>
          <span className="mt-2 block text-caption text-ink-muted">순자산</span>
          <span className="block text-amount text-ink tabular-nums">
            {worth.net < 0 ? "−" : ""}
            {formatWon(Math.abs(worth.net))}
          </span>
          {goals.length ? (
            <span className="mt-3 flex flex-col gap-2">
              {goals.map((g) => {
                const p = goalProgress(g.targetAmount, g.saved, g.dueDate, today);
                return (
                  <span key={g.id} className="block">
                    <span className="flex justify-between text-caption tabular-nums">
                      <span className="text-ink">{g.name}</span>
                      <span className="text-ink-muted">{p.percent}%</span>
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${p.percent}%` }} />
                    </span>
                  </span>
                );
              })}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
