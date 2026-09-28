"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { setDeleted, setGoalDone } from "@/app/(app)/assets/actions";
import { useActionRunner } from "@/components/settings/useActionRunner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { GoalItem } from "@/lib/assets";
import { goalHint, goalProgress } from "@/lib/calc/assets";
import { formatDayHeader, todayKST } from "@/lib/date";
import type { MemberNames, Slot } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { ContributeDialog } from "./ContributeDialog";
import { GoalEditor } from "./GoalEditor";

type Props = { goals: GoalItem[]; names: MemberNames; mySlot: Slot };
type Dialog = { kind: "edit"; goal: GoalItem | null } | { kind: "contribute"; goal: GoalItem } | null;

/** 저축 목표 목록 (F-42): 진행률, 월 필요 금액, 적립, 달성 표시, 적립 기록 */
export function GoalList({ goals, names, mySlot }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { pending, error, run } = useActionRunner();
  const today = todayKST();
  const year = Number(today.slice(0, 4));
  const active = goals.filter((g) => !g.isDone);
  const done = goals.filter((g) => g.isDone);

  const card = (g: GoalItem) => {
    const p = goalProgress(g.targetAmount, g.saved, g.dueDate, today);
    return (
      <li key={g.id} className="rounded-sm bg-surface p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className={`truncate text-heading ${g.isDone ? "text-ink-muted" : "text-ink"}`}>{g.name}</p>
            <p className="text-caption text-ink-muted">{g.dueDate ? `${formatDayHeader(g.dueDate, year)}까지` : "기한 없음"}</p>
          </div>
          <IconButton icon={Pencil} label={`${g.name} 수정`} size="sm" onClick={() => setDialog({ kind: "edit", goal: g })} />
        </div>
        <p className="mt-2 text-amount text-ink tabular-nums">
          {formatWon(g.saved)}
          <span className="text-body text-ink-muted"> / {formatWon(g.targetAmount)}</span>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label={`${g.name} 진행률`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p.percent}
            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${p.percent}%` }} />
          </div>
          <span className="w-10 text-right text-caption text-ink-muted tabular-nums">{p.percent}%</span>
        </div>
        {g.isDone ? null : <p className="mt-1 text-caption text-ink-muted tabular-nums">{goalHint(p, g.dueDate)}</p>}
        <div className="mt-3 flex gap-2">
          {g.isDone ? null : (
            <Button onClick={() => setDialog({ kind: "contribute", goal: g })} className="h-10 flex-1">
              적립
            </Button>
          )}
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setGoalDone(g.id, !g.isDone))} className="h-10 flex-1">
            {g.isDone ? "다시 모으기" : "달성으로 표시"}
          </Button>
        </div>
        {g.contributions.length ? (
          <details className="mt-3">
            <summary className="text-caption text-ink-muted hover:text-ink">적립 기록 {g.contributions.length}건</summary>
            <ul className="mt-1">
              {g.contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 border-b border-line py-1 text-caption tabular-nums last:border-b-0">
                  <span className="text-ink-muted">
                    {formatDayHeader(c.contributedOn, year)} · {names[c.memberSlot] ?? c.memberSlot.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2 text-ink">
                    {formatWon(c.amount)}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setDeleted("goal_contributions", c.id, true))}
                      className="rounded-sm px-1 text-danger underline-offset-2 hover:underline"
                    >
                      삭제
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 && done.length === 0 ? (
        <p className="py-4 text-center text-body text-ink-muted">여행, 비상금처럼 함께 모을 목표를 만들어 보세요.</p>
      ) : null}
      <ul className="flex flex-col gap-3">{active.map(card)}</ul>
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      <Button variant="secondary" onClick={() => setDialog({ kind: "edit", goal: null })} className="w-full">
        <Plus size={20} strokeWidth={1.75} aria-hidden />
        저축 목표 추가
      </Button>
      {done.length ? (
        <details>
          <summary className="text-label text-ink-muted hover:text-ink">달성한 목표 {done.length}개</summary>
          <ul className="mt-2 flex flex-col gap-3">{done.map(card)}</ul>
        </details>
      ) : null}
      {dialog?.kind === "edit" ? (
        <GoalEditor key={dialog.goal?.id ?? "new"} goal={dialog.goal} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "contribute" ? (
        <ContributeDialog goal={dialog.goal} names={names} mySlot={mySlot} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
