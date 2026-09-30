"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveLoanScenario, setLoanDeleted } from "@/app/(app)/loans/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { LoanRules } from "@/lib/calc/loan-rules";
import { DEAL_LABEL, formatRateBp, parseRateBp, REGION_LABEL, REGIONS, type Deal, type Region } from "@/lib/calc/loans";
import type { ScenarioItem } from "@/lib/loans";

type Props = { item: ScenarioItem | null; deal: Deal; rules: LoanRules; onClose: () => void };

/** 집 후보 추가·수정·삭제 (F-43). 금리·만기를 비우면 기준값의 기본값 */
export function ScenarioEditor({ item, deal, rules, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState<number | null>(item?.price ?? null);
  const [region, setRegion] = useState<Region>(item?.region ?? "metro");
  const [rate, setRate] = useState(item && item.rateBp !== null ? String(item.rateBp / 100) : "");
  const [term, setTerm] = useState(item?.termYears ? String(item.termYears) : "");
  const [extra, setExtra] = useState<number | null>(item?.extraCosts || null);
  const [memo, setMemo] = useState(item?.memo ?? "");
  const defaultRate = deal === "buy" ? rules.defaults.buyRateBp : rules.defaults.jeonseRateBp;
  const title = `${DEAL_LABEL[deal]} 후보 ${item ? "수정" : "추가"}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    const rateBp = rate.trim() === "" ? null : parseRateBp(rate);
    if (rate.trim() !== "" && rateBp === null) return setError("금리를 숫자로 입력해 주세요 (예: 4.2)");
    setError(null);
    startTransition(async () => {
      const result = await saveLoanScenario({
        id: item?.id,
        name,
        deal,
        price: price ?? 0,
        region,
        rateBp,
        termYears: deal === "buy" && term !== "" ? Number(term) : null,
        extraCosts: extra ?? 0,
        memo,
      });
      if (result.error) return setError(result.error);
      toast("저장했어요");
      onClose();
    });
  }

  function remove() {
    if (!item) return;
    onClose();
    startTransition(async () => {
      const result = await setLoanDeleted("loan_scenarios", item.id, true);
      if (result.error) return toast(result.error);
      toast(`${item.name}을(를) 삭제했어요`, {
        durationMs: 5000,
        action: { label: "되돌리기", onClick: () => void setLoanDeleted("loan_scenarios", item.id, false) },
      });
    });
  }

  return (
    <ModalDialog open onOpenChange={(o) => (o ? undefined : onClose())} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="예: 마포 84㎡" autoFocus={!item} />
        <AmountInput id="scenario-price" label={deal === "buy" ? "집값" : "보증금"} value={price} onChange={setPrice} />
        <Select
          id="scenario-region"
          label="지역"
          value={region}
          onChange={(v) => setRegion(v as Region)}
          options={REGIONS.map((r) => ({ value: r, label: REGION_LABEL[r] }))}
        />
        <details className="-mt-2 text-caption text-ink-muted">
          <summary className="cursor-pointer">규제지역 목록</summary>
          <p className="mt-1">{rules.regulatedAreas.list}</p>
        </details>
        <TextField
          label="예상 금리 (%, 선택)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
          placeholder={`비우면 ${formatRateBp(defaultRate)}`}
        />
        {deal === "buy" ? (
          <TextField
            label="만기 (년, 선택)"
            value={term}
            onChange={(e) => setTerm(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder={`비우면 ${rules.defaults.termYears}년`}
          />
        ) : null}
        <AmountInput id="scenario-extra" label="기타 비용 (취득세·중개비 등, 선택)" value={extra} onChange={setExtra} />
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-ink-muted">메모 (선택)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="주소를 붙이면 링크가 돼요"
            className="resize-y rounded-sm bg-surface-sunken px-4 py-3 text-body text-ink placeholder:text-ink-muted"
          />
        </label>
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <div className="flex gap-2">
          {item ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
          <Button type="submit" pending={pending} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
