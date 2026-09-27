import type { Metadata } from "next";
import { BudgetEditor } from "@/components/settings/BudgetEditor";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { getMonthBudgets } from "@/lib/budget";
import { currentMonthKST, formatMonthLabel } from "@/lib/date";
import { requireMember } from "@/lib/household";
import { getVisibleCategories } from "@/lib/household-data";

export const metadata: Metadata = { title: "예산 · 설정 · 우리 둘 가계부" };

export default async function BudgetSettingsPage() {
  await requireMember();
  const month = currentMonthKST();
  const [categories, budgets] = await Promise.all([getVisibleCategories(), getMonthBudgets(month)]);
  return (
    <SettingsSubpage title="예산">
      <BudgetEditor
        monthLabel={formatMonthLabel(month)}
        monthFirst={`${month}-01`}
        categories={categories}
        budgets={budgets}
      />
    </SettingsSubpage>
  );
}
