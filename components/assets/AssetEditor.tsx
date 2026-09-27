"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveAsset, setDeleted } from "@/app/(app)/assets/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { AssetItem } from "@/lib/assets";
import { ASSET_KIND_LABEL, ASSET_KINDS, type AssetKind } from "@/lib/calc/assets";
import { OWNERS, ownerLabel, type MemberNames, type Owner } from "@/lib/domain";

type Props = { item: AssetItem | null; names: MemberNames; onClose: () => void };

/** 자산·부채 항목 추가·수정·삭제 (F-40) */
export function AssetEditor({ item, names, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<AssetKind>(item?.kind ?? "deposit");
  const [owner, setOwner] = useState<Owner>(item?.owner ?? "joint");
  const [amount, setAmount] = useState<number | null>(item?.amount ?? null);
  const [isLiability, setIsLiability] = useState(item?.isLiability ?? false);
  const [memo, setMemo] = useState(item?.memo ?? "");

  function changeKind(next: AssetKind) {
    setKind(next);
    // 대출을 고르면 부채, 다른 종류로 바꾸면 자산으로 기본값
    setIsLiability(next === "loan");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAsset({ id: item?.id, name, kind, owner, amount: amount ?? 0, isLiability, memo });
      if (result.error) return setError(result.error);
      toast("저장했어요");
      onClose();
    });
  }

  function remove() {
    if (!item) return;
    onClose();
    startTransition(async () => {
      const result = await setDeleted("assets", item.id, true);
      if (result.error) return toast(result.error);
      toast(`${item.name}을(를) 삭제했어요`, {
        durationMs: 5000,
        action: { label: "되돌리기", onClick: () => void setDeleted("assets", item.id, false) },
      });
    });
  }

  return (
    <ModalDialog open onOpenChange={(o) => (o ? undefined : onClose())} title={item ? "자산·부채 수정" : "자산·부채 추가"}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="예: 생활비 통장, 전세 보증금" autoFocus />
        <div className="flex flex-col gap-2">
          <label htmlFor="asset-kind" className="text-caption font-semibold text-ink-muted">
            종류
          </label>
          <select
            id="asset-kind"
            value={kind}
            onChange={(e) => changeKind(e.target.value as AssetKind)}
            className="h-12 rounded-sm bg-surface-sunken px-4 text-body text-ink"
          >
            {ASSET_KINDS.map((k) => (
              <option key={k} value={k}>
                {ASSET_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <SegmentedControl
          legend="소유"
          options={OWNERS.map((o) => ({ value: o, label: ownerLabel(o, names) }))}
          value={owner}
          onChange={setOwner}
          showLegend
        />
        <AmountInput id="asset-amount" label="금액 (지금 기준)" value={amount} onChange={setAmount} />
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={isLiability}
            onChange={(e) => setIsLiability(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          부채예요 (대출처럼 갚아야 하는 돈)
        </label>
        <TextField label="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} />
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <div className="flex gap-2">
          {item ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
