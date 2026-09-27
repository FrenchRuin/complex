"use client";

import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { PaymentMethodOption } from "@/lib/household-data";

type Props = {
  methods: PaymentMethodOption[];
  names: MemberNames;
  value: string | null;
  onChange: (id: string | null) => void;
};

/** 결제수단 고르기 (선택). 고르면 구분·사람 기본값이 바뀐다. */
export function PaymentMethodSelect({ methods, names, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tx-payment-method" className="text-caption font-semibold text-ink-muted">
        결제수단 (선택)
      </label>
      <select
        id="tx-payment-method"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="h-12 rounded-sm bg-surface-sunken px-4 text-body text-ink"
      >
        <option value="">선택 안 함</option>
        {methods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {ownerLabel(m.owner, names)}
          </option>
        ))}
      </select>
    </div>
  );
}
