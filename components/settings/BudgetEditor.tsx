"use client";

import { useState, useTransition } from "react";
import { saveBudgets } from "@/app/(app)/settings/budget-actions";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import type { BudgetItem } from "@/lib/calc/budget";
import type { CategoryOption } from "@/lib/household-data";
import { formatNumber, formatWon, parseWon } from "@/lib/money";
import { SettingsSection } from "./SettingsSection";

type Props = {
  monthLabel: string;
  /** "yyyy-MM-01" */
  monthFirst: string;
  categories: CategoryOption[];
  budgets: BudgetItem[];
};

/** 카테고리별 이번 달 예산 입력 (F-21). 빈칸은 예산 없음 */
export function BudgetEditor({ monthLabel, monthFirst, categories, budgets }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const expense = categories.filter((c) => c.type === "expense");
  const initial = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount]));
  const [values, setValues] = useState<Record<string, number | null>>(initial);
  const total = Object.values(values).reduce<number>((sum, v) => sum + (v ?? 0), 0);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveBudgets(
        monthFirst,
        expense.map((c) => ({ categoryId: c.id, amount: values[c.id] || null })),
      );
      if (result.error) return setError(result.error);
      toast("예산을 저장했어요");
    });
  }

  return (
    <SettingsSection
      id="budget"
      title={`${monthLabel} 예산`}
      description="카테고리별 한 달 예산이에요. 빈칸은 예산 없음이고, 다음 달에는 이번 달 예산이 자동으로 복사돼요."
    >
      <ul>
        {expense.map((c) => (
          <li key={c.id} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
            <CategoryIcon name={c.icon} size="sm" />
            <label htmlFor={`budget-${c.id}`} className="min-w-0 flex-1 truncate text-body text-ink">
              {c.name}
            </label>
            <span className="flex h-10 w-40 items-center gap-1 rounded-sm bg-surface-sunken px-3">
              <input
                id={`budget-${c.id}`}
                inputMode="numeric"
                placeholder="예산 없음"
                value={values[c.id] ? formatNumber(values[c.id] as number) : ""}
                onChange={(e) => setValues((v) => ({ ...v, [c.id]: parseWon(e.target.value) }))}
                className="min-w-0 flex-1 bg-transparent text-right text-body text-ink tabular-nums outline-none placeholder:text-ink-muted"
              />
              <span className="text-body text-ink-muted">원</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right text-body text-ink tabular-nums">합계 {formatWon(total)}</p>
      <p role="alert" className="min-h-[18px] text-caption text-danger">
        {error}
      </p>
      <Button onClick={save} pending={pending} className="w-full">
        {pending ? "저장하는 중" : "예산 저장"}
      </Button>
    </SettingsSection>
  );
}
