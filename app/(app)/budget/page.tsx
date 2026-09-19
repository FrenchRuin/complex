import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { BudgetDayView } from "@/components/budget/budget-day-view";
import { Button } from "@/components/ui/button";

function parseMonth(monthParam: string | undefined) {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatMonthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const currency = new Intl.NumberFormat("ko-KR");

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonth(monthParam);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const prevMonth = shiftMonth(year, month, -1);
  const nextMonth = shiftMonth(year, month, 1);

  const [rawCategories, transactions, profiles] = await Promise.all([
    prisma.category.findMany({
      where: { coupleId: profile.coupleId },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        coupleId: profile.coupleId,
        date: { gte: monthStart, lt: monthEnd },
      },
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.profile.findMany({ where: { coupleId: profile.coupleId } }),
  ]);

  // Category.type은 DB에 plain string으로 저장되지만 createCategory 액션이 "income"|"expense"만 쓰도록 보장함
  const categories = rawCategories.map((c) => ({
    ...c,
    type: (c.type === "income" ? "income" : "expense") as "income" | "expense",
  }));

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const rows = transactions.map((t) => {
    const author = profileById.get(t.createdById);
    return {
      id: t.id,
      type: t.type as "income" | "expense",
      amount: t.amount,
      date: toDateInputValue(t.date),
      memo: t.memo,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      authorName: author?.name ?? null,
      authorColorRole: (author?.colorRole as "A" | "B" | undefined) ?? null,
    };
  });

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-lg font-medium">가계부</h1>
        <TransactionFormDialog
          categories={categories}
          trigger={<Button size="sm">거래 추가</Button>}
        />
      </header>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/budget?month=${formatMonthParam(prevMonth.year, prevMonth.month)}`} />}
        >
          <ChevronLeft strokeWidth={1.5} />
        </Button>
        <div className="text-sm text-muted-foreground">
          {year}년 {month}월 · 수입 {currency.format(totals.income)}원 · 지출{" "}
          {currency.format(totals.expense)}원
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/budget?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`} />}
        >
          <ChevronRight strokeWidth={1.5} />
        </Button>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          카테고리가 아직 없어요.{" "}
          <Link href="/settings" className="text-primary underline underline-offset-2">
            설정
          </Link>
          에서 먼저 하나 추가해주세요.
        </p>
      )}

      <BudgetDayView year={year} month={month} transactions={rows} categories={categories} />
    </div>
  );
}
