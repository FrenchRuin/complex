import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/transactions/FilterBar";
import { MonthLink } from "@/components/transactions/MonthLinks";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { MonthView } from "@/components/transactions/MonthView";
import { OpenFromQuery } from "@/components/transactions/OpenFromQuery";
import { PersonFilterLinks } from "@/components/transactions/PersonFilterLinks";
import { SearchResults } from "@/components/transactions/SearchResults";
import { filtersToHref, isSearchAll, parseFilters } from "@/lib/calc/filters";
import { formatPeriodRangeShort, isCalendarRange, periodOf, periodRange } from "@/lib/calc/period";
import { todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories, getVisiblePaymentMethods } from "@/lib/household-data";
import { getPeriodConfig } from "@/lib/period";
import { getLabelMaps, getMonthTransactions, searchAllTransactions } from "@/lib/transactions";

export const metadata: Metadata = { title: "내역 · 우리 둘 가계부" };

/**
 * 내역 화면: 월 이동, 사람 필터, 검색·필터, 캘린더 + 날짜별 목록 (F-12, F-13).
 * 검색어가 있으면 전체 기간에서 찾는다 ("이번 달만 보기"로 좁힐 수 있음). 달은 한 달 기준(F-56)의 기간.
 */
export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  await requireMember();
  const cfg = await getPeriodConfig();
  const currentMonth = periodOf(todayKST(), cfg);
  const filters = parseFilters(await searchParams, currentMonth, (date) => periodOf(date, cfg));
  const searchAll = isSearchAll(filters);
  const range = periodRange(filters.month, cfg);

  const [rows, labels, members, categories, paymentMethods] = await Promise.all([
    searchAll ? searchAllTransactions(filters) : getMonthTransactions(filters, range),
    getLabelMaps(),
    getHouseholdMembers(),
    getVisibleCategories(),
    getVisiblePaymentMethods(),
  ]);
  const names = toMemberNames(members);

  // 월 이동·연월 선택용: 이번 달 기준으로 만든 주소에서 쿼리만 떼어 쓴다
  const monthQuery = (month: string) => filtersToHref(filters, currentMonth, { month, day: null }).split("?")[1] ?? "";

  return (
    <>
      <PageHeader
        title={
          searchAll ? (
            "전체 기간 검색"
          ) : (
            <MonthPicker month={filters.month} currentMonth={currentMonth} path="/transactions" query={monthQuery(currentMonth)} />
          )
        }
        titleStart={searchAll ? null : <MonthLink filters={filters} currentMonth={currentMonth} direction="prev" />}
        titleEnd={
          searchAll ? null : (
            <>
              <MonthLink filters={filters} currentMonth={currentMonth} direction="next" />
              {isCalendarRange(range) ? null : (
                <span className="text-caption text-ink-muted tabular-nums">{formatPeriodRangeShort(range)}</span>
              )}
            </>
          )
        }
      >
        <PersonFilterLinks
          current={filters.who}
          names={names}
          hrefFor={(who) => filtersToHref(filters, currentMonth, { who, day: null })}
        />
      </PageHeader>

      <div className="flex flex-col gap-4 px-5 py-4 lg:px-8">
        <FilterBar filters={filters} currentMonth={currentMonth} categories={categories} paymentMethods={paymentMethods} />
        {searchAll ? (
          <SearchResults filters={filters} currentMonth={currentMonth} rows={rows} labels={labels} names={names} />
        ) : (
          <MonthView filters={filters} currentMonth={currentMonth} rows={rows} labels={labels} names={names} />
        )}
      </div>
      <OpenFromQuery rows={rows} />
    </>
  );
}
