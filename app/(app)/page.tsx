import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseBreakdown } from "@/components/home/expense-breakdown";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const currency = new Intl.NumberFormat("ko-KR");

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

export default async function HomePage() {
  const { profile } = await getSessionProfile();

  let income = 0;
  let expense = 0;
  let expenseByCategory: { name: string; amount: number }[] = [];

  if (profile?.coupleId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        coupleId: profile.coupleId,
        date: { gte: monthStart, lt: monthEnd },
      },
      include: { category: true },
    });

    const categoryTotals = new Map<string, number>();
    for (const t of transactions) {
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
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-lg font-medium">
        {profile ? `${profile.name}님, 안녕하세요` : "안녕하세요"}
      </h1>

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
        <div className="flex max-w-2xl flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="이번 달 수입" value={`${currency.format(income)}원`} />
            <StatTile label="이번 달 지출" value={`${currency.format(expense)}원`} />
            <StatTile label="순잔액" value={`${currency.format(income - expense)}원`} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">카테고리별 지출</h2>
              <Link href="/budget" className="text-sm text-primary underline underline-offset-2">
                가계부 전체 보기
              </Link>
            </div>
            <ExpenseBreakdown items={expenseByCategory} />
          </div>
        </div>
      )}
    </div>
  );
}
