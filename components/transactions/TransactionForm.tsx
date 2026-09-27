"use client";

import { useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import {
  deleteTransaction,
  restoreTransaction,
  saveTransaction,
} from "@/app/(app)/transactions/actions";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { defaultAssignment } from "@/lib/calc/assignment";
import { todayKST } from "@/lib/date";
import { CATEGORY_TYPE_LABEL, CATEGORY_TYPES, type CategoryType, type Scope, type Slot } from "@/lib/domain";
import { AmountInput } from "./AmountInput";
import { AssignmentFields } from "./AssignmentFields";
import { CategoryGrid } from "./CategoryGrid";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { AuthorLine, DeleteButton } from "./TransactionMeta";
import type { PanelData, TransactionRecord } from "./types";

const TYPE_OPTIONS = CATEGORY_TYPES.map((value) => ({ value, label: CATEGORY_TYPE_LABEL[value] }));

type Props = { record: TransactionRecord | null; data: PanelData; onDone: () => void };

export function TransactionForm({ record, data, onDone }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initial = record ?? null;
  const [type, setType] = useState<CategoryType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null);
  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? todayKST());
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(initial?.paymentMethodId ?? null);
  const firstAssignment = initial
    ? { scope: initial.scope, memberSlot: initial.memberSlot }
    : defaultAssignment(null, data.mySlot);
  const [scope, setScope] = useState<Scope>(firstAssignment.scope);
  const [memberSlot, setMemberSlot] = useState<Slot>(firstAssignment.memberSlot);
  const [keepOpen, setKeepOpen] = useState(false);

  const categories = data.categories.filter((c) => c.type === type);

  function changeType(next: CategoryType) {
    setType(next);
    if (!data.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId(null);
  }

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
      const result = await saveTransaction({
        id: record?.id,
        type,
        amount: amount ?? 0,
        occurredOn,
        categoryId: categoryId ?? "",
        merchant,
        memo,
        paymentMethodId,
        scope,
        memberSlot,
      });
      if (result.error) return setError(result.error);

      toast("저장했어요");
      if (keepOpen && !record) {
        setAmount(null);
        setMerchant("");
        setMemo("");
        setCategoryId(null);
        amountRef.current?.focus();
      } else {
        onDone();
      }
    });
  }

  function remove() {
    if (!record) return;
    startTransition(async () => {
      const result = await deleteTransaction(record.id);
      if (result.error) return setError(result.error);
      onDone();
      toast("삭제했어요", {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          onClick: () => {
            void restoreTransaction(record.id).then((r) =>
              toast(r.error ?? "되돌렸어요"),
            );
          },
        },
      });
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-2 pb-4">
        <SegmentedControl legend="유형" options={TYPE_OPTIONS} value={type} onChange={changeType} />
        <AmountInput ref={amountRef} value={amount} onChange={setAmount} />
        <TextField
          label="날짜"
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          required
        />
        <CategoryGrid categories={categories} value={categoryId} onChange={setCategoryId} />
        <TextField
          label="가맹점·내용 (선택)"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          maxLength={50}
        />
        <PaymentMethodSelect
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
        <TextField
          label="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={200}
        />
        {record ? <AuthorLine record={record} members={data.members} /> : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        {record ? null : (
          <label className="flex items-center gap-2 text-body text-ink">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
            계속 추가
          </label>
        )}
        <div className="flex gap-2">
          {record ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}
