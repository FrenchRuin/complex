"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addAssetValue, deleteAssetValue } from "@/app/(app)/assets/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import type { AssetItem, AssetValue } from "@/lib/assets";
import { formatDayHeader, todayKST } from "@/lib/date";
import { formatWon } from "@/lib/money";

type Props = { item: AssetItem };

/** 금액 기록 (F-41): 언제 기준 얼마였는지 쌓아 두면 매달 추이를 계산한다 */
export function AssetValueHistory({ item }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayKST());
  const currentYear = Number(todayKST().slice(0, 4));
  const onlyOne = item.values.length <= 1;

  function add() {
    if (amount === null) return setError("금액을 입력해 주세요");
    setError(null);
    startTransition(async () => {
      const result = await addAssetValue(item.id, { amount, asOf: date });
      if (result.error) return setError(result.error);
      setAmount(null);
      toast("금액을 기록했어요");
    });
  }

  function remove(value: AssetValue) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAssetValue(value.id);
      if (result.error) return setError(result.error);
      toast(`${formatDayHeader(value.asOf, currentYear)} 기록을 지웠어요`, {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          onClick: () => void addAssetValue(item.id, { amount: value.amount, asOf: value.asOf }),
        },
      });
    });
  }

  return (
    <section aria-labelledby="asset-values-title" className="flex flex-col gap-3">
      <div>
        <h3 id="asset-values-title" className="text-label text-ink-muted">
          금액 기록
        </h3>
        <p className="mt-1 text-caption text-ink-muted">
          지난 날짜로 넣어도 돼요. 그 달 추이에 반영돼요. 같은 날짜로 넣으면 금액만 바뀌어요.
        </p>
      </div>
      <ul className="max-h-48 overflow-y-auto rounded-sm bg-surface-sunken px-3">
        {item.values.map((v) => (
          <li key={v.id} className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
            <span className="flex-1 text-caption text-ink-muted">{formatDayHeader(v.asOf, currentYear)}</span>
            <span className="text-body text-ink tabular-nums">{formatWon(v.amount)}</span>
            <button
              type="button"
              onClick={() => remove(v)}
              disabled={pending || onlyOne}
              aria-label={`${formatDayHeader(v.asOf, currentYear)} 기록 삭제`}
              title={onlyOne ? "금액 기록은 하나 이상 있어야 해요" : undefined}
              className="grid size-9 place-items-center rounded-sm text-ink-muted hover:text-danger disabled:opacity-40 disabled:hover:text-ink-muted"
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 rounded-sm border border-line p-3">
        <AmountInput id="asset-value-amount" label="새 금액" value={amount} onChange={setAmount} />
        <DatePicker label="기준일" value={date} onChange={setDate} />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <Button type="button" variant="secondary" onClick={add} pending={pending}>
          {pending ? "기록하는 중" : "금액 기록 추가"}
        </Button>
      </div>
    </section>
  );
}
