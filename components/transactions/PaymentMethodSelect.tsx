"use client";

import { Select } from "@/components/ui/Select";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { PaymentMethodOption } from "@/lib/household-data";

type Props = {
  methods: PaymentMethodOption[];
  names: MemberNames;
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
};

/** 결제수단 고르기 (선택). 고르면 구분·사람 기본값이 바뀐다. */
export function PaymentMethodSelect({ methods, names, value, onChange, id = "tx-payment-method" }: Props) {
  return (
    <Select
      id={id}
      label="결제수단 (선택)"
      value={value ?? ""}
      onChange={(v) => onChange(v === "" ? null : v)}
      emptyLabel="선택 안 함"
      options={methods.map((m) => ({ value: m.id, label: `${m.name} · ${ownerLabel(m.owner, names)}` }))}
    />
  );
}
