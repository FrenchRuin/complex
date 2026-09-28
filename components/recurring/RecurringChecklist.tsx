"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { checkRecurring, uncheckRecurring } from "@/app/(app)/recurring/actions";
import { PersonChip } from "@/components/ui/PersonChip";
import { useToast } from "@/components/ui/Toast";
import { ownerOfTransaction } from "@/lib/calc/assignment";
import {
  statusLabel,
  summarize,
  summaryText,
  withPaidAmount,
  type RecurringStatus,
} from "@/lib/calc/recurring";
import { todayKST } from "@/lib/date";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { MonthlyRecurring, RecurringOverview } from "@/lib/recurring";
import { PaymentPrompt } from "./PaymentPrompt";

type Props = {
  overview: Pick<RecurringOverview, "rows">;
  names: MemberNames;
  paymentMethodNames: Record<string, string>;
};

const STATUS_STYLE: Record<RecurringStatus["kind"], string> = {
  paid: "text-primary",
  today: "font-semibold text-ink",
  overdue: "font-semibold text-ink",
  upcoming: "text-ink-muted",
};

type Change = { id: string; paidAmount: number | null };

/**
 * 이번 달 정기지출 체크리스트 (F-31). 홈과 정기지출 화면에서 쓴다.
 * 누르는 즉시 화면에 먼저 반영하고(낙관적 업데이트), 저장이 실패하면 원래대로 돌아간다.
 */
export function RecurringChecklist({ overview, names, paymentMethodNames }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [prompt, setPrompt] = useState<MonthlyRecurring | null>(null);
  const [rows, applyChange] = useOptimistic(overview.rows, (current: MonthlyRecurring[], change: Change) =>
    current.map((r) => (r.item.id === change.id ? withPaidAmount(r, change.paidAmount, todayKST()) : r)),
  );

  function check(row: MonthlyRecurring, amount: number | null, occurredOn: string | null) {
    setPrompt(null);
    startTransition(async () => {
      applyChange({ id: row.item.id, paidAmount: amount ?? row.expectedAmount });
      const result = await checkRecurring(row.item.id, amount, occurredOn);
      toast(result.error ?? `${row.item.name} 납부를 기록했어요`);
    });
  }

  function uncheck(row: MonthlyRecurring) {
    const paid = row.paidAmount;
    startTransition(async () => {
      applyChange({ id: row.item.id, paidAmount: null });
      const result = await uncheckRecurring(row.item.id);
      if (result.error) return toast(result.error);
      toast(`${row.item.name} 체크를 풀었어요`, {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          onClick: () => check({ ...row, paidAmount: null }, row.item.isVariable ? paid : null, null),
        },
      });
    });
  }

  function onToggle(row: MonthlyRecurring) {
    if (row.paidAmount !== null) return uncheck(row);
    if (row.item.isVariable || row.item.hasVariableDate) return setPrompt(row);
    check(row, null, null);
  }

  return (
    <div>
      <p className="text-caption text-ink-muted tabular-nums">{summaryText(summarize(rows))}</p>
      <ul className="mt-2">
        {rows.map((row) => {
          const paid = row.paidAmount !== null;
          const owner = ownerOfTransaction(row.item.scope, row.item.memberSlot);
          const method = row.item.paymentMethodId ? paymentMethodNames[row.item.paymentMethodId] : null;
          return (
            <li key={row.item.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={paid}
                aria-label={`${row.item.name} 납부 ${paid ? "완료" : "안 함"}`}
                onClick={() => onToggle(row)}
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                  paid
                    ? "border-primary bg-primary text-on-primary hover:bg-primary/90"
                    : "border-line-strong text-transparent hover:border-primary"
                }`}
              >
                <Check size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{row.item.name}</span>
                <span className="block truncate text-caption text-ink-muted">
                  매월 {row.item.dayOfMonth}일{method ? ` · ${method}` : ""}
                  {row.item.isVariable && !paid ? " · 금액 매달 다름" : ""}
                  {row.item.hasVariableDate && !paid ? " · 날짜 매달 다름" : ""}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-amount text-expense tabular-nums">
                  {formatWon(row.paidAmount ?? row.expectedAmount)}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`text-caption ${STATUS_STYLE[row.status.kind]}`}>{statusLabel(row.status)}</span>
                  <PersonChip owner={owner} label={ownerLabel(owner, names)} />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <PaymentPrompt
        key={prompt?.item.id ?? "none"}
        name={prompt?.item.name ?? null}
        askAmount={prompt?.item.isVariable ?? false}
        defaultAmount={prompt?.expectedAmount ?? 0}
        askDate={prompt?.item.hasVariableDate ?? false}
        defaultDate={prompt?.due ?? todayKST()}
        pending={false}
        error={null}
        onSubmit={(amount, occurredOn) => prompt && check(prompt, amount, occurredOn)}
        onClose={() => setPrompt(null)}
      />
    </div>
  );
}
