import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/transactions/FilterBar";
import { MonthCalendar } from "@/components/transactions/MonthCalendar";
import { MonthLink } from "@/components/transactions/MonthLinks";
import { PersonFilterLinks } from "@/components/transactions/PersonFilterLinks";
import { TransactionList } from "@/components/transactions/TransactionList";
import { activeFilterCount, parseFilters } from "@/lib/calc/filters";
import { dailyTotals, groupByDay } from "@/lib/calc/group";
import { currentMonthKST, formatMonthLabel, todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories, getVisiblePaymentMethods } from "@/lib/household-data";
import { getLabelMaps, getMonthTransactions } from "@/lib/transactions";

export const metadata: Metadata = { title: "내역 · 우리 둘 가계부" };

/** 내역 화면: 월 이동, 사람 필터, 검색·필터, 캘린더 + 날짜별 목록 (F-12, F-13) */
export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  await requireMember();
  const currentMonth = currentMonthKST();
  const filters = parseFilters(await searchParams, currentMonth);

  const [rows, labels, members, categories, paymentMethods] = await Promise.all([
    getMonthTransactions(filters),
    getLabelMaps(),
    getHouseholdMembers(),
    getVisibleCategories(),
    getVisiblePaymentMethods(),
  ]);

  const names = toMemberNames(members);
  const visibleRows = filters.day ? rows.filter((r) => r.occurredOn === filters.day) : rows;
  const filtered = activeFilterCount(filters) > 0 || filters.who !== "all" || filters.q !== "";

  return (
    <>
      <PageHeader
        title={formatMonthLabel(filters.month)}
        titleStart={<MonthLink filters={filters} currentMonth={currentMonth} direction="prev" />}
        titleEnd={<MonthLink filters={filters} currentMonth={currentMonth} direction="next" />}
      >
        <PersonFilterLinks filters={filters} currentMonth={currentMonth} names={names} />
      </PageHeader>

      <div className="flex flex-col gap-4 px-5 py-4 lg:px-8">
        <FilterBar
          filters={filters}
          currentMonth={currentMonth}
          categories={categories}
          paymentMethods={paymentMethods}
        />
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:items-start lg:gap-6">
          <MonthCalendar
            filters={filters}
            currentMonth={currentMonth}
            today={todayKST()}
            totals={dailyTotals(rows)}
          />
          <TransactionList
            groups={groupByDay(visibleRows)}
            labels={labels}
            names={names}
            emptyMessage={
              filters.day
                ? "이 날은 내역이 없어요."
                : filtered
                  ? "조건에 맞는 내역이 없어요. 필터를 바꿔 보세요."
                  : "이번 달 내역이 없어요. 내역 추가 버튼으로 시작해 보세요."
            }
          />
        </div>
      </div>
    </>
  );
}
