import { SplitBar } from "@/components/dashboard/SplitBar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { MonthlyChart } from "@/components/stats/MonthlyChart";
import type { Split } from "@/lib/calc/dashboard";
import type { DayTotal } from "@/lib/calc/group";
import { balanceText } from "@/lib/calc/report";
import type { MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";

type Props = {
  totals: DayTotal;
  compareText: string;
  split: Split;
  names: MemberNames;
  chart: { month: MonthString; expense: number }[];
  /** 진행 중인 달 (그래프에 "진행 중" 표시) */
  currentMonth: MonthString;
};

/** 돈 흐름 (F-25): 수입·지출·남은 돈, 지난달 전체 비교, 공동/각자 비율, 최근 6개월 지출 */
export function MoneyFlowSection({ totals, compareText, split, names, chart, currentMonth }: Props) {
  const empty = totals.income === 0 && totals.expense === 0;
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="돈 흐름">
        {empty ? (
          <p className="text-body text-ink-muted">이 달에는 기록이 없어요.</p>
        ) : (
          <>
            <dl className="flex flex-col gap-2 tabular-nums">
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
              <div className="flex items-center justify-between border-t border-line pt-2">
                <dt className="text-body text-ink">남은 돈</dt>
                <dd className="text-amount text-ink">{balanceText(totals)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-caption text-ink-muted tabular-nums">{compareText}</p>
            <div className="mt-5">
              <SplitBar split={split} names={names} />
            </div>
          </>
        )}
        <h3 className="mt-6 mb-2 text-label text-ink-muted">최근 6개월 지출</h3>
        <MonthlyChart data={chart} currentMonth={currentMonth} />
      </SettingsSection>
    </div>
  );
}
