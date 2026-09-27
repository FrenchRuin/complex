"use client";

import { forwardRef } from "react";
import { formatNumber, parseWon } from "@/lib/money";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  label?: string;
  autoFocus?: boolean;
};

/** 금액 입력. 입력하는 동안 천 단위 쉼표를 붙이고, 숫자 키패드를 띄운다. */
export const AmountInput = forwardRef<HTMLInputElement, Props>(function AmountInput(
  { value, onChange, id = "tx-amount", label = "금액", autoFocus },
  ref,
) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption font-semibold text-ink-muted">
        {label}
      </label>
      <div className="flex h-14 items-center gap-1 rounded-sm bg-surface-sunken px-4">
        <input
          ref={ref}
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0"
          value={value === null ? "" : formatNumber(value)}
          onChange={(e) => onChange(parseWon(e.target.value))}
          className="min-w-0 flex-1 bg-transparent text-right text-[24px] leading-8 font-bold text-ink tabular-nums outline-none placeholder:text-ink-muted"
        />
        <span className="text-heading text-ink">원</span>
      </div>
    </div>
  );
});
