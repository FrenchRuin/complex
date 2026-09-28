"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveGoal, setDeleted } from "@/app/(app)/assets/actions";
import { AmountInput } from "@/components/transactions/AmountInput";
import { DeleteButton } from "@/components/transactions/TransactionMeta";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { GoalItem } from "@/lib/assets";
import { addDays, todayKST } from "@/lib/date";

type Props = { goal: GoalItem | null; onClose: () => void };

/** 저축 목표 추가·수정·삭제 (F-42). 기한은 선택 */
export function GoalEditor({ goal, onClose }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState<number | null>(goal?.targetAmount ?? null);
  const [hasDue, setHasDue] = useState(Boolean(goal?.dueDate));
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? addDays(todayKST(), 180));

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveGoal({ id: goal?.id, name, targetAmount: target ?? 0, dueDate: hasDue ? dueDate : null });
      if (result.error) return setError(result.error);
      toast("저장했어요");
      onClose();
    });
  }

  function remove() {
    if (!goal) return;
    onClose();
    startTransition(async () => {
      const result = await setDeleted("goals", goal.id, true);
      if (result.error) return toast(result.error);
      toast(`${goal.name} 목표를 삭제했어요`, {
        durationMs: 5000,
        action: { label: "되돌리기", onClick: () => void setDeleted("goals", goal.id, false) },
      });
    });
  }

  return (
    <ModalDialog open onOpenChange={(o) => (o ? undefined : onClose())} title={goal ? "저축 목표 수정" : "저축 목표 추가"}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField label="목표 이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="예: 여름 여행, 비상금" autoFocus />
        <AmountInput id="goal-target" label="목표액" value={target} onChange={setTarget} />
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={hasDue}
            onChange={(e) => setHasDue(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          기한 정하기
        </label>
        {hasDue ? <DatePicker label="기한" value={dueDate} onChange={setDueDate} /> : null}
        <p role="alert" className="min-h-[18px] text-caption text-danger">
          {error}
        </p>
        <div className="flex gap-2">
          {goal ? <DeleteButton disabled={pending} onDelete={remove} /> : null}
          <Button type="submit" pending={pending} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
