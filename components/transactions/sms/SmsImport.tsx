"use client";

import { useState, useTransition } from "react";
import { findSmsDuplicates, saveSmsTransactions } from "@/app/(app)/transactions/sms-actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { todayKST } from "@/lib/date";
import { defaultAssignment } from "@/lib/calc/assignment";
import { parseSmsText } from "@/lib/sms/parse";
import { buildSmsRows, markDuplicates, type SmsRow } from "@/lib/sms/rows";
import type { PanelData } from "../types";
import { SmsReviewRow } from "./SmsReviewRow";

type Props = {
  data: PanelData;
  onDone: () => void;
  onLearn: (merchant: string, categoryId: string) => void;
};

/** 문자로 추가 (F-15): 붙여넣기 → 인식하기 → 미리보기에서 고르고 고치기 → N건 저장 */
export function SmsImport({ data, onDone, onLearn }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<SmsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;

  function recognize() {
    setError(null);
    const parsed = parseSmsText(text, todayKST());
    if (parsed.length === 0) return setError("금액이 있는 문자를 찾지 못했어요. 카드·은행 알림 문자를 붙여넣어 주세요");
    const built = buildSmsRows(parsed, { ...data, methods: data.paymentMethods });
    setRows(built);
    startTransition(async () => {
      const duplicates = await findSmsDuplicates(built.map((r) => ({ date: r.date, amount: r.amount, merchant: r.merchant || null })));
      setRows((current) => (current ? markDuplicates(current, duplicates) : current));
    });
  }

  function update(key: string, changes: Partial<SmsRow>) {
    setRows((current) =>
      (current ?? []).map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...changes };
        // 결제수단을 바꾸면 구분·사람 기본값도 따라 바꾼다
        if ("paymentMethodId" in changes) {
          const owner = data.paymentMethods.find((m) => m.id === changes.paymentMethodId)?.owner ?? null;
          Object.assign(next, defaultAssignment(owner, data.mySlot), { cardHint: changes.paymentMethodId ? null : row.cardHint });
        }
        return next;
      }),
    );
  }

  function save() {
    const selected = (rows ?? []).filter((r) => r.selected);
    setError(null);
    startTransition(async () => {
      const result = await saveSmsTransactions(
        selected.map((r) => ({
          type: r.type,
          amount: r.amount,
          occurredOn: r.date,
          occurredTime: r.time,
          categoryId: r.categoryId ?? "",
          merchant: r.merchant,
          memo: "",
          paymentMethodId: r.paymentMethodId,
          scope: r.scope,
          memberSlot: r.memberSlot,
        })),
      );
      if (result.error) return setError(result.error);
      for (const r of selected) if (r.categoryId) onLearn(r.merchant, r.categoryId);
      toast(`${result.count}건 저장했어요`);
      onDone();
    });
  }

  if (!rows) {
    return (
      <div className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <label htmlFor="sms-text" className="text-caption font-semibold text-ink-muted">
          카드·은행 알림 문자를 여러 건 한 번에 붙여넣어 주세요
        </label>
        <textarea
          id="sms-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"[Web발신]\n신한카드(1234)승인 김*수 12,000원(일시불)09/27 14:35 다이소 강남점"}
          className="min-h-48 flex-1 rounded-sm bg-surface-sunken p-3 text-body text-ink placeholder:text-ink-muted"
        />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <Button onClick={recognize} disabled={text.trim() === ""} className="w-full">
          인식하기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-4" aria-label="인식한 문자">
        {rows.map((row, index) => (
          <SmsReviewRow
            key={row.key}
            row={row}
            index={index}
            categories={data.categories}
            paymentMethods={data.paymentMethods}
            names={data.names}
            onChange={(changes) => update(row.key, changes)}
          />
        ))}
      </ul>
      <div className="flex flex-col gap-3 border-t border-line px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRows(null)} disabled={pending}>
            다시 붙여넣기
          </Button>
          <Button onClick={save} disabled={pending || selectedCount === 0} className="flex-1">
            {pending ? "저장하는 중" : `${selectedCount}건 저장`}
          </Button>
        </div>
      </div>
    </div>
  );
}
