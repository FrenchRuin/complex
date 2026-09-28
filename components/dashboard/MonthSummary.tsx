import type { Split } from "@/lib/calc/dashboard";
import type { DayTotal } from "@/lib/calc/group";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { SplitBar } from "./SplitBar";

type Props = {
  monthLabel: string;
  totals: DayTotal;
  compareText: string;
  /** 사람 필터가 "전체"일 때만 분할 막대를 보여준다 */
  split: Split | null;
  names: MemberNames;
};

/** 이번 달 지출(큰 숫자) + 지난달 비교 + 분할 막대 + 수입·지출 (F-20) */
export function MonthSummary({ monthLabel, totals, compareText, split, names }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md bg-surface-raised p-5">
        <h2 className="text-heading text-ink">{monthLabel} 지출</h2>
        <p className="mt-2 text-amount-hero text-expense tabular-nums">{formatWon(totals.expense)}</p>
        <p className="mt-1 text-caption text-ink-muted tabular-nums">{compareText}</p>
        {split ? (
          <div className="mt-5">
            <SplitBar split={split} names={names} />
          </div>
        ) : null}
      </section>

      <section className="rounded-md bg-surface-raised p-5">
        <h2 className="text-heading text-ink">{monthLabel} 수입·지출</h2>
        <dl className="mt-3 flex flex-col gap-2 tabular-nums">
          <div className="flex items-center justify-between">
            <dt className="text-body text-ink-muted">수입</dt>
            <dd className="text-amount text-income">+{formatWon(totals.income)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-body text-ink-muted">지출</dt>
            <dd className="text-amount text-expense">
              {totals.expense > 0 ? "−" : ""}
              {formatWon(totals.expense)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
