import { cache } from "react";
import type { BudgetItem } from "./calc/budget";
import { currentMonthKST, type MonthString } from "./date";
import { createClient } from "./supabase/server";

/**
 * 그 달 예산. 이번 달이면 먼저 "지난달 예산 복사"를 한 번 해 둔다 (F-21).
 * (복사는 DB 함수가 한 달에 한 번만 한다)
 */
export const getMonthBudgets = cache(async (month: MonthString): Promise<BudgetItem[]> => {
  const supabase = await createClient();
  const first = `${month}-01`;
  if (month === currentMonthKST()) {
    const { error } = await supabase.rpc("ensure_month_budgets", { p_month: first });
    if (error) throw new Error(`예산을 준비하지 못했어요: ${error.message}`);
  }
  const { data, error } = await supabase.from("budgets").select("category_id, amount").eq("month", first);
  if (error) throw new Error(`예산을 불러오지 못했어요: ${error.message}`);
  return data.map((b) => ({ categoryId: b.category_id, amount: b.amount }));
});
