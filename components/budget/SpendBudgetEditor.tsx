"use client";

import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { moveSpendBudget, saveSpendBudgetAmounts, setSpendBudgetDeleted } from "@/app/(app)/budget/actions";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import type { SpendBudgetInfo } from "@/lib/budget";
import type { MemberNames } from "@/lib/domain";
import type { PaymentMethodOption } from "@/lib/household-data";
import { formatNumber, formatWon, parseWon } from "@/lib/money";
import { SpendBudgetForm } from "./SpendBudgetForm";

type Props = {
  monthLabel: string;
  /** "yyyy-MM-01" */
  monthFirst: string;
  budgets: SpendBudgetInfo[];
  paymentMethods: PaymentMethodOption[];
  names: MemberNames;
};

/**
 * 통장·카드 예산 (F-21): 예산마다 이번 달 금액 입력(빈칸 = 이번 달 없음, 다음 달에 복사),
 * 이름·계좌·카드 고치기, 순서, 삭제(되돌리기), 새 예산 추가.
 */
export function SpendBudgetEditor({ monthLabel, monthFirst, budgets, paymentMethods, names }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [values, setValues] = useState<Record<string, number | null>>(
    Object.fromEntries(budgets.map((b) => [b.id, b.amount])),
  );
  const [error, setError] = useState<string | null>(null);
  const methodName = Object.fromEntries(paymentMethods.map((m) => [m.id, m.name]));

  /** 결제수단 → 들어 있는 예산 이름 (고치는 예산 것은 빼고) */
  const takenBy = (exceptId?: string) =>
    Object.fromEntries(budgets.filter((b) => b.id !== exceptId).flatMap((b) => b.methodIds.map((id) => [id, b.name])));

  function run(action: () => Promise<{ error: string | null }>, message?: string, undo?: () => Promise<unknown>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) return toast(result.error);
      if (message) toast(message, undo ? { action: { label: "되돌리기", onClick: () => void undo() } } : undefined);
    });
  }

  function saveAmounts() {
    setError(null);
    startTransition(async () => {
      const result = await saveSpendBudgetAmounts(
        monthFirst,
        budgets.map((b) => ({ budgetId: b.id, amount: values[b.id] || null })),
      );
      if (result.error) return setError(result.error);
      toast("통장·카드 예산 금액을 저장했어요");
    });
  }

  return (
    <SettingsSection
      id="spend-budgets"
      title={`${monthLabel} 통장·카드 예산`}
      description="생활비 통장, 용돈 카드처럼 계좌·카드로 쓴 돈에 한 달 예산을 정해요. 공동·개인 모두 되고, 빈칸은 이번 달 없음이에요. 다음 달에 자동으로 복사돼요."
    >
      {budgets.length === 0 ? (
        <p className="pb-2 text-body text-ink-muted">아직 통장·카드 예산이 없어요.</p>
      ) : (
        <ul>
          {budgets.map((b, index) =>
            editing === b.id ? (
              <li key={b.id} className="py-2">
                <SpendBudgetForm
                  budget={b}
                  monthFirst={monthFirst}
                  paymentMethods={paymentMethods}
                  takenBy={takenBy(b.id)}
                  names={names}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={b.id} className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <label htmlFor={`spend-${b.id}`} className="block truncate text-body text-ink">
                    {b.name}
                  </label>
                  <span className="block truncate text-caption text-ink-muted">
                    {b.methodIds.map((id) => methodName[id] ?? "숨긴 계좌·카드").join(", ")}
                  </span>
                </span>
                <span className="flex h-10 w-32 shrink-0 items-center gap-1 rounded-sm bg-surface-sunken px-3">
                  <input
                    id={`spend-${b.id}`}
                    inputMode="numeric"
                    placeholder="없음"
                    value={values[b.id] ? formatNumber(values[b.id] as number) : ""}
                    onChange={(e) => setValues((v) => ({ ...v, [b.id]: parseWon(e.target.value) }))}
                    className="min-w-0 flex-1 bg-transparent text-right text-body text-ink tabular-nums outline-none placeholder:text-ink-muted"
                  />
                  <span className="text-body text-ink-muted">원</span>
                </span>
                <span className="-mr-2 flex shrink-0 items-center">
                  <IconButton icon={ChevronUp} label={`${b.name} 위로`} size="sm" disabled={pending || index === 0} onClick={() => run(() => moveSpendBudget(b.id, "up"))} />
                  <IconButton
                    icon={ChevronDown}
                    label={`${b.name} 아래로`}
                    size="sm"
                    disabled={pending || index === budgets.length - 1}
                    onClick={() => run(() => moveSpendBudget(b.id, "down"))}
                  />
                  <IconButton icon={Pencil} label={`${b.name} 수정`} size="sm" disabled={pending} onClick={() => setEditing(b.id)} />
                  <IconButton
                    icon={Trash2}
                    label={`${b.name} 삭제`}
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => setSpendBudgetDeleted(b.id, true), `'${b.name}' 예산을 삭제했어요`, () => setSpendBudgetDeleted(b.id, false))
                    }
                  />
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      {budgets.length > 0 ? (
        <>
          <p className="mt-3 text-right text-body text-ink tabular-nums">
            합계 {formatWon(Object.values(values).reduce<number>((sum, v) => sum + (v ?? 0), 0))}
          </p>
          <p role="alert" className="min-h-[18px] text-caption text-danger">
            {error}
          </p>
          <Button onClick={saveAmounts} pending={pending} className="w-full">
            {pending ? "저장하는 중" : "금액 저장"}
          </Button>
        </>
      ) : null}

      <div className="mt-3">
        {editing === "new" ? (
          <SpendBudgetForm
            monthFirst={monthFirst}
            paymentMethods={paymentMethods}
            takenBy={takenBy()}
            names={names}
            onDone={() => setEditing(null)}
          />
        ) : (
          <Button variant="secondary" onClick={() => setEditing("new")} disabled={pending} className="w-full">
            <Plus size={20} strokeWidth={1.75} aria-hidden />
            통장·카드 예산 추가
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
