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
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { DeleteTransactionButton } from "@/components/budget/delete-transaction-button";

type Category = { id: string; name: string; type: "income" | "expense" };
type Partner = { id: string; name: string; colorRole: "A" | "B" };

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
  partners,
}: {
  year: number;
  month: number;
  transactions: TransactionRow[];
  categories: Category[];
  partners: Partner[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState<"all" | "A" | "B">("all");

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (categoryFilter !== "all" && t.categoryId !== categoryFilter) return false;
      if (memberFilter !== "all" && t.authorColorRole !== memberFilter) return false;
      if (q) {
        const haystack = `${t.categoryName} ${t.memo ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, categoryFilter, memberFilter]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of filteredTransactions) {
      const entry = map.get(t.date) ?? { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
      map.set(t.date, entry);
    }
    return map;
  }, [filteredTransactions]);

  const monthTotals = useMemo(
    () =>
      filteredTransactions.reduce(
        (acc, t) => {
          if (t.type === "income") acc.income += t.amount;
          else acc.expense += t.amount;
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [filteredTransactions],
  );

  const monthAnchor = new Date(year, month - 1, 1);
  const gridStart = startOfWeek(startOfMonth(monthAnchor));
  const gridEnd = endOfWeek(endOfMonth(monthAnchor));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const visibleTransactions = selectedDate
    ? filteredTransactions.filter((t) => t.date === selectedDate)
    : filteredTransactions;

  const visibleTotals = useMemo(
    () =>
      visibleTransactions.reduce(
        (acc, t) => {
          if (t.type === "income") acc.income += t.amount;
          else acc.expense += t.amount;
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [visibleTransactions],
  );

  const categoryItems = { all: "전체", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[200px] flex-1 max-w-[300px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-ink-muted" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="거래 내용 검색"
            className="w-full rounded-[10px] border border-border bg-card py-2.5 pr-3 pl-9 text-[13.5px] text-foreground outline-none focus-visible:border-ring"
          />
        </label>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")} items={categoryItems}>
          <SelectTrigger className="h-auto rounded-[10px] border border-border bg-card px-3 py-2.5 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">카테고리: 전체</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {partners.length > 0 && (
          <div className="flex rounded-[10px] border border-border bg-secondary p-[3px]">
            <button
              type="button"
              onClick={() => setMemberFilter("all")}
              className={cn(
                "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                memberFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-ink-secondary",
              )}
            >
              전체
            </button>
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMemberFilter(p.colorRole)}
                className={cn(
                  "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  memberFilter === p.colorRole ? "bg-card text-foreground shadow-sm" : "text-ink-secondary",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
            <span className="size-2 rounded-sm bg-income" /> 수입
          </span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
            <span className="size-2 rounded-sm bg-expense" /> 지출
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-7 gap-2 pb-2.5">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "py-1 text-center text-xs font-bold",
                  i === 0 ? "text-expense" : i === 6 ? "text-income" : "text-ink-secondary",
                )}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, monthAnchor);
              const totals = dailyTotals.get(dateStr);
              const selected = selectedDate === dateStr;

              if (!inMonth) {
                return (
                  <div
                    key={dateStr}
                    className="min-h-[88px] rounded-xl border border-border/60 bg-card/60 p-2 opacity-45"
                  >
                    <span className="text-xs text-ink-muted">{format(day, "d")}</span>
                  </div>
                );
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate((prev) => (prev === dateStr ? null : dateStr))}
                  className={cn(
                    "flex min-h-[88px] flex-col items-start gap-0.5 rounded-xl border p-2 text-left transition-colors",
                    selected
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:border-ink-muted",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      selected ? "text-primary" : isToday(day) ? "text-primary" : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {totals?.income ? (
                    <span className="text-[11px] leading-tight font-semibold text-income tabular-nums">
                      +{compactKRW(totals.income)}
                    </span>
                  ) : null}
                  {totals?.expense ? (
                    <span className="text-[11px] leading-tight text-expense tabular-nums">
                      -{compactKRW(totals.expense)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-bold text-foreground">이번 달 요약</h2>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-secondary">수입</span>
              <span className="font-bold text-income tabular-nums">+₩{currency.format(monthTotals.income)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-secondary">지출</span>
              <span className="font-bold text-expense tabular-nums">-₩{currency.format(monthTotals.expense)}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground">합계</span>
              <span className="font-bold text-foreground tabular-nums">
                {monthTotals.income - monthTotals.expense >= 0 ? "+" : ""}₩
                {currency.format(monthTotals.income - monthTotals.expense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-bold text-foreground">
              {selectedDate ? format(new Date(selectedDate), "M월 d일") : "이번 달 전체"} 거래
            </h2>
            <span className="text-[12.5px] text-ink-secondary">
              {selectedDate ? "선택한 날짜의 거래 내역" : "이번 달 전체 거래 내역"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-ink-secondary">
              수입 <span className="font-bold text-income">+₩{currency.format(visibleTotals.income)}</span>
            </span>
            <span className="text-[13px] text-ink-secondary">
              지출 <span className="font-bold text-expense">-₩{currency.format(visibleTotals.expense)}</span>
            </span>
            {selectedDate && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                전체 보기
              </Button>
            )}
          </div>
        </div>

        {visibleTransactions.length === 0 && (
          <p className="py-4 text-sm text-ink-secondary">
            {selectedDate ? "이 날짜엔 조건에 맞는 거래가 없어요." : "조건에 맞는 거래가 없어요."}
          </p>
        )}

        <div className="flex flex-col">
          {visibleTransactions.map((t, i) => {
            const avatarClass = t.authorColorRole === "A" ? "bg-partner-a" : "bg-partner-b";
            return (
              <div
                key={t.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-3",
                  i > 0 && "border-t border-border",
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{t.categoryName}</span>
                    <Badge variant={t.type === "income" ? "default" : "secondary"}>
                      {t.type === "income" ? "수입" : "지출"}
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-ink-secondary">
                    {t.date}
                    {t.memo ? ` · ${t.memo}` : ""}
                    {t.authorName ? ` · ${t.authorName}` : ""}
                  </div>
                </div>
                {t.authorName && (
                  <div
                    className={cn(
                      "flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-primary-foreground",
                      avatarClass,
                    )}
                  >
                    {t.authorName.slice(0, 1)}
                  </div>
                )}
                <div
                  className={cn(
                    "w-[110px] shrink-0 text-right text-[14.5px] font-bold tabular-nums",
                    t.type === "income" ? "text-income" : "text-expense",
                  )}
                >
                  {t.type === "income" ? "+" : "-"}₩{currency.format(t.amount)}
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
    </div>
  );
}
