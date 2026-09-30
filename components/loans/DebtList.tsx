"use client";

import { useState, useTransition } from "react";
import { importDebtsFromAssets } from "@/app/(app)/loans/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { LoanRules } from "@/lib/calc/loan-rules";
import { DEBT_KIND_LABEL, existingAnnualRepayment, formatRateBp, needsDebtInfo, type HomeStatus } from "@/lib/calc/loans";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import type { DebtItem } from "@/lib/loans";
import { formatWon } from "@/lib/money";
import { DebtEditor } from "./DebtEditor";

type Props = { debts: DebtItem[]; importableCount: number; names: MemberNames; homeStatus: HomeStatus; rules: LoanRules };

/** 기존 대출 (F-43): 목록, 합계(잔액·DSR 기준 1년 상환액), 추가, 자산 메뉴에서 불러오기 */
export function DebtList({ debts, importableCount, names, homeStatus, rules }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState<DebtItem | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const annual = Math.round(existingAnnualRepayment(debts, homeStatus, rules));

  function importFromAssets() {
    startTransition(async () => {
      const result = await importDebtsFromAssets();
      if (result.error) return toast(result.error);
      toast(result.count ? `${result.count}개를 불러왔어요. 금리와 기간을 채워 주세요` : "새로 불러올 부채가 없어요");
    });
  }

  return (
    // 버튼 두 개 줄이 컨테이너 쿼리(@sm:)로 나란히/위아래를 고른다
    <div className="@container mt-4 flex flex-col gap-3">
      {debts.length === 0 ? (
        <p className="text-caption text-ink-muted">기존 대출이 없으면 비워 두세요.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="기존 대출 목록">
          {debts.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setEditing(d)}
                className="flex w-full items-start justify-between gap-3 rounded-sm bg-surface px-4 py-3 text-left hover:bg-surface-sunken"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body text-ink">{d.name}</span>
                  <span className="block text-caption text-ink-muted">
                    {DEBT_KIND_LABEL[d.kind]} · {ownerLabel(d.owner, names)} · {formatRateBp(d.rateBp)}
                  </span>
                  {needsDebtInfo(d) ? <span className="block text-caption text-danger">정보를 채워 주세요</span> : null}
                </span>
                <span className="shrink-0 text-body text-ink tabular-nums">{formatWon(d.balance)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {debts.length ? (
        <dl className="flex flex-col gap-1 border-t border-line pt-3 text-caption tabular-nums">
          <div className="flex justify-between">
            <dt className="text-ink-muted">잔액 합</dt>
            <dd className="text-ink">{formatWon(totalBalance)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">1년에 갚는 돈 (DSR 기준)</dt>
            <dd className="text-ink">{formatWon(annual)}</dd>
          </div>
        </dl>
      ) : null}
      <div className="flex flex-col gap-2 @sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={() => setEditing("new")}>
          기존 대출 추가
        </Button>
        <Button variant="secondary" className="flex-1" pending={pending} disabled={importableCount === 0} onClick={importFromAssets}>
          {pending ? "불러오는 중" : "자산 메뉴에서 불러오기"}
        </Button>
      </div>
      {editing ? <DebtEditor item={editing === "new" ? null : editing} names={names} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
