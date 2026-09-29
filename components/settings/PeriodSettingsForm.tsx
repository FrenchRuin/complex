"use client";

import { useState, useTransition } from "react";
import { savePeriodSettings } from "@/app/(app)/settings/period-actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { PeriodLabel, PeriodSettings } from "@/lib/calc/period";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: i === 0 ? "1일 (달력의 한 달)" : `${i + 1}일`,
}));

const LABEL_OPTIONS = [
  { value: "end", label: "끝나는 달" },
  { value: "start", label: "시작하는 달" },
] as const;

/** 한 달 기준 설정 (F-56): 시작일, 주말·공휴일이면 앞 평일로, 이름 방식. 미리보기는 저장 후 아래 목록에 */
export function PeriodSettingsForm({ settings }: { settings: PeriodSettings }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [startDay, setStartDay] = useState(settings.startDay);
  const [label, setLabel] = useState<PeriodLabel>(settings.label);
  const [shift, setShift] = useState(settings.shift);
  const [error, setError] = useState<string | null>(null);
  const payday = startDay !== 1;
  // 이름 방식 예시: 25일이면 "9월 25일부터 시작하는 기간을 10월로"
  const example = `9월 ${startDay}일부터 시작하는 한 달을 ${label === "end" ? "10월" : "9월"}로 불러요`;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePeriodSettings({ startDay, label, shift });
      if (result.error) return setError(result.error);
      toast("한 달 기준을 저장했어요");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Select label="한 달 시작일 (월급날)" value={String(startDay)} onChange={(v) => setStartDay(Number(v))} options={DAY_OPTIONS} />
      {payday ? (
        <>
          <p className="text-caption text-ink-muted">
            한 달은 {startDay}일부터 다음 달 {startDay - 1}일까지예요. 종료일은 다음 달 시작일 전날로 자동으로 정해져요.
          </p>
          <div className="flex flex-col gap-1">
            <Checkbox checked={shift} onChange={setShift}>
              주말·공휴일이면 앞 평일부터 시작
            </Checkbox>
            <p className="pl-7 text-caption text-ink-muted">월급이 금요일에 먼저 들어오는 경우예요. 공휴일은 설정 → 공휴일을 따라요.</p>
          </div>
          <div className="flex flex-col gap-1">
            <SegmentedControl legend="달 이름" showLegend options={LABEL_OPTIONS} value={label} onChange={setLabel} />
            <p className="text-caption text-ink-muted">{example}</p>
          </div>
        </>
      ) : (
        <p className="text-caption text-ink-muted">1일이면 지금처럼 달력의 한 달(1일~말일)로 계산해요.</p>
      )}
      <p role="alert" className="text-caption text-danger empty:hidden">
        {error}
      </p>
      <Button onClick={save} pending={pending} className="w-full">
        {pending ? "저장하는 중" : "저장"}
      </Button>
    </div>
  );
}
