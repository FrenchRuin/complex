import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionFormDialog } from "@/components/budget/transaction-form-dialog";
import { BudgetDayView } from "@/components/budget/budget-day-view";
import { MonthPicker } from "@/components/budget/month-picker";
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
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[28px] font-bold text-foreground md:text-[32px]">가계부</h1>
          <p className="text-[14.5px] text-ink-secondary">
            달력에서 날짜를 선택해 그날의 거래를 확인하고 관리하세요.
          </p>
        </div>
        <TransactionFormDialog
          categories={categories}
          trigger={<Button>거래 추가</Button>}
        />
      </div>

      <div className="flex items-center justify-center gap-1 self-center rounded-full border border-border bg-card px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/budget?month=${formatMonthParam(prevMonth.year, prevMonth.month)}`} />}
        >
          <ChevronLeft strokeWidth={2} />
        </Button>
        <MonthPicker year={year} month={month} />
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/budget?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`} />}
        >
          <ChevronRight strokeWidth={2} />
        </Button>
      </div>
      <p className="-mt-3 text-center text-[13px] text-ink-secondary">
        수입 {currency.format(totals.income)}원 · 지출 {currency.format(totals.expense)}원
      </p>

      {categories.length === 0 && (
        <p className="text-sm text-ink-secondary">
          카테고리가 아직 없어요.{" "}
          <Link href="/settings/categories" className="text-primary underline underline-offset-2">
            설정 · 카테고리
          </Link>
          에서 먼저 하나 추가해주세요.
        </p>
      )}

      <BudgetDayView
        year={year}
        month={month}
        transactions={rows}
        categories={categories}
        partners={profiles.map((p) => ({ id: p.id, name: p.name, colorRole: p.colorRole as "A" | "B" }))}
      />
    </div>
  );
}
