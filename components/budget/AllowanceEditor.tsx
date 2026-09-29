"use client";

import { useState, useTransition } from "react";
import { saveAllowances } from "@/app/(app)/budget/actions";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { AllowanceItem } from "@/lib/calc/budget";
import { SLOTS, ownerLabel, type MemberNames } from "@/lib/domain";
import { formatNumber, parseWon } from "@/lib/money";

type Props = {
  monthLabel: string;
  /** "yyyy-MM-01" */
  monthFirst: string;
  names: MemberNames;
  allowances: AllowanceItem[];
};

/** 사람별 이번 달 용돈 입력 (개인 지출 한도). 빈칸은 용돈 없음 */
export function AllowanceEditor({ monthLabel, monthFirst, names, allowances }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, number | null>>(
    Object.fromEntries(allowances.map((a) => [a.slot, a.amount])),
  );

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveAllowances(
        monthFirst,
        SLOTS.map((slot) => ({ slot, amount: values[slot] || null })),
      );
      if (result.error) return setError(result.error);
      toast("용돈을 저장했어요");
    });
  }

  return (
    <SettingsSection
      id="allowance"
      title={`${monthLabel} 용돈`}
      description="각자 한 달에 개인 지출로 쓸 금액이에요. 공동 지출은 들어가지 않아요. 빈칸은 용돈 없음이고, 다음 달에 자동으로 복사돼요."
    >
      <ul>
        {SLOTS.map((slot) => {
          const name = ownerLabel(slot, names);
          return (
            <li key={slot} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
              <label htmlFor={`allowance-${slot}`} className="min-w-0 flex-1 truncate text-body text-ink">
                {name} 용돈
              </label>
              <span className="flex h-10 w-40 items-center gap-1 rounded-sm bg-surface-sunken px-3">
                <input
                  id={`allowance-${slot}`}
                  inputMode="numeric"
                  placeholder="용돈 없음"
                  value={values[slot] ? formatNumber(values[slot] as number) : ""}
                  onChange={(e) => setValues((v) => ({ ...v, [slot]: parseWon(e.target.value) }))}
                  className="min-w-0 flex-1 bg-transparent text-right text-body text-ink tabular-nums outline-none placeholder:text-ink-muted"
                />
                <span className="text-body text-ink-muted">원</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p role="alert" className="min-h-[18px] text-caption text-danger">
        {error}
      </p>
      <Button onClick={save} pending={pending} className="w-full">
        {pending ? "저장하는 중" : "용돈 저장"}
      </Button>
    </SettingsSection>
  );
}
