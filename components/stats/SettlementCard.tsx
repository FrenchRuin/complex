"use client";

import { useState, useTransition } from "react";
import { recordSettlement } from "@/app/(app)/stats/actions";
import { PersonChip } from "@/components/ui/PersonChip";
import { useToast } from "@/components/ui/Toast";
import { paidShareA, settle, settlementSentence } from "@/lib/calc/settlement";
import { formatMonthDayKST } from "@/lib/date";
import type { Slot } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { SettlementOverview } from "@/lib/settlement";

type Props = { overview: SettlementOverview; names: Record<Slot, string> };

const dayLabel = (date: string) => formatMonthDayKST(`${date}T12:00:00+09:00`);

/** 공동 지출 정산 (F-24): 누가 얼마 냈는지, 반반이면 누가 누구에게 얼마, 정산 완료로 기록 */
export function SettlementCard({ overview, names }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const transfer = settle(overview.paidA, overview.paidB, overview.shareA);
  const shareA = paidShareA(overview.paidA, overview.paidB);
  const total = overview.paidA + overview.paidB;

  function record() {
    if (!confirming) return setConfirming(true);
    setConfirming(false);
    startTransition(async () => {
      const result = await recordSettlement();
      toast(result.error ?? "정산 완료로 기록했어요");
    });
  }

  return (
    <div>
      <p className="text-caption text-ink-muted">
        {overview.start ? `${dayLabel(overview.start)}부터` : "처음부터"} 오늘까지 공동 지출 {formatWon(total)}
      </p>

      <div
        className={`mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full ${total ? "" : "bg-surface-sunken"}`}
        role="img"
        aria-label={`결제 비율 ${names.a} ${shareA}%, ${names.b} ${total ? 100 - shareA : 0}%`}
      >
        {overview.paidA > 0 ? <span className="bg-member-a" style={{ width: `${shareA}%` }} /> : null}
        {overview.paidB > 0 ? <span className="flex-1 bg-member-b" /> : null}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {(["a", "b"] as const).map((slot) => (
          <li key={slot} className="flex items-center justify-between">
            <PersonChip owner={slot} label={names[slot]} />
            <span className="text-body text-ink tabular-nums">
              {formatWon(slot === "a" ? overview.paidA : overview.paidB)} 결제
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-heading text-ink tabular-nums">
        {settlementSentence(transfer, names, overview.shareA)}
      </p>

      <button
        type="button"
        onClick={record}
        onBlur={() => setConfirming(false)}
        disabled={pending || total === 0}
        className={`mt-4 h-12 w-full rounded-md text-body font-semibold disabled:opacity-50 ${
          confirming ? "bg-primary text-on-primary" : "border border-line-strong text-ink"
        }`}
      >
        {pending ? "기록하는 중" : confirming ? "한 번 더 누르면 기록돼요" : "정산 완료로 기록"}
      </button>
      <p className="mt-2 text-caption text-ink-muted">기록하면 내일부터 새로 계산해요.</p>

      {overview.history.length > 0 ? (
        <>
          <h3 className="mt-5 text-label text-ink-muted">지난 정산</h3>
          <ul className="mt-1">
            {overview.history.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-line py-2 text-body tabular-nums last:border-b-0">
                <span className="text-ink-muted">{dayLabel(s.periodEnd)}까지</span>
                <span className="text-ink">
                  {s.from && s.to ? `${names[s.from]} → ${names[s.to]} ${formatWon(s.amount)}` : "보낼 돈 없음"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
