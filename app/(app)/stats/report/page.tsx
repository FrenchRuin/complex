import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssetGoalSection } from "@/components/report/AssetGoalSection";
import { CategoryBudgetSection } from "@/components/report/CategoryBudgetSection";
import { MoneyFlowSection } from "@/components/report/MoneyFlowSection";
import { PrintSetup } from "@/components/report/print";
import { RecurringSection } from "@/components/report/RecurringSection";
import { ReportHeader } from "@/components/report/ReportHeader";
import { getAssetsOverview } from "@/lib/assets";
import { getMonthBudgets, getSpendBudgets } from "@/lib/budget";
import { assetComposition } from "@/lib/calc/assets";
import { spendBudgetRows } from "@/lib/calc/budget";
import { splitByOwner } from "@/lib/calc/dashboard";
import { sumTotals } from "@/lib/calc/group";
import { periodOf, periodRange } from "@/lib/calc/period";
import {
  compareWithLastPeriod,
  netWorthChange,
  overBudgetTexts,
  reportGoals,
  reportMonth,
  reportTitle,
  topExpenses,
} from "@/lib/calc/report";
import { categoryStats, monthlyExpense, recentMonths, unbudgetedFixedTotal } from "@/lib/calc/stats";
import { formatMonthLabel, shiftMonth, todayKST, type MonthString } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getPeriodConfig } from "@/lib/period";
import { getRecurringForMonth } from "@/lib/recurring";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "월말 결산 · 감자밭" };

/**
 * 월말 결산 (F-25): 한 달을 둘이 같이 돌아보는 화면. 처음엔 지난달(가장 최근에 끝난 달).
 * 달은 한 달 기준(F-56)의 기간, 사람 필터 없이 가구 전체. `PDF로 저장`은 브라우저 인쇄 창을 연다.
 */
export default async function ReportPage({ searchParams }: PageProps<"/stats/report">) {
  await requireMember();
  const cfg = await getPeriodConfig();
  const today = todayKST();
  const current = periodOf(today, cfg);
  const param = (await searchParams).month;
  const month = reportMonth(typeof param === "string" ? param : undefined, current);
  const range = periodRange(month, cfg);
  const months = recentMonths(month, 6);
  const inPeriod = (date: string) => periodOf(date, cfg);

  const [rows, budgets, spendBudgets, recurring, assets, labels, members] = await Promise.all([
    getTransactionsInRange({ start: periodRange(months[0], cfg).start, end: range.end }),
    getMonthBudgets(month),
    getSpendBudgets(month),
    getRecurringForMonth(month),
    getAssetsOverview(),
    getLabelMaps(),
    getHouseholdMembers(),
  ]);
  const names = toMemberNames(members);
  const thisMonth = rows.filter((r) => inPeriod(r.occurredOn) === month);
  const lastMonth = rows.filter((r) => inPeriod(r.occurredOn) === shiftMonth(month, -1));
  const totals = sumTotals(thisMonth);
  const categories = categoryStats(thisMonth, lastMonth, budgets);
  const spend = spendBudgetRows(spendBudgets, thisMonth);
  const categoryName = (id: string) => labels.categories[id]?.name ?? "카테고리";
  const title = reportTitle(month);

  const nav = (target: MonthString, label: "이전 달" | "다음 달") => (
    <Link
      href={`/stats/report?month=${target}`}
      aria-label={label}
      scroll={false}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
    >
      {label === "이전 달" ? (
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
      ) : (
        <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
      )}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={`${formatMonthLabel(month)} 결산`}
        titleStart={nav(shiftMonth(month, -1), "이전 달")}
        titleEnd={month < current ? nav(shiftMonth(month, 1), "다음 달") : null}
      />
      <PrintSetup title={title} />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-5 py-6 print:p-0">
        <ReportHeader title={title} range={range} inProgress={month === current} today={today} />
        <MoneyFlowSection
          totals={totals}
          compareText={compareWithLastPeriod(totals.expense, sumTotals(lastMonth).expense)}
          split={splitByOwner(thisMonth)}
          names={names}
          chart={monthlyExpense(rows, months, inPeriod)}
          currentMonth={current}
        />
        <CategoryBudgetSection
          stats={categories}
          categories={labels.categories}
          spend={spend}
          overTexts={overBudgetTexts(categories, spend, categoryName)}
          top={topExpenses(thisMonth)}
          names={names}
        />
        <RecurringSection
          overview={recurring}
          fixedTotal={unbudgetedFixedTotal(thisMonth, budgets)}
          inProgress={month === current}
        />
        <AssetGoalSection
          change={netWorthChange(assets.history, range, today)}
          composition={assetComposition(assets.assets)}
          goals={reportGoals(assets.goals, range)}
        />
      </div>
    </>
  );
}
