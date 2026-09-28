import Link from "next/link";
import { filtersToHref, SEARCH_PAGE_SIZE, type TransactionFilters } from "@/lib/calc/filters";
import { groupByDay, sumTotals } from "@/lib/calc/group";
import type { MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { LabelMaps, TransactionRecord } from "@/lib/transactions";
import { TransactionList } from "./TransactionList";

type Props = {
  filters: TransactionFilters;
  currentMonth: MonthString;
  /** 조건에 맞는 전체 (최대 2000건) — 요약 합계에 쓴다 */
  rows: TransactionRecord[];
  labels: LabelMaps;
  names: MemberNames;
};

const linkClass = "text-body font-semibold text-primary underline-offset-4 hover:underline";

/** 전체 기간 검색 결과: 요약(건수·합계) + 날짜별 목록 + 더 보기 */
export function SearchResults({ filters, currentMonth, rows, labels, names }: Props) {
  const totals = sumTotals(rows);
  const shown = rows.slice(0, filters.limit);
  const more = rows.length > filters.limit;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="검색 요약" className="rounded-md bg-surface-raised px-5 py-4">
        <p className="text-heading text-ink tabular-nums">
          ‘{filters.amount !== null ? formatWon(filters.amount) : filters.q}’ 검색 결과 {rows.length.toLocaleString("ko-KR")}
          {rows.length >= 2000 ? "건 이상" : "건"}
        </p>
        <p className="mt-1 text-caption text-ink-muted tabular-nums">
          전체 기간 · 지출 {formatWon(totals.expense)}
          {totals.income ? ` · 수입 +${formatWon(totals.income)}` : ""}
          {filters.amount !== null ? " · 가맹점·메모와 금액이 같은 내역을 함께 찾았어요" : ""}
        </p>
        <Link
          href={filtersToHref(filters, currentMonth, { thisMonthOnly: true, month: currentMonth })}
          scroll={false}
          className={`mt-2 inline-block ${linkClass}`}
        >
          이번 달만 보기
        </Link>
      </section>

      <TransactionList
        groups={groupByDay(shown)}
        labels={labels}
        names={names}
        currentYear={Number(currentMonth.slice(0, 4))}
        emptyMessage="찾는 내역이 없어요. 다른 말로 검색하거나 필터를 바꿔 보세요."
      />

      {more ? (
        <Link
          href={filtersToHref(filters, currentMonth, { limit: filters.limit + SEARCH_PAGE_SIZE })}
          scroll={false}
          className="flex h-12 items-center justify-center rounded-md border border-line-strong text-body font-semibold text-ink hover:bg-surface-sunken"
        >
          더 보기 ({(rows.length - filters.limit).toLocaleString("ko-KR")}건 더)
        </Link>
      ) : null}
    </div>
  );
}
