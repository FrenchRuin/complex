"use client";

import { useState, type FormEvent } from "react";
import { AmountInput } from "@/components/transactions/AmountInput";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";

type Props = {
  name: string | null;
  defaultAmount: number;
  pending: boolean;
  error: string | null;
  onSubmit: (amount: number) => void;
  onClose: () => void;
};

/** "매달 금액이 달라요" 항목을 체크할 때 이번 달 금액 입력 (기본값은 지난달 금액) */
export function AmountPrompt({ name, defaultAmount, pending, error, onSubmit, onClose }: Props) {
  const [amount, setAmount] = useState<number | null>(defaultAmount);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (amount && amount > 0) onSubmit(amount);
  }

  return (
    <ModalDialog
      open={name !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={`${name ?? ""} 금액`}
      description="이번 달에 낸 금액을 입력해 주세요."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <AmountInput id="recurring-amount" value={amount} onChange={setAmount} autoFocus />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error ?? (amount ? null : "금액을 입력해 주세요")}
        </p>
        <Button type="submit" disabled={pending || !amount} className="w-full">
          {pending ? "기록하는 중" : "납부 기록"}
        </Button>
      </form>
    </ModalDialog>
  );
}
