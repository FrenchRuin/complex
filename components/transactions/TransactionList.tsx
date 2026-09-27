"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PersonChip } from "@/components/ui/PersonChip";
import { ownerOfTransaction } from "@/lib/calc/assignment";
import type { DayGroup } from "@/lib/calc/group";
import { formatDayHeader } from "@/lib/date";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { LabelMaps, TransactionRecord } from "@/lib/transactions";
import { useTransactionPanel } from "./TransactionPanelProvider";

type Props = {
  groups: DayGroup<TransactionRecord>[];
  labels: LabelMaps;
  names: MemberNames;
  emptyMessage: string;
};

/** 날짜별로 묶은 내역 목록 (F-12). 행을 누르면 편집 패널이 열린다 (F-11) */
export function TransactionList({ groups, labels, names, emptyMessage }: Props) {
  const { openEdit } = useTransactionPanel();

  if (groups.length === 0) {
    return (
      <p className="rounded-md bg-surface-raised px-5 py-10 text-center text-body text-ink-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.date} aria-label={formatDayHeader(group.date)} className="rounded-md bg-surface-raised">
          <header className="flex items-baseline justify-between gap-2 border-b border-line px-5 py-3">
            <h2 className="text-caption font-semibold text-ink">{formatDayHeader(group.date)}</h2>
            <p className="text-caption text-ink-muted tabular-nums">
              {group.total.expense ? `지출 ${formatWon(group.total.expense)}` : null}
              {group.total.expense && group.total.income ? " · " : null}
              {group.total.income ? (
                <span className="text-primary">수입 +{formatWon(group.total.income)}</span>
              ) : null}
            </p>
          </header>
          <ul>
            {group.items.map((tx) => {
              const category = labels.categories[tx.categoryId];
              const method = tx.paymentMethodId ? labels.paymentMethods[tx.paymentMethodId] : null;
              const owner = ownerOfTransaction(tx.scope, tx.memberSlot);
              const title = tx.merchant ?? category?.name ?? "내역";
              return (
                <li key={tx.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openEdit(tx)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-sunken/60"
                  >
                    <CategoryIcon name={category?.icon ?? "circle-ellipsis"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-ink">{title}</span>
                      <span className="block truncate text-caption text-ink-muted">
                        {[category?.name, method, tx.memo].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`text-amount tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}
                      >
                        {tx.type === "income" ? "+" : ""}
                        {formatWon(tx.amount)}
                      </span>
                      <PersonChip owner={owner} label={ownerLabel(owner, names)} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
