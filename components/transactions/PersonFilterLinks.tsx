import Link from "next/link";
import { filtersToHref, type PersonFilter, type TransactionFilters } from "@/lib/calc/filters";
import type { MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";

type Props = { filters: TransactionFilters; currentMonth: MonthString; names: MemberNames };

/** 사람 필터 (전체/공동/A/B). 링크라서 새로고침·뒤로가기에도 유지된다 (F-12) */
export function PersonFilterLinks({ filters, currentMonth, names }: Props) {
  const options: { value: PersonFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "joint", label: "공동" },
    { value: "a", label: names.a ?? "A" },
    { value: "b", label: names.b ?? "B" },
  ];

  return (
    <nav aria-label="사람 필터" className="flex rounded-sm bg-surface-sunken p-1">
      {options.map((option) => {
        const active = filters.who === option.value;
        return (
          <Link
            key={option.value}
            href={filtersToHref(filters, currentMonth, { who: option.value, day: null })}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={`flex h-9 min-w-14 items-center justify-center rounded-[6px] px-3 text-body ${
              active ? "bg-surface-raised font-semibold text-ink" : "text-ink-muted"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
