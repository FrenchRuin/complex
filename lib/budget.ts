import { cache } from "react";
import type { BudgetItem, SpendBudget } from "./calc/budget";
import type { MonthString } from "./date";
import { toOwner, type Owner } from "./domain";
import { getCurrentPeriod } from "./period";
import { createClient } from "./supabase/server";

/**
 * 이번 달이면 먼저 "지난달 예산 복사"를 한 번 해 둔다 (F-21): 카테고리 예산 + 통장·카드 예산 금액.
 * (복사는 DB 함수가 한 달에 한 번만 한다)
 */
const ensureMonth = cache(async (month: MonthString) => {
  // "이번 달"은 한 달 기준(F-56)으로 오늘이 속한 기간
  if (month !== (await getCurrentPeriod()).month) return;
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

/** 통장·카드 예산 + 그 결제수단들의 소유(사람 필터용) */
export type SpendBudgetInfo = SpendBudget & { owners: readonly Owner[] };

/** 그 달 통장·카드 예산 (지운 것 빼고, 순서대로). 금액이 없는 예산도 포함 (입력 화면용) */
export const getSpendBudgets = cache(async (month: MonthString): Promise<SpendBudgetInfo[]> => {
  await ensureMonth(month);
  const supabase = await createClient();
  const [budgetsRes, methodsRes, amountsRes] = await Promise.all([
    supabase.from("spend_budgets").select("id, name").is("deleted_at", null).order("sort_order").order("created_at"),
    supabase.from("spend_budget_methods").select("budget_id, payment_method_id, payment_methods(owner)"),
    supabase.from("spend_budget_amounts").select("budget_id, amount").eq("month", `${month}-01`),
  ]);
  if (budgetsRes.error || methodsRes.error || amountsRes.error) {
    const error = budgetsRes.error ?? methodsRes.error ?? amountsRes.error;
    throw new Error(`통장·카드 예산을 불러오지 못했어요: ${error?.message}`);
  }
  const amounts = amountsRes.data;
  const links = methodsRes.data;

  return budgetsRes.data.map((b) => {
    const methods = links.filter((m) => m.budget_id === b.id);
    return {
      id: b.id,
      name: b.name,
      methodIds: methods.map((m) => m.payment_method_id),
      owners: [...new Set(methods.map((m) => toOwner(m.payment_methods?.owner ?? "joint")))],
      amount: amounts.find((a) => a.budget_id === b.id)?.amount ?? null,
    };
  });
});

/** 결제수단 id → 들어 있는 예산 이름 (계좌·카드 설정 화면 표시용, 지운 예산 빼고) */
export const getMethodBudgetNames = cache(async (): Promise<Record<string, string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spend_budget_methods")
    .select("payment_method_id, spend_budgets!inner(name, deleted_at)")
    .is("spend_budgets.deleted_at", null);
  if (error) throw new Error(`통장·카드 예산을 불러오지 못했어요: ${error.message}`);
  return Object.fromEntries(data.map((m) => [m.payment_method_id, m.spend_budgets.name]));
});
