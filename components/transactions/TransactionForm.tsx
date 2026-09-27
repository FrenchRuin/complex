"use client";

import { useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import {
  deleteTransaction,
  restoreTransaction,
  saveTransaction,
} from "@/app/(app)/transactions/actions";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { defaultAssignment } from "@/lib/calc/assignment";
import { suggestCategory } from "@/lib/calc/merchant";
import { todayKST } from "@/lib/date";
import { CATEGORY_TYPE_LABEL, CATEGORY_TYPES, type CategoryType, type Scope, type Slot } from "@/lib/domain";
import { AmountInput } from "./AmountInput";
import { AssignmentFields } from "./AssignmentFields";
import { CategoryGrid } from "./CategoryGrid";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { AuthorLine, FormFooter } from "./TransactionMeta";
import type { PanelData, TransactionRecord } from "./types";

const TYPE_OPTIONS = CATEGORY_TYPES.map((value) => ({ value, label: CATEGORY_TYPE_LABEL[value] }));

type Props = {
  record: TransactionRecord | null;
  data: PanelData;
  onDone: () => void;
  onLearn: (merchant: string, categoryId: string) => void;
};

export function TransactionForm({ record, data, onDone, onLearn }: Props) {
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
  // 직접 카테고리를 고르기 전까지는 가맹점을 보고 자동 추천한다 (F-16). 편집은 추천하지 않음
  const [categoryTouched, setCategoryTouched] = useState(Boolean(record));

  const categories = data.categories.filter((c) => c.type === type);
  const suggest = (text: string, forType: CategoryType) =>
    suggestCategory(text, forType, data.rules, data.categories);

  function changeType(next: CategoryType) {
    setType(next);
    if (!categoryTouched) setCategoryId(suggest(merchant, next));
    else if (!data.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId(null);
  }

  function changeMerchant(value: string) {
    setMerchant(value);
    if (!categoryTouched) setCategoryId(suggest(value, type));
  }

  function pickCategory(id: string) {
    setCategoryTouched(true);
    setCategoryId(id);
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
      if (categoryId) onLearn(merchant, categoryId);
      toast("저장했어요");
      if (keepOpen && !record) {
        setAmount(null);
        setMerchant("");
        setMemo("");
        setCategoryId(null);
        setCategoryTouched(false);
        amountRef.current?.focus();
      } else {
        onDone();
      }
    });
  }

  function remove() {
    if (!record) return;
    // 패널은 바로 닫고, 삭제는 뒤에서 한다 (실패하면 알림으로 알려준다)
    onDone();
    startTransition(async () => {
      const result = await deleteTransaction(record.id);
      if (result.error) return toast(result.error);
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
        <TextField
          label="가맹점·내용 (선택)"
          value={merchant}
          onChange={(e) => changeMerchant(e.target.value)}
          maxLength={50}
        />
        <CategoryGrid categories={categories} value={categoryId} onChange={pickCategory} />
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

      <FormFooter
        error={error}
        pending={pending}
        keepOpen={record ? null : keepOpen}
        onKeepOpenChange={setKeepOpen}
        onDelete={record ? remove : null}
      />
    </form>
  );
}
