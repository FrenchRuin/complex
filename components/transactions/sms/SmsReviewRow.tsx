"use client";

import { DatePicker } from "@/components/ui/DatePicker";
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
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          aria-label={`${index + 1}번째 문자 저장하기`}
          className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
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
        <label className={label}>
          카테고리
          <select value={row.categoryId ?? ""} onChange={(e) => onChange({ categoryId: e.target.value || null })} className={field}>
            <option value="">골라 주세요</option>
            {usable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          결제수단
          <select
            value={row.paymentMethodId ?? ""}
            onChange={(e) => onChange({ paymentMethodId: e.target.value || null })}
            className={field}
          >
            <option value="">선택 안 함</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          구분
          <select value={row.scope} onChange={(e) => onChange({ scope: e.target.value as Scope })} className={field}>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {row.scope === "joint" ? "누가 결제" : "누구의 지출"}
          <select value={row.memberSlot} onChange={(e) => onChange({ memberSlot: e.target.value as Slot })} className={field}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {ownerLabel(s, names)}
              </option>
            ))}
          </select>
        </label>
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
