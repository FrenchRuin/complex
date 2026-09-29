import { cache } from "react";
import type { AllowanceItem, BudgetItem } from "./calc/budget";
import { currentMonthKST, type MonthString } from "./date";
import { SLOTS, type Slot } from "./domain";
import { createClient } from "./supabase/server";

/**
 * 이번 달이면 먼저 "지난달 예산·용돈 복사"를 한 번 해 둔다 (F-21).
 * (복사는 DB 함수가 한 달에 한 번만 한다)
 */
const ensureMonth = cache(async (month: MonthString) => {
  if (month !== currentMonthKST()) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_month_budgets", { p_month: `${month}-01` });
  if (error) throw new Error(`예산을 준비하지 못했어요: ${error.message}`);
});

/** 그 달 카테고리 예산 */
export const getMonthBudgets = cache(async (month: MonthString): Promise<BudgetItem[]> => {
  await ensureMonth(month);
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets").select("category_id, amount").eq("month", `${month}-01`);
  if (error) throw new Error(`예산을 불러오지 못했어요: ${error.message}`);
  return data.map((b) => ({ categoryId: b.category_id, amount: b.amount }));
});

/** 그 달 용돈 (사람별 개인 지출 한도) */
export const getMonthAllowances = cache(async (month: MonthString): Promise<AllowanceItem[]> => {
  await ensureMonth(month);
  const supabase = await createClient();
  const { data, error } = await supabase.from("allowances").select("member_slot, amount").eq("month", `${month}-01`);
  if (error) throw new Error(`용돈을 불러오지 못했어요: ${error.message}`);
  return data
    .filter((a): a is { member_slot: Slot; amount: number } => (SLOTS as readonly string[]).includes(a.member_slot))
    .map((a) => ({ slot: a.member_slot, amount: a.amount }));
});
