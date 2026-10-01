import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CategoryStatsTable } from "@/components/stats/CategoryStatsTable";
import { MonthlyChart } from "@/components/stats/MonthlyChart";
import { PersonStats } from "@/components/stats/PersonStats";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { getMonthBudgets } from "@/lib/budget";
import { parseFilters } from "@/lib/calc/filters";
import { categoryStats, monthlyExpense, personStats, recentMonths, unbudgetedFixedTotal } from "@/lib/calc/stats";
import { formatPeriodRange, formatPeriodRangeShort, isCalendarRange, periodOf, periodRange } from "@/lib/calc/period";
import { shiftMonth, todayKST, type MonthString } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { formatWon } from "@/lib/money";
import { getPeriodConfig } from "@/lib/period";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "통계 · 감자밭" };

const hrefFor = (month: MonthString, current: MonthString) => (month === current ? "/stats" : `/stats?month=${month}`);

/** 통계 (F-23): 최근 6개월 지출, 카테고리별 예산 대비, 사람별, 예산 없는 고정지출. 달은 한 달 기준(F-56)의 기간 */
export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  await requireMember();
  const cfg = await getPeriodConfig();
  const current = periodOf(todayKST(), cfg);
  const { month } = parseFilters(await searchParams, current);
  const months = recentMonths(month, 6);
  const range = periodRange(month, cfg);
  const inPeriod = (date: string) => periodOf(date, cfg);

  const [rows, budgets, labels, members] = await Promise.all([
    getTransactionsInRange({ start: periodRange(months[0], cfg).start, end: range.end }),
    getMonthBudgets(month),
    getLabelMaps(),
    getHouseholdMembers(),
  ]);
  const memberNames = toMemberNames(members);

  const thisMonth = rows.filter((r) => inPeriod(r.occurredOn) === month);
  const lastMonth = rows.filter((r) => inPeriod(r.occurredOn) === shiftMonth(month, -1));
  const fixed = unbudgetedFixedTotal(thisMonth, budgets);

  const monthNav = (direction: -1 | 1) => (
    <Link
      href={hrefFor(shiftMonth(month, direction), current)}
      aria-label={direction < 0 ? "이전 달" : "다음 달"}
      scroll={false}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
    >
      {direction < 0 ? (
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
      ) : (
        <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
      )}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={<MonthPicker month={month} currentMonth={current} path="/stats" query="" />}
        titleStart={monthNav(-1)}
        titleEnd={
          <>
            {monthNav(1)}
            {isCalendarRange(range) ? null : (
              <span className="hidden whitespace-nowrap text-caption text-ink-muted tabular-nums sm:inline">
                {formatPeriodRangeShort(range)}
              </span>
            )}
          </>
        }
        actions={
          <Link
            href="/stats/report"
            className="inline-flex h-10 items-center rounded-md px-3 text-body font-semibold text-primary hover:bg-primary-soft"
          >
            월말 결산
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
        {/* 폰: 머리에 못 넣은 기간 (한 달 기준 F-56) */}
        {isCalendarRange(range) ? null : (
          <p className="-mt-2 text-caption text-ink-muted tabular-nums sm:hidden">{formatPeriodRange(range)}</p>
        )}
        <div className="flex flex-col gap-4">
          <SettingsSection title="최근 6개월 지출">
            <MonthlyChart data={monthlyExpense(rows, months, inPeriod)} currentMonth={current} />
          </SettingsSection>
          <SettingsSection title="사람별 지출">
            <PersonStats stats={personStats(thisMonth)} names={memberNames} categoryNames={labels.categories} />
          </SettingsSection>
        </div>
        <SettingsSection title="카테고리별 지출" description="예산 대비 사용률과 지난달 대비 증감이에요.">
          <CategoryStatsTable stats={categoryStats(thisMonth, lastMonth, budgets)} categories={labels.categories} />
          {fixed > 0 ? (
            <p className="mt-3 rounded-sm bg-surface px-3 py-2 text-body text-ink tabular-nums">
              예산 없는 고정지출 {formatWon(fixed)}
              <span className="block text-caption text-ink-muted">정기지출로 기록된 것 중 예산이 없는 카테고리의 합계예요.</span>
            </p>
          ) : null}
        </SettingsSection>
      </div>
    </>
  );
}
