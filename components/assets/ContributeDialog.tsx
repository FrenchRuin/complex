"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addContribution } from "@/app/(app)/assets/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import type { GoalItem } from "@/lib/assets";
import { todayKST } from "@/lib/date";
import { SLOTS, type MemberNames, type Slot } from "@/lib/domain";

type Props = { goal: GoalItem; names: MemberNames; mySlot: Slot; onClose: () => void };

/** 적립: 금액·날짜·누가 (F-42). 가계부 지출 내역으로는 만들지 않는다 */
export function ContributeDialog({ goal, names, mySlot, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayKST());
  const [slot, setSlot] = useState<Slot>(mySlot);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addContribution({ goalId: goal.id, amount: amount ?? 0, contributedOn: date, memberSlot: slot });
      if (result.error) return setError(result.error);
      toast(`${goal.name}에 적립했어요`);
      onClose();
    });
  }

  return (
    <ModalDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title={`${goal.name} 적립`}
      description="목표에만 기록되고 가계부 지출에는 들어가지 않아요."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <AmountInput id="contribution-amount" label="적립 금액" value={amount} onChange={setAmount} autoFocus />
        <DatePicker label="날짜" value={date} onChange={setDate} />
        <SegmentedControl
          legend="누가"
          options={SLOTS.map((s) => ({ value: s, label: names[s] ?? s.toUpperCase() }))}
          value={slot}
          onChange={setSlot}
          showLegend
        />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "기록하는 중" : "적립하기"}
        </Button>
      </form>
    </ModalDialog>
  );
}
