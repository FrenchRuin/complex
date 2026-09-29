"use client";

import { useActionState, useState } from "react";
import { savePaymentMethod } from "@/app/(app)/settings/payment-method-actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { INITIAL, type ActionResult } from "@/lib/action-result";
import {
  OWNERS,
  PAYMENT_KIND_LABEL,
  PAYMENT_KINDS,
  ownerLabel,
  type MemberNames,
  type Owner,
  type PaymentKind,
} from "@/lib/domain";

export type PaymentMethodItem = {
  id: string;
  name: string;
  kind: PaymentKind;
  owner: Owner;
  sms_aliases: string[];
  sort_order: number;
  is_hidden: boolean;
};

type Props = {
  names: MemberNames;
  /** 수정할 결제수단. 없으면 새로 추가 */
  method?: PaymentMethodItem;
  onDone: () => void;
};

const KIND_OPTIONS = PAYMENT_KINDS.map((value) => ({ value, label: PAYMENT_KIND_LABEL[value] }));

/** 결제수단 추가·수정 폼: 이름, 종류, 소유, 문자 인식용 별칭. 예산은 예산 화면의 통장·카드 예산에서 */
export function PaymentMethodEditor({ names, method, onDone }: Props) {
  const [kind, setKind] = useState<PaymentKind>(method?.kind ?? "card");
  const [owner, setOwner] = useState<Owner>(method?.owner ?? "joint");
  const ownerOptions = OWNERS.map((value) => ({ value, label: ownerLabel(value, names) }));

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await savePaymentMethod(prev, formData);
      if (!result.error) onDone();
      return result;
    },
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-sm bg-surface p-3" noValidate>
      {method ? <input type="hidden" name="id" value={method.id} /> : null}
      <TextField
        label="이름"
        name="name"
        defaultValue={method?.name ?? ""}
        placeholder="예: 가족카드, 생활비 통장"
        maxLength={20}
        autoFocus
        required
      />
      <SegmentedControl
        legend="종류"
        name="kind"
        options={KIND_OPTIONS}
        value={kind}
        onChange={setKind}
        showLegend
      />
      <SegmentedControl
        legend="소유"
        name="owner"
        options={ownerOptions}
        value={owner}
        onChange={setOwner}
        showLegend
      />
      <TextField
        label="문자 인식용 별칭 (선택, 쉼표로 구분)"
        name="smsAliases"
        defaultValue={method?.sms_aliases.join(", ") ?? ""}
        placeholder="예: 신한, 신한카드"
      />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="flex-1">
          {pending ? "저장하는 중" : "저장"}
        </Button>
        <Button variant="secondary" onClick={onDone} className="flex-1">
          취소
        </Button>
      </div>
    </form>
  );
}
