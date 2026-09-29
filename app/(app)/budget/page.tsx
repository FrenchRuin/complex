import type { Metadata } from "next";
import { AllowanceEditor } from "@/components/budget/AllowanceEditor";
import { AllowanceList, BudgetTotals, CategoryBudgetList } from "@/components/budget/BudgetParts";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AllowanceMethodHint } from "@/components/budget/AllowanceMethodHint";
import { getAllowanceMethods, getMonthAllowances, getMonthBudgets } from "@/lib/budget";
import { allowanceRows, allowanceSpent, budgetSummary, categoryBudgetRows, spentByCategory } from "@/lib/calc/budget";
import { formatPeriodRange, isCalendarRange } from "@/lib/calc/period";
import { formatMonthLabel, todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories } from "@/lib/household-data";
import { getCurrentPeriod } from "@/lib/period";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "예산 · 우리 둘 가계부" };

/** 예산 화면 (F-21): 이번 달(한 달 기준 F-56의 기간) 카테고리 예산·용돈 사용 현황 + 입력 */
export default async function BudgetPage() {
  await requireMember();
  const { month, range } = await getCurrentPeriod();
  const today = todayKST();
  const [members, categories, budgets, allowances, allowanceMethods, rows, labels] = await Promise.all([
    getHouseholdMembers(),
    getVisibleCategories(),
    getMonthBudgets(month),
    getMonthAllowances(month),
    getAllowanceMethods(),
    getTransactionsInRange(range),
    getLabelMaps(),
  ]);
  const names = toMemberNames(members);
  const monthLabel = formatMonthLabel(month);
  const rangeLabel = isCalendarRange(range) ? null : formatPeriodRange(range);
  const categoryRows = categoryBudgetRows(budgets, spentByCategory(rows));
  const allowanceUsage = allowanceRows(allowances, allowanceSpent(rows, allowanceMethods));
  const hasAllowanceMethod = Object.keys(allowanceMethods).length > 0;

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
          <SettingsSection title="용돈 사용" description="각자 용돈 통장·카드로 쓴 금액이에요. 월급에서 나가는 카드값은 빠져요.">
            {allowanceUsage.length === 0 ? (
              <p className="text-body text-ink-muted">아직 용돈이 없어요. 용돈에서 정해 보세요.</p>
            ) : (
              <AllowanceList rows={allowanceUsage} names={names} />
            )}
            {hasAllowanceMethod ? null : <AllowanceMethodHint />}
          </SettingsSection>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <BudgetEditor monthLabel={monthLabel} monthFirst={`${month}-01`} categories={categories} budgets={budgets} />
          <AllowanceEditor monthLabel={monthLabel} monthFirst={`${month}-01`} names={names} allowances={allowances} />
        </div>
      </div>
    </>
  );
}
