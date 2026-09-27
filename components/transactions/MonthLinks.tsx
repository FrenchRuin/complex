import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { filtersToHref, type TransactionFilters } from "@/lib/calc/filters";
import { shiftMonth, type MonthString } from "@/lib/date";

type Props = { filters: TransactionFilters; currentMonth: MonthString; direction: "prev" | "next" };

/** 이전/다음 달 (필터는 유지, 고른 날짜는 해제) */
export function MonthLink({ filters, currentMonth, direction }: Props) {
  const month = shiftMonth(filters.month, direction === "prev" ? -1 : 1);
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={filtersToHref(filters, currentMonth, { month, day: null })}
      aria-label={direction === "prev" ? "이전 달" : "다음 달"}
      scroll={false}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
    >
      <Icon size={22} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
