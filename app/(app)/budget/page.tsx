import type { Metadata } from "next";
import { BudgetTotals, CategoryBudgetList, SpendBudgetList } from "@/components/budget/BudgetParts";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { SpendBudgetEditor } from "@/components/budget/SpendBudgetEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getMonthBudgets, getSpendBudgets } from "@/lib/budget";
import { budgetSummary, categoryBudgetRows, spendBudgetRows, spentByCategory } from "@/lib/calc/budget";
import { formatPeriodRange, isCalendarRange } from "@/lib/calc/period";
import { formatMonthLabel, todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories, getVisiblePaymentMethods } from "@/lib/household-data";
import { getCurrentPeriod } from "@/lib/period";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "예산 · 우리 둘 가계부" };

/** 예산 화면 (F-21): 이번 달(한 달 기준 F-56의 기간) 카테고리 예산·통장·카드 예산 사용 현황 + 입력 */
export default async function BudgetPage() {
  await requireMember();
  const { month, range } = await getCurrentPeriod();
  const today = todayKST();
  const [members, categories, budgets, spendBudgets, paymentMethods, rows, labels] = await Promise.all([
    getHouseholdMembers(),
    getVisibleCategories(),
    getMonthBudgets(month),
    getSpendBudgets(month),
    getVisiblePaymentMethods(),
    getTransactionsInRange(range),
    getLabelMaps(),
  ]);
  const names = toMemberNames(members);
  const monthLabel = formatMonthLabel(month);
  const rangeLabel = isCalendarRange(range) ? null : formatPeriodRange(range);
  const categoryRows = categoryBudgetRows(budgets, spentByCategory(rows));
  const spendUsage = spendBudgetRows(spendBudgets, rows);

  return (
    <>
      <PageHeader
        title="예산"
        titleEnd={rangeLabel ? <span className="ml-2 text-caption text-ink-muted tabular-nums">{rangeLabel}</span> : null}
      />
      <div className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <SettingsSection title="변동지출 예산" description={`${monthLabel} 카테고리 예산을 얼마나 썼는지예요.`}>
            {categoryRows.length === 0 ? (
              <p className="text-body text-ink-muted">아직 카테고리 예산이 없어요. 카테고리 예산에서 정해 보세요.</p>
            ) : (
              <>
                <BudgetTotals summary={budgetSummary(categoryRows, range, today)} />
                <div className="mt-5">
                  <CategoryBudgetList rows={categoryRows} categoryNames={labels.categories} />
                </div>
              </>
            )}
          </SettingsSection>
          <SettingsSection title="통장·카드 예산 사용" description="예산마다 그 계좌·카드로 쓴 금액이에요. 공동으로 적은 지출도 그 카드로 냈으면 들어가요.">
            {spendUsage.length === 0 ? (
              <p className="text-body text-ink-muted">아직 이번 달 금액이 정해진 통장·카드 예산이 없어요.</p>
            ) : (
              <SpendBudgetList rows={spendUsage} />
            )}
          </SettingsSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <BudgetEditor monthLabel={monthLabel} monthFirst={`${month}-01`} categories={categories} budgets={budgets} />
          <SpendBudgetEditor
            // 추가·수정·금액이 바뀌면 입력칸을 새 값으로 다시 채운다
            key={spendBudgets.map((b) => `${b.id}:${b.amount}`).join()}
            monthLabel={monthLabel}
            monthFirst={`${month}-01`}
            budgets={spendBudgets}
            paymentMethods={paymentMethods}
            names={names}
          />
        </div>
      </div>
    </>
  );
}
