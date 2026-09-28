"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { SCOPE_LABEL, SCOPES, SLOTS, ownerLabel, type MemberNames, type Scope, type Slot } from "@/lib/domain";
import type { CategoryOption, PaymentMethodOption } from "@/lib/household-data";
import { formatNumber, parseWon } from "@/lib/money";
import type { SmsRow } from "@/lib/sms/rows";

type Props = {
  row: SmsRow;
  index: number;
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
  names: MemberNames;
  onChange: (changes: Partial<SmsRow>) => void;
};

const field = "h-10 w-full rounded-sm bg-surface-sunken px-3 text-body text-ink";
const label = "flex flex-col gap-1 text-label text-ink-muted";

/** 인식한 문자 한 건: 선택 체크박스 + 고칠 수 있는 칸들 (F-15) */
export function SmsReviewRow({ row, index, categories, paymentMethods, names, onChange }: Props) {
  const usable = categories.filter((c) => c.type === row.type);

  return (
    <li className={`rounded-md border p-3 ${row.selected ? "border-primary" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={row.selected}
          onChange={(selected) => onChange({ selected })}
          ariaLabel={`${index + 1}번째 문자 저장하기`}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {row.duplicate ? <Badge tone="danger">이미 있는 내역 같아요</Badge> : null}
            {row.isCancel ? <Badge tone="danger">취소 문자 · 환불로 기록</Badge> : null}
            {row.cardHint ? <Badge tone="info">{`${row.cardHint} (추정) · 결제수단을 골라 주세요`}</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-caption text-ink-muted">{row.raw.replace(/\s+/g, " ")}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <DatePicker label="날짜" value={row.date} onChange={(date) => onChange({ date })} compact />
        <label className={label}>
          금액
          <input
            inputMode="numeric"
            value={formatNumber(row.amount)}
            onChange={(e) => onChange({ amount: parseWon(e.target.value) ?? 0 })}
            className={`${field} text-right tabular-nums`}
          />
        </label>
        <label className={`${label} col-span-2`}>
          가맹점
          <input value={row.merchant} maxLength={50} onChange={(e) => onChange({ merchant: e.target.value })} className={field} />
        </label>
        <Select
          compact
          label="카테고리"
          value={row.categoryId ?? ""}
          onChange={(v) => onChange({ categoryId: v || null })}
          placeholder="골라 주세요"
          options={usable.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          compact
          label="결제수단"
          value={row.paymentMethodId ?? ""}
          onChange={(v) => onChange({ paymentMethodId: v || null })}
          emptyLabel="선택 안 함"
          options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
        />
        <Select
          compact
          label="구분"
          value={row.scope}
          onChange={(v) => onChange({ scope: v as Scope })}
          options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
        />
        <Select
          compact
          label={row.scope === "joint" ? "누가 결제" : "누구의 지출"}
          value={row.memberSlot}
          onChange={(v) => onChange({ memberSlot: v as Slot })}
          options={SLOTS.map((s) => ({ value: s, label: ownerLabel(s, names) }))}
        />
      </div>
    </li>
  );
}

function Badge({ tone, children }: { tone: "danger" | "info"; children: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-label ${
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
      }`}
    >
      {children}
    </span>
  );
}
