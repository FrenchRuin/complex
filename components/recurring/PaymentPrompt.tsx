"use client";

import { useState, type FormEvent } from "react";
import { AmountInput } from "@/components/transactions/AmountInput";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { ModalDialog } from "@/components/ui/ModalDialog";
import type { DateString } from "@/lib/date";

type Props = {
  name: string | null;
  /** 금액 입력을 보여줄지 (매달 금액이 달라요) */
  askAmount: boolean;
  defaultAmount: number;
  /** 날짜 입력을 보여줄지 (매달 결제일도 달라요) */
  askDate: boolean;
  defaultDate: DateString;
  pending: boolean;
  error: string | null;
  onSubmit: (amount: number | null, occurredOn: DateString | null) => void;
  onClose: () => void;
};

/** "매달 금액이 달라요" · "매달 결제일도 달라요" 항목을 체크할 때 이번 달 값 입력 */
export function PaymentPrompt({
  name,
  askAmount,
  defaultAmount,
  askDate,
  defaultDate,
  pending,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [amount, setAmount] = useState<number | null>(defaultAmount);
  const [date, setDate] = useState<DateString>(defaultDate);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (askAmount && !(amount && amount > 0)) return;
    onSubmit(askAmount ? amount : null, askDate ? date : null);
  }

  return (
    <ModalDialog
      open={name !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={`${name ?? ""} 납부 기록`}
      description="이번 달에 낸 내용을 입력해 주세요."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {askAmount && <AmountInput id="recurring-amount" label="금액" value={amount} onChange={setAmount} autoFocus />}
        {askDate && <DatePicker label="날짜" value={date} onChange={setDate} />}
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error ?? (askAmount && !amount ? "금액을 입력해 주세요" : null)}
        </p>
        <Button type="submit" disabled={pending || (askAmount && !amount)} className="w-full">
          {pending ? "기록하는 중" : "납부 기록"}
        </Button>
      </form>
    </ModalDialog>
  );
}
