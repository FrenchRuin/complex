"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveLoanDebt, setLoanDeleted } from "@/app/(app)/loans/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { AMORTIZING_KINDS, DEBT_KIND_LABEL, DEBT_KINDS, parseRateBp, type DebtKind } from "@/lib/calc/loans";
import { OWNERS, ownerLabel, type MemberNames, type Owner } from "@/lib/domain";
import type { DebtItem } from "@/lib/loans";

type Props = { item: DebtItem | null; names: MemberNames; onClose: () => void };

/** 기존 대출 추가·수정·삭제 (F-43). 마이너스통장은 잔액 대신 한도 */
export function DebtEditor({ item, names, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<DebtKind>(item?.kind ?? "credit");
  const [owner, setOwner] = useState<Owner>(item?.owner ?? "joint");
  const [balance, setBalance] = useState<number | null>(item?.balance ?? null);
  const [rate, setRate] = useState(item ? String(item.rateBp / 100) : "");
  const [monthsLeft, setMonthsLeft] = useState(item?.monthsLeft ? String(item.monthsLeft) : "");
  const [monthly, setMonthly] = useState<number | null>(item?.monthlyPayment ?? null);
  const amortizing = AMORTIZING_KINDS.includes(kind);

  function submit(e: FormEvent) {
    e.preventDefault();
    const rateBp = parseRateBp(rate);
    if (rateBp === null) return setError("금리를 숫자로 입력해 주세요 (예: 4.5)");
    const months = monthsLeft.trim() === "" ? null : Number(monthsLeft);
    if (months !== null && !Number.isInteger(months)) return setError("남은 기간은 개월 수로 입력해 주세요");
    setError(null);
    startTransition(async () => {
      const result = await saveLoanDebt({
        id: item?.id,
        name,
        kind,
        owner,
        balance: balance ?? 0,
        rateBp,
        monthsLeft: amortizing ? months : null,
        monthlyPayment: amortizing ? monthly : null,
      });
      if (result.error) return setError(result.error);
      toast("저장했어요");
      onClose();
    });
  }

  function remove() {
    if (!item) return;
    onClose();
    startTransition(async () => {
      const result = await setLoanDeleted("loan_debts", item.id, true);
      if (result.error) return toast(result.error);
      toast(`${item.name}을(를) 삭제했어요`, {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          // 지운 사이 같은 자산을 다시 불러왔으면 되돌리기가 막힌다 → 이유를 알려 준다
          onClick: () =>
            void setLoanDeleted("loan_debts", item.id, false).then((r) => {
              if (r.error) toast(r.error);
            }),
        },
      });
    });
  }

  return (
    <ModalDialog open onOpenChange={(o) => (o ? undefined : onClose())} title={item ? "기존 대출 수정" : "기존 대출 추가"}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="예: 신용대출, 자동차 할부" autoFocus={!item} />
        <Select
          id="debt-kind"
          label="종류"
          value={kind}
          onChange={(v) => setKind(v as DebtKind)}
          options={DEBT_KINDS.map((k) => ({ value: k, label: DEBT_KIND_LABEL[k] }))}
        />
        <SegmentedControl
          legend="소유"
          options={OWNERS.map((o) => ({ value: o, label: ownerLabel(o, names) }))}
          value={owner}
          onChange={setOwner}
          showLegend
        />
        <AmountInput id="debt-balance" label={kind === "overdraft" ? "한도" : "잔액"} value={balance} onChange={setBalance} />
        {kind === "overdraft" ? <p className="-mt-2 text-caption text-ink-muted">마이너스통장은 쓴 금액이 아니라 한도를 적어 주세요.</p> : null}
        <TextField label="금리 (%)" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="예: 4.5" />
        {amortizing ? (
          <>
            <TextField
              label="남은 기간 (개월, 선택)"
              value={monthsLeft}
              onChange={(e) => setMonthsLeft(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="예: 36"
            />
            <AmountInput id="debt-monthly" label="매달 내는 금액 (선택, 있으면 이 값을 먼저 써요)" value={monthly} onChange={setMonthly} />
          </>
        ) : null}
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <div className="flex gap-2">
          {item ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
          <Button type="submit" pending={pending} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
