"use client";

import { useState, useTransition } from "react";
import { saveSpendBudget } from "@/app/(app)/budget/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { PaymentMethodOption } from "@/lib/household-data";
import { formatNumber, parseWon } from "@/lib/money";

type Props = {
  /** 고칠 예산. 없으면 새로 추가 */
  budget?: { id: string; name: string; methodIds: readonly string[] };
  /** "yyyy-MM-01": 새로 만들 때 금액을 넣을 달 */
  monthFirst: string;
  paymentMethods: readonly PaymentMethodOption[];
  /** 결제수단 id → 들어 있는 예산 (이 예산 것은 빼고) */
  takenBy: Readonly<Record<string, string>>;
  names: MemberNames;
  onDone: () => void;
};

/** 통장·카드 예산 추가·수정 (F-21): 이름 + 셀 계좌·카드(공동·개인 모두, 한 결제수단은 한 예산에만) */
export function SpendBudgetForm({ budget, monthFirst, paymentMethods, takenBy, names, onDone }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(budget?.name ?? "");
  const [methodIds, setMethodIds] = useState<readonly string[]>(budget?.methodIds ?? []);
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, on: boolean) {
    setMethodIds((current) => (on ? [...current, id] : current.filter((m) => m !== id)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSpendBudget({ id: budget?.id, name, methodIds: [...methodIds], amount }, monthFirst);
      if (result.error) return setError(result.error);
      toast(budget ? "통장·카드 예산을 고쳤어요" : "통장·카드 예산을 추가했어요");
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm bg-surface p-3">
      <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="예: 생활비, 지훈 용돈" autoFocus />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-caption font-semibold text-ink-muted">셀 계좌·카드 (이 결제수단들로 쓴 돈을 합쳐요)</legend>
        {paymentMethods.map((m) => {
          const other = takenBy[m.id];
          return (
            <Checkbox key={m.id} checked={methodIds.includes(m.id)} disabled={Boolean(other)} onChange={(on) => toggle(m.id, on)}>
              <span className={other ? "text-ink-muted" : ""}>
                {m.name}
                <span className="ml-1 text-caption text-ink-muted">
                  {ownerLabel(m.owner, names)}
                  {other ? ` · '${other}'에 들어 있어요` : ""}
                </span>
              </span>
            </Checkbox>
          );
        })}
      </fieldset>
      {budget ? null : (
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-ink-muted">이번 달 금액 (선택)</span>
          <span className="flex h-12 items-center gap-1 rounded-sm bg-surface-sunken px-4">
            <input
              inputMode="numeric"
              placeholder="나중에 정해도 돼요"
              value={amount ? formatNumber(amount) : ""}
              onChange={(e) => setAmount(parseWon(e.target.value))}
              className="min-w-0 flex-1 bg-transparent text-right text-body text-ink tabular-nums outline-none placeholder:text-ink-muted"
            />
            <span className="text-body text-ink-muted">원</span>
          </span>
        </label>
      )}
      <p role="alert" className="text-caption text-danger empty:hidden">
        {error}
      </p>
      <div className="flex gap-2">
        <Button onClick={save} pending={pending} className="flex-1">
          {pending ? "저장하는 중" : "저장"}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={pending} className="flex-1">
          취소
        </Button>
      </div>
    </div>
  );
}
