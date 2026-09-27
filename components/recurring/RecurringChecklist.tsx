"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { checkRecurring, uncheckRecurring } from "@/app/(app)/recurring/actions";
import { PersonChip } from "@/components/ui/PersonChip";
import { useToast } from "@/components/ui/Toast";
import { ownerOfTransaction } from "@/lib/calc/assignment";
import { statusLabel, summaryText, type RecurringStatus } from "@/lib/calc/recurring";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { MonthlyRecurring, RecurringOverview } from "@/lib/recurring";
import { AmountPrompt } from "./AmountPrompt";

type Props = {
  overview: Pick<RecurringOverview, "rows" | "summary">;
  names: MemberNames;
  paymentMethodNames: Record<string, string>;
};

const STATUS_STYLE: Record<RecurringStatus["kind"], string> = {
  paid: "text-primary",
  today: "font-semibold text-ink",
  overdue: "font-semibold text-ink",
  upcoming: "text-ink-muted",
};

/** 이번 달 정기지출 체크리스트 (F-31). 홈과 정기지출 화면에서 쓴다. */
export function RecurringChecklist({ overview, names, paymentMethodNames }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState<MonthlyRecurring | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  function check(row: MonthlyRecurring, amount: number | null) {
    startTransition(async () => {
      const result = await checkRecurring(row.item.id, amount);
      if (result.error) {
        if (prompt) setPromptError(result.error);
        else toast(result.error);
        return;
      }
      setPrompt(null);
      toast(`${row.item.name} 납부를 기록했어요`);
    });
  }

  function uncheck(row: MonthlyRecurring) {
    const paid = row.paidAmount;
    startTransition(async () => {
      const result = await uncheckRecurring(row.item.id);
      if (result.error) return toast(result.error);
      toast(`${row.item.name} 체크를 풀었어요`, {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          onClick: () => void checkRecurring(row.item.id, row.item.isVariable ? paid : null),
        },
      });
    });
  }

  function onToggle(row: MonthlyRecurring) {
    if (row.paidAmount !== null) return uncheck(row);
    if (row.item.isVariable) {
      setPromptError(null);
      return setPrompt(row);
    }
    check(row, null);
  }

  return (
    <div>
      <p className="text-caption text-ink-muted tabular-nums">{summaryText(overview.summary)}</p>
      <ul className="mt-2">
        {overview.rows.map((row) => {
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
                disabled={pending}
                onClick={() => onToggle(row)}
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-60 ${
                  paid ? "border-primary bg-primary text-on-primary" : "border-line-strong text-transparent"
                }`}
              >
                <Check size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{row.item.name}</span>
                <span className="block truncate text-caption text-ink-muted">
                  매월 {row.item.dayOfMonth}일{method ? ` · ${method}` : ""}
                  {row.item.isVariable && !paid ? " · 금액 매달 다름" : ""}
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
      <AmountPrompt
        key={prompt?.item.id ?? "none"}
        name={prompt?.item.name ?? null}
        defaultAmount={prompt?.expectedAmount ?? 0}
        pending={pending}
        error={promptError}
        onSubmit={(amount) => prompt && check(prompt, amount)}
        onClose={() => setPrompt(null)}
      />
    </div>
  );
}
