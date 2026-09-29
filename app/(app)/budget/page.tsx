import type { Metadata } from "next";
import { AllowanceEditor } from "@/components/budget/AllowanceEditor";
import { AllowanceList, BudgetTotals, CategoryBudgetList } from "@/components/budget/BudgetParts";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getMonthAllowances, getMonthBudgets } from "@/lib/budget";
import { allowanceRows, budgetSummary, categoryBudgetRows, spentByCategory } from "@/lib/calc/budget";
import { splitByOwner } from "@/lib/calc/dashboard";
import { currentMonthKST, formatMonthLabel, monthRange, todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories } from "@/lib/household-data";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "예산 · 우리 둘 가계부" };

/** 예산 화면 (F-21): 이번 달 카테고리 예산·용돈 사용 현황 + 입력 */
export default async function BudgetPage() {
  await requireMember();
  const month = currentMonthKST();
  const today = todayKST();
  const [members, categories, budgets, allowances, rows, labels] = await Promise.all([
    getHouseholdMembers(),
    getVisibleCategories(),
    getMonthBudgets(month),
    getMonthAllowances(month),
    getTransactionsInRange(monthRange(month)),
    getLabelMaps(),
  ]);
  const names = toMemberNames(members);
  const monthLabel = formatMonthLabel(month);
  const categoryRows = categoryBudgetRows(budgets, spentByCategory(rows));
  const personal = splitByOwner(rows);
  const allowanceUsage = allowanceRows(allowances, { a: personal.a, b: personal.b });

  return (
    <>
      <PageHeader title="예산" />
      <div className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <SettingsSection title="변동지출 예산" description={`${monthLabel} 카테고리 예산을 얼마나 썼는지예요.`}>
            {categoryRows.length === 0 ? (
              <p className="text-body text-ink-muted">아직 카테고리 예산이 없어요. 카테고리 예산에서 정해 보세요.</p>
            ) : (
              <>
                <BudgetTotals summary={budgetSummary(categoryRows, month, today)} />
                <div className="mt-5">
                  <CategoryBudgetList rows={categoryRows} categoryNames={labels.categories} />
                </div>
              </>
            )}
          </SettingsSection>
          <SettingsSection title="용돈 사용" description="각자 개인 지출이 용돈을 얼마나 썼는지예요. 공동 지출은 빠져요.">
            {allowanceUsage.length === 0 ? (
              <p className="text-body text-ink-muted">아직 용돈이 없어요. 용돈에서 정해 보세요.</p>
            ) : (
              <AllowanceList rows={allowanceUsage} names={names} />
            )}
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
