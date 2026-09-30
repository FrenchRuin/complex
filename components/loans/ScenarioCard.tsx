"use client";

import { Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import type { LoanRules } from "@/lib/calc/loan-rules";
import { bestProductIndex, evaluateScenario, PRODUCT_LABEL, REGION_LABEL, type ProductResult } from "@/lib/calc/loans";
import type { DebtItem, LoanProfileData, ScenarioItem } from "@/lib/loans";
import { formatWon } from "@/lib/money";

type Props = { scenario: ScenarioItem; profile: LoanProfileData; debts: DebtItem[]; rules: LoanRules; onEdit: () => void };

/** 집 후보 하나 + 상품별 결과 (F-43). 가능한 것 먼저, 가장 큰 금액에 표시. 결과는 저장하지 않고 그때그때 계산 */
export function ScenarioCard({ scenario, profile, debts, rules, onEdit }: Props) {
  const results = evaluateScenario(profile, debts, scenario, rules);
  const best = bestProductIndex(results);
  const ordered = results.map((r, i) => ({ r, best: i === best })).sort((a, b) => Number(b.r.eligible) - Number(a.r.eligible));

  return (
    <li className="rounded-sm bg-surface p-4" aria-label={scenario.name}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-heading text-ink">{scenario.name}</p>
          <p className="text-caption text-ink-muted tabular-nums">
            {formatWon(scenario.price)} · {REGION_LABEL[scenario.region]}
          </p>
        </div>
        <IconButton icon={Pencil} label={`${scenario.name} 수정`} size="sm" onClick={onEdit} />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {ordered.map(({ r, best: isBest }) => (
          <ProductRow key={r.product} result={r} best={isBest} />
        ))}
      </ul>
      {scenario.memo ? (
        <p className="mt-3 text-caption whitespace-pre-wrap text-ink-muted">
          <LinkifiedText text={scenario.memo} />
        </p>
      ) : null}
    </li>
  );
}

function ProductRow({ result: r, best }: { result: ProductResult; best: boolean }) {
  if (!r.eligible) {
    return (
      <li className="rounded-sm border border-line px-3 py-2 text-caption text-ink-muted">
        <span className="font-semibold">{PRODUCT_LABEL[r.product]}</span> · 불가: {r.reason}
      </li>
    );
  }
  return (
    <li className={`rounded-sm border px-3 py-2 ${best ? "border-primary bg-primary-soft" : "border-line bg-surface-raised"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-caption font-semibold text-ink">
          {PRODUCT_LABEL[r.product]}
          {best ? <span className="ml-2 text-primary">가장 많이 빌릴 수 있어요</span> : null}
        </span>
        <span className="text-amount text-ink tabular-nums">{formatWon(r.amount)}</span>
      </div>
      <p className="text-caption text-ink-muted">{r.limitedBy}</p>
      {/* 폰 폭에서도 금액이 잘리지 않게 한 줄에 이름·값 하나씩 */}
      <dl className="mt-1 flex flex-col gap-0.5 text-caption tabular-nums">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">한 달 {r.product === "bank_jeonse" || r.product === "butimok_newlywed" ? "이자" : "상환액"}</dt>
          <dd className="text-ink">{formatWon(r.monthly)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">필요한 현금</dt>
          <dd className="text-ink">{formatWon(r.cashNeeded)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-muted">대출 뒤 DSR</dt>
          <dd className="text-ink">{r.dsrAfter === null ? "-" : `${r.dsrAfter}%`}</dd>
        </div>
      </dl>
      {r.notes.map((note) => (
        <p key={note} className="mt-1 text-caption text-ink-muted">
          {note}
        </p>
      ))}
    </li>
  );
}
