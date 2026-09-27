"use client";

import * as Popover from "@radix-ui/react-popover";
import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  activeFilterCount,
  filtersToHref,
  type TransactionFilters,
  type TypeFilter,
} from "@/lib/calc/filters";
import type { MonthString } from "@/lib/date";
import type { CategoryOption, PaymentMethodOption } from "@/lib/household-data";
import { CheckboxList } from "./CheckboxList";

type Props = {
  filters: TransactionFilters;
  currentMonth: MonthString;
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
};

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "expense", label: "지출" },
  { value: "income", label: "수입" },
];

const SEARCH_DEBOUNCE_MS = 300;

/** 검색(가맹점·메모, 이번 달) + 세부 필터(유형·카테고리·결제수단) (F-12) */
export function FilterBar({ filters, currentMonth, categories, paymentMethods }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = activeFilterCount(filters);

  const apply = (changes: Partial<TransactionFilters>) =>
    router.replace(filtersToHref(filters, currentMonth, { ...changes, day: null }), { scroll: false });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onSearchChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  const visibleCategories =
    filters.type === "all" ? categories : categories.filter((c) => c.type === filters.type);

  return (
    <div className="flex gap-2">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-sm bg-surface-raised px-3 text-ink-muted">
        <Search size={18} strokeWidth={1.75} aria-hidden />
        <span className="sr-only">가맹점·메모 검색</span>
        <input
          type="search"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="가맹점·메모 검색"
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
        />
      </label>

      <Popover.Root>
        <Popover.Trigger className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-surface-raised px-3 text-body text-ink">
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
          필터
          {count > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-label text-on-primary">
              {count}
            </span>
          ) : null}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 flex max-h-[70dvh] w-[320px] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto rounded-md bg-surface-raised p-4 shadow-float"
          >
            <SegmentedControl
              legend="유형"
              options={TYPE_OPTIONS}
              value={filters.type}
              onChange={(type) => apply({ type, categories: [] })}
              showLegend
            />
            <CheckboxList
              legend="카테고리"
              options={visibleCategories.map((c) => ({ value: c.id, label: c.name }))}
              selected={filters.categories}
              onChange={(categoriesSelected) => apply({ categories: categoriesSelected })}
            />
            <CheckboxList
              legend="결제수단"
              options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
              selected={filters.paymentMethods}
              onChange={(methods) => apply({ paymentMethods: methods })}
            />
            <button
              type="button"
              onClick={() => apply({ type: "all", categories: [], paymentMethods: [] })}
              disabled={count === 0}
              className="h-11 rounded-md border border-line-strong text-body font-semibold text-ink disabled:opacity-40"
            >
              필터 초기화
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
