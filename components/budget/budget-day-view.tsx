"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { DeleteTransactionButton } from "@/components/budget/delete-transaction-button";

type Category = { id: string; name: string; type: "income" | "expense" };

type TransactionRow = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string; // yyyy-mm-dd
  memo: string | null;
  categoryId: string;
  categoryName: string;
  authorName: string | null;
  authorColorRole: "A" | "B" | null;
};

const currency = new Intl.NumberFormat("ko-KR");
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function compactKRW(amount: number) {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`;
  }
  return amount.toLocaleString("ko-KR");
}

export function BudgetDayView({
  year,
  month,
  transactions,
  categories,
}: {
  year: number;
  month: number;
  transactions: TransactionRow[];
  categories: Category[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const entry = map.get(t.date) ?? { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
      map.set(t.date, entry);
    }
    return map;
  }, [transactions]);

  const monthAnchor = new Date(year, month - 1, 1);
  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const gridEnd = endOfWeek(endOfMonth(monthAnchor));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const visibleTransactions = selectedDate
    ? transactions.filter((t) => t.date === selectedDate)
    : transactions;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((w) => (
            <div key={w} className="p-2 text-center text-xs text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, monthAnchor);
            const totals = dailyTotals.get(dateStr);
            const selected = selectedDate === dateStr;

            if (!inMonth) {
              return (
                <div key={dateStr} className="min-h-16 border-b border-r border-border p-1.5" />
              );
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate((prev) => (prev === dateStr ? null : dateStr))}
                className={cn(
                  "flex min-h-16 flex-col items-start gap-0.5 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent/60",
                  selected && "bg-accent ring-1 ring-inset ring-primary",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday(day) && "text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
                {totals?.income ? (
                  <span className="text-[10px] leading-tight text-foreground">
                    +{compactKRW(totals.income)}
                  </span>
                ) : null}
                {totals?.expense ? (
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    -{compactKRW(totals.expense)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {selectedDate
              ? `${format(new Date(selectedDate), "M월 d일")} 거래`
              : "이번 달 전체 거래"}
          </h2>
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
              전체 보기
            </Button>
          )}
        </div>

        {visibleTransactions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedDate ? "이 날짜엔 기록된 거래가 없어요." : "이번 달 기록된 거래가 없어요."}
          </p>
        )}

        {visibleTransactions.map((t) => {
          const colorClass = t.authorColorRole === "A" ? "border-partner-a" : "border-partner-b";
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border-l-4 bg-card py-2 pr-2 pl-3 ring-1 ring-foreground/10",
                colorClass,
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.categoryName}</span>
                  <Badge variant={t.type === "income" ? "default" : "secondary"}>
                    {t.type === "income" ? "수입" : "지출"}
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.date}
                  {t.memo ? ` · ${t.memo}` : ""}
                  {t.authorName ? ` · ${t.authorName}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium whitespace-nowrap">
                  {t.type === "income" ? "+" : "-"}
                  {currency.format(t.amount)}원
                </span>
                <TransactionFormDialog
                  categories={categories}
                  transaction={{
                    id: t.id,
                    type: t.type,
                    amount: t.amount,
                    date: t.date,
                    categoryId: t.categoryId,
                    memo: t.memo,
                  }}
                  trigger={
                    <Button variant="ghost" size="sm">
                      수정
                    </Button>
                  }
                />
                <DeleteTransactionButton transactionId={t.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
