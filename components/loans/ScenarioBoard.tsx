"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { LoanRules } from "@/lib/calc/loan-rules";
import { DEAL_LABEL, DEALS, type Deal } from "@/lib/calc/loans";
import type { DebtItem, LoanProfileData, ScenarioItem } from "@/lib/loans";
import { ScenarioCard } from "./ScenarioCard";
import { ScenarioEditor } from "./ScenarioEditor";

type Props = { scenarios: ScenarioItem[]; profile: LoanProfileData; debts: DebtItem[]; rules: LoanRules };

const BUY_NOTES = [
  "스트레스 금리는 변동금리 기준이에요. 고정·주기형 금리는 한도가 조금 더 나올 수 있어요.",
  "총대출이 1억 원 이하면 DSR이 적용되지 않아요.",
];

/** 집 후보 (F-43): 매매 / 전세 두 칸, 후보마다 상품별 결과 */
export function ScenarioBoard({ scenarios, profile, debts, rules }: Props) {
  const [deal, setDeal] = useState<Deal>("buy");
  const [editing, setEditing] = useState<ScenarioItem | "new" | null>(null);
  const list = scenarios.filter((s) => s.deal === deal);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <SegmentedControl legend="집 후보 종류" options={DEALS.map((d) => ({ value: d, label: DEAL_LABEL[d] }))} value={deal} onChange={setDeal} />
      {list.length === 0 ? (
        <p className="text-caption text-ink-muted">{DEAL_LABEL[deal]} 후보를 추가하면 상품별로 얼마까지 빌릴 수 있는지 보여 드려요.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={`${DEAL_LABEL[deal]} 후보 목록`}>
          {list.map((s) => (
            <ScenarioCard key={s.id} scenario={s} profile={profile} debts={debts} rules={rules} onEdit={() => setEditing(s)} />
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setEditing("new")} className="w-full">
        {DEAL_LABEL[deal]} 후보 추가
      </Button>
      {deal === "buy"
        ? BUY_NOTES.map((n) => (
            <p key={n} className="text-caption text-ink-muted">
              {n}
            </p>
          ))
        : null}
      {editing ? (
        <ScenarioEditor
          item={editing === "new" ? null : editing}
          deal={editing === "new" ? deal : editing.deal}
          rules={rules}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
