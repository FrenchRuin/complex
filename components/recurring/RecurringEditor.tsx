"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveRecurringItem } from "@/app/(app)/recurring/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { AssignmentFields } from "@/components/transactions/AssignmentFields";
import { PaymentMethodSelect } from "@/components/transactions/PaymentMethodSelect";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { defaultAssignment } from "@/lib/calc/assignment";
import type { MemberNames, Scope, Slot } from "@/lib/domain";
import type { CategoryOption, PaymentMethodOption } from "@/lib/household-data";
import type { RecurringItem } from "@/lib/recurring";

export type RecurringEditorData = {
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
  names: MemberNames;
  mySlot: Slot;
};

type Props = {
  open: boolean;
  /** 수정할 항목. 없으면 새로 등록 */
  item: RecurringItem | null;
  data: RecurringEditorData;
  onClose: () => void;
};

/** 정기지출 등록·수정 (F-30) */
export function RecurringEditor({ open, item, data, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const expenseCategories = data.categories.filter((c) => c.type === "expense");

  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState<number | null>(item?.amount ?? null);
  const [day, setDay] = useState(item ? String(item.dayOfMonth) : "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(item?.paymentMethodId ?? null);
  const first = item ?? defaultAssignment(null, data.mySlot);
  const [scope, setScope] = useState<Scope>(first.scope);
  const [memberSlot, setMemberSlot] = useState<Slot>(first.memberSlot);
  const [isVariable, setIsVariable] = useState(item?.isVariable ?? false);
  const [hasVariableDate, setHasVariableDate] = useState(item?.hasVariableDate ?? false);

  function changePaymentMethod(id: string | null) {
    setPaymentMethodId(id);
    const owner = data.paymentMethods.find((m) => m.id === id)?.owner ?? null;
    const next = defaultAssignment(owner, data.mySlot);
    setScope(next.scope);
    setMemberSlot(next.memberSlot);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveRecurringItem({
        id: item?.id,
        name,
        amount: amount ?? 0,
        dayOfMonth: day === "" ? 0 : Number(day),
        categoryId,
        paymentMethodId,
        scope,
        memberSlot,
        isVariable,
        hasVariableDate,
      });
      if (result.error) return setError(result.error);
      toast("저장했어요");
      onClose();
    });
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={item ? "정기지출 수정" : "정기지출 추가"}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="예: 관리비, 넷플릭스" autoFocus />
        <AmountInput
          id="recurring-editor-amount"
          label={isVariable ? "기본 금액 (매달 체크할 때 바꿀 수 있어요)" : "금액"}
          value={amount}
          onChange={setAmount}
        />
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={isVariable}
            onChange={(e) => setIsVariable(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          매달 금액이 달라요
        </label>
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={hasVariableDate}
            onChange={(e) => setHasVariableDate(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          매달 결제일도 달라요
        </label>
        <TextField
          label="매월 결제일 (1~31, 없는 날은 말일)"
          inputMode="numeric"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="recurring-category" className="text-caption font-semibold text-ink-muted">
            카테고리
          </label>
          <select
            id="recurring-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-12 rounded-sm bg-surface-sunken px-4 text-body text-ink"
          >
            <option value="">골라 주세요</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <PaymentMethodSelect
          id="recurring-payment-method"
          methods={data.paymentMethods}
          names={data.names}
          value={paymentMethodId}
          onChange={changePaymentMethod}
        />
        <AssignmentFields
          names={data.names}
          scope={scope}
          memberSlot={memberSlot}
          onScopeChange={setScope}
          onSlotChange={setMemberSlot}
        />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <Button type="submit" pending={pending} className="w-full">
          {pending ? "저장하는 중" : "저장"}
        </Button>
      </form>
    </ModalDialog>
  );
}
