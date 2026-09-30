"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveLoanProfile } from "@/app/(app)/loans/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { HOME_STATUS_LABEL, HOME_STATUSES, type HomeStatus } from "@/lib/calc/loans";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { LoanProfileData } from "@/lib/loans";
import { formatWon } from "@/lib/money";

type Props = { profile: LoanProfileData; names: MemberNames };

/**
 * 우리 정보 (F-43): 두 사람 연소득, 주택 보유, 생애최초. 순자산은 자산 메뉴 값(읽기 전용).
 * 상대가 고치면 화면이 새 값으로 다시 그려지도록 부르는 쪽에서 key={updatedAt}을 준다.
 */
export function LoanProfileForm({ profile, names }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [incomeA, setIncomeA] = useState<number | null>(profile.incomeA || null);
  const [incomeB, setIncomeB] = useState<number | null>(profile.incomeB || null);
  const [homeStatus, setHomeStatus] = useState<HomeStatus>(profile.homeStatus);
  const [firstTime, setFirstTime] = useState(profile.firstTime);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveLoanProfile({ incomeA: incomeA ?? 0, incomeB: incomeB ?? 0, homeStatus, firstTime });
      if (result.error) return setError(result.error);
      toast("저장했어요");
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate aria-label="우리 정보">
      <AmountInput id="loan-income-a" label={`${ownerLabel("a", names)} 연소득`} value={incomeA} onChange={setIncomeA} />
      <AmountInput id="loan-income-b" label={`${ownerLabel("b", names)} 연소득`} value={incomeB} onChange={setIncomeB} />
      <SegmentedControl
        legend="주택 보유"
        options={HOME_STATUSES.map((s) => ({ value: s, label: HOME_STATUS_LABEL[s] }))}
        value={homeStatus}
        onChange={setHomeStatus}
        showLegend
      />
      {homeStatus === "none" ? (
        <Checkbox checked={firstTime} onChange={setFirstTime}>
          생애최초 (두 사람 모두 집을 가진 적이 없어요)
        </Checkbox>
      ) : null}
      <div className="flex items-baseline justify-between gap-2 rounded-sm bg-surface px-4 py-3">
        <span className="min-w-0 text-caption text-ink-muted">순자산 (자산 메뉴 기준)</span>
        <span className="shrink-0 text-amount whitespace-nowrap text-ink tabular-nums">{formatWon(profile.netWorth)}</span>
      </div>
      <p role="alert" className="min-h-[18px] text-caption text-danger">
        {error}
      </p>
      <Button type="submit" pending={pending}>
        {pending ? "저장하는 중" : "저장"}
      </Button>
    </form>
  );
}
