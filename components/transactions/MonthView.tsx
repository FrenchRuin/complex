import Link from "next/link";
import { activeFilterCount, filtersToHref, type TransactionFilters } from "@/lib/calc/filters";
import { dailyTotals, groupByDay } from "@/lib/calc/group";
import { todayKST, type MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import type { LabelMaps, TransactionRecord } from "@/lib/transactions";
import { MonthCalendar } from "./MonthCalendar";
import { TransactionList } from "./TransactionList";

type Props = {
  filters: TransactionFilters;
  currentMonth: MonthString;
  rows: TransactionRecord[];
  labels: LabelMaps;
  names: MemberNames;
};

/** 한 달 보기: 캘린더 + 날짜별 목록 (F-12, F-13) */
export function MonthView({ filters, currentMonth, rows, labels, names }: Props) {
  const visibleRows = filters.day ? rows.filter((r) => r.occurredOn === filters.day) : rows;
  const filtered = activeFilterCount(filters) > 0 || filters.who !== "all" || filters.q !== "";

  return (
    <>
      {filters.q && filters.thisMonthOnly ? (
        <p className="text-caption text-ink-muted">
          이번 달에서만 찾고 있어요.{" "}
          <Link
            href={filtersToHref(filters, currentMonth, { thisMonthOnly: false, day: null })}
            scroll={false}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            전체 기간에서 찾기
          </Link>
        </p>
      ) : null}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:items-start lg:gap-6">
        <MonthCalendar filters={filters} currentMonth={currentMonth} today={todayKST()} totals={dailyTotals(rows)} />
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
    </>
  );
}
