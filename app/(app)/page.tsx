import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseBreakdown } from "@/components/home/expense-breakdown";
import { TrendChart, type TrendPoint } from "@/components/home/trend-chart";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const currency = new Intl.NumberFormat("ko-KR");
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof ArrowUpRight;
  tone: "income" | "expense" | "neutral";
  label: string;
  value: string;
}) {
  const toneClass =
    tone === "income"
      ? "bg-income-soft text-income"
      : tone === "expense"
        ? "bg-expense-soft text-expense"
        : "bg-accent text-primary";
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`flex size-[38px] items-center justify-center rounded-[11px] ${toneClass}`}>
        <Icon className="size-[19px]" strokeWidth={2} />
      </div>
      <div>
        <div className="mb-1.5 text-[13px] text-ink-secondary">{label}</div>
        <div className="font-heading text-[22px] font-bold text-foreground tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { profile } = await getSessionProfile();

  let income = 0;
  let expense = 0;
  let expenseByCategory: { name: string; amount: number }[] = [];
  let recentTransactions: {
    id: string;
    type: string;
    amount: number;
    memo: string | null;
    date: Date;
    categoryName: string;
    authorName: string | null;
  }[] = [];
  let trendPoints: TrendPoint[] = [];

  if (profile?.coupleId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthTransactions, recent, trendTransactions, profiles] = await Promise.all([
      prisma.transaction.findMany({
        where: { coupleId: profile.coupleId, date: { gte: monthStart, lt: monthEnd } },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: { coupleId: profile.coupleId },
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.transaction.findMany({
        where: { coupleId: profile.coupleId, date: { gte: trendStart, lt: monthEnd } },
      }),
      prisma.profile.findMany({ where: { coupleId: profile.coupleId } }),
    ]);

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    recentTransactions = recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      memo: t.memo,
      date: t.date,
      categoryName: t.category.name,
      authorName: profileById.get(t.createdById)?.name ?? null,
    }));

    const categoryTotals = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
        categoryTotals.set(
          t.category.name,
          (categoryTotals.get(t.category.name) ?? 0) + t.amount,
        );
      }
    }
    expenseByCategory = Array.from(categoryTotals, ([name, amount]) => ({ name, amount }));

    const monthly = new Map<string, { income: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.set(`${d.getFullYear()}-${d.getMonth()}`, { income: 0, expense: 0 });
    }
    for (const t of trendTransactions) {
      const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
      const entry = monthly.get(key);
      if (!entry) continue;
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
    }
    trendPoints = Array.from(monthly.entries()).map(([key, totals]) => {
      const month = Number(key.split("-")[1]);
      return { label: MONTH_LABELS[month], ...totals };
    });
  }

  return (
    <div className="flex flex-col gap-7 p-6 md:p-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[28px] font-bold text-foreground md:text-[32px]">
          대시보드
        </h1>
        <p className="text-[14.5px] text-ink-secondary">
          {profile ? `${profile.name}님, 이번 달도 함께 잘 관리하고 있어요.` : "안녕하세요"}
        </p>
      </div>

      {!profile && (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">프로필이 아직 연결되지 않았어요</CardTitle>
            <CardDescription>
              이 계정에 연결된 프로필이 없습니다. scripts/link-couple.ts를 먼저 실행해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {profile && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatTile
              icon={ArrowUpRight}
              tone="income"
              label="이번 달 수입"
              value={`₩${currency.format(income)}`}
            />
            <StatTile
              icon={ArrowDownRight}
              tone="expense"
              label="이번 달 지출"
              value={`₩${currency.format(expense)}`}
            />
            <StatTile
              icon={Wallet}
              tone="neutral"
              label="이번 달 잔액"
              value={`₩${currency.format(income - expense)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-heading text-[17px] font-bold text-foreground">
                  월별 수입 · 지출 추이
                </h2>
                <TrendChart points={trendPoints} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-[17px] font-bold text-foreground">최근 거래</h2>
                  <Link href="/budget" className="text-[13px] font-semibold text-primary">
                    전체 보기
                  </Link>
                </div>
                {recentTransactions.length === 0 ? (
                  <p className="py-4 text-sm text-ink-secondary">아직 기록된 거래가 없어요.</p>
                ) : (
                  <div className="flex flex-col">
                    {recentTransactions.map((t, i) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3.5 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                      >
                        <div
                          className={`flex size-[38px] shrink-0 items-center justify-center rounded-[11px] ${
                            t.type === "income" ? "bg-income-soft text-income" : "bg-expense-soft text-expense"
                          }`}
                        >
                          {t.type === "income" ? (
                            <ArrowUpRight className="size-[17px]" strokeWidth={2} />
                          ) : (
                            <ArrowDownRight className="size-[17px]" strokeWidth={2} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {t.memo || t.categoryName}
                          </div>
                          <div className="truncate text-xs text-ink-secondary">
                            {t.categoryName}
                            {t.authorName ? ` · ${t.authorName}` : ""} ·{" "}
                            {t.date.toISOString().slice(5, 10).replace("-", "월 ")}일
                          </div>
                        </div>
                        <div
                          className={`text-sm font-bold whitespace-nowrap tabular-nums ${
                            t.type === "income" ? "text-income" : "text-expense"
                          }`}
                        >
                          {t.type === "income" ? "+" : "-"}₩{currency.format(t.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 font-heading text-[17px] font-bold text-foreground">카테고리별 지출</h2>
              <ExpenseBreakdown items={expenseByCategory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
