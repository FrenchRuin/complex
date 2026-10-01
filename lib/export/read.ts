import { toAssetKind } from "@/lib/calc/assets";
import type { ExportData } from "@/lib/calc/export-sheets";
import { toDeal, toDebtKind, toHomeStatus, toRegion } from "@/lib/calc/loans";
import { todayKST } from "@/lib/date";
import { toCategoryType, toOwner, toScope, toSlot } from "@/lib/domain";
import { getHouseholdMembers, toMemberNames } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";

/**
 * 엑셀 내보내기(F-52)에 담을 가구 데이터 전체. RLS로 내 가구만 읽히고, 지운 항목은 뺀다.
 * 목록은 1000줄 제한이 있어 fetchAll로 끝까지 읽는다 (order("id")는 쪽 나누기용, 시트 순서는 export-sheets가 정한다).
 */
export async function readExportData(): Promise<ExportData> {
  const supabase = await createClient();
  const [
    members,
    categories,
    methods,
    transactions,
    recurring,
    budgets,
    spendBudgets,
    spendLinks,
    spendAmounts,
    assets,
    assetValues,
    goals,
    contributions,
    debts,
    scenarios,
    profileRes,
  ] = await Promise.all([
    getHouseholdMembers(),
    fetchAll("카테고리", (f, t) => supabase.from("categories").select("id, name, sort_order").order("id").range(f, t)),
    fetchAll("계좌·카드", (f, t) => supabase.from("payment_methods").select("id, name").order("id").range(f, t)),
    fetchAll("내역", (f, t) =>
      supabase
        .from("transactions")
        .select("type, amount, occurred_on, occurred_time, category_id, merchant, memo, payment_method_id, scope, member_slot, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("정기지출", (f, t) =>
      supabase
        .from("recurring_items")
        .select("name, amount, day_of_month, category_id, scope, member_slot, payment_method_id, is_variable, has_variable_date, start_month, end_month")
        .order("id")
        .range(f, t),
    ),
    fetchAll("카테고리 예산", (f, t) => supabase.from("budgets").select("month, category_id, amount").order("id").range(f, t)),
    fetchAll("통장·카드 예산", (f, t) =>
      supabase.from("spend_budgets").select("id, name, sort_order").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("통장·카드 예산의 계좌·카드", (f, t) =>
      supabase.from("spend_budget_methods").select("budget_id, payment_method_id").order("id").range(f, t),
    ),
    fetchAll("통장·카드 예산 금액", (f, t) =>
      supabase.from("spend_budget_amounts").select("budget_id, month, amount").order("id").range(f, t),
    ),
    fetchAll("자산", (f, t) =>
      supabase
        .from("assets")
        .select("id, name, kind, owner, amount, value_as_of, is_liability, memo")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("자산 금액 기록", (f, t) =>
      supabase.from("asset_values").select("asset_id, as_of, amount").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("저축 목표", (f, t) =>
      supabase.from("goals").select("id, name, target_amount, due_date, is_done, created_at").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("목표 적립", (f, t) =>
      supabase
        .from("goal_contributions")
        .select("goal_id, amount, contributed_on, member_slot, memo")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("기존 대출", (f, t) =>
      supabase
        .from("loan_debts")
        .select("name, kind, owner, balance, rate_bp, months_left, monthly_payment, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("집 후보", (f, t) =>
      supabase
        .from("loan_scenarios")
        .select("name, deal, price, region, rate_bp, term_years, extra_costs, memo, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    supabase.from("loan_profiles").select("income_a, income_b, home_status, first_time").maybeSingle(),
  ]);
  if (profileRes.error) throw new Error(`대출 우리 정보를 불러오지 못했어요: ${profileRes.error.message}`);

  const budgetById = new Map(spendBudgets.map((b) => [b.id, b]));
  const profile = profileRes.data;

  return {
    today: todayKST(),
    names: toMemberNames(members),
    categories: Object.fromEntries(categories.map((c) => [c.id, { name: c.name, sortOrder: c.sort_order }])),
    paymentMethods: Object.fromEntries(methods.map((m) => [m.id, m.name])),
    transactions: transactions.map((r) => ({
      occurredOn: r.occurred_on,
      occurredTime: r.occurred_time,
      type: toCategoryType(r.type),
      categoryId: r.category_id,
      merchant: r.merchant,
      memo: r.memo,
      amount: r.amount,
      paymentMethodId: r.payment_method_id,
      scope: toScope(r.scope),
      memberSlot: toSlot(r.member_slot),
      createdAt: r.created_at,
    })),
    recurring: recurring.map((r) => ({
      name: r.name,
      amount: r.amount,
      dayOfMonth: r.day_of_month,
      categoryId: r.category_id,
      scope: toScope(r.scope),
      memberSlot: toSlot(r.member_slot),
      paymentMethodId: r.payment_method_id,
      isVariable: r.is_variable,
      hasVariableDate: r.has_variable_date,
      startMonth: r.start_month,
      endMonth: r.end_month,
    })),
    budgets: budgets.map((b) => ({ month: b.month, categoryId: b.category_id, amount: b.amount })),
    // 지운 통장·카드 예산의 금액은 뺀다
    spendBudgets: spendAmounts.flatMap((a) => {
      const b = budgetById.get(a.budget_id);
      if (!b) return [];
      const methodIds = spendLinks.filter((l) => l.budget_id === b.id).map((l) => l.payment_method_id);
      return [{ month: a.month, name: b.name, sortOrder: b.sort_order, amount: a.amount, methodIds }];
    }),
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: toAssetKind(a.kind),
      owner: toOwner(a.owner),
      amount: a.amount,
      valueAsOf: a.value_as_of,
      isLiability: a.is_liability,
      memo: a.memo,
    })),
    assetValues: assetValues.map((v) => ({ assetId: v.asset_id, asOf: v.as_of, amount: v.amount })),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      dueDate: g.due_date,
      isDone: g.is_done,
      createdAt: g.created_at,
    })),
    contributions: contributions.map((c) => ({
      goalId: c.goal_id,
      amount: c.amount,
      contributedOn: c.contributed_on,
      memberSlot: toSlot(c.member_slot),
      memo: c.memo,
    })),
    loanProfile: profile
      ? { incomeA: profile.income_a, incomeB: profile.income_b, homeStatus: toHomeStatus(profile.home_status), firstTime: profile.first_time }
      : null,
    loanDebts: debts.map((l) => ({
      name: l.name,
      kind: toDebtKind(l.kind),
      owner: toOwner(l.owner),
      balance: l.balance,
      rateBp: l.rate_bp,
      monthsLeft: l.months_left,
      monthlyPayment: l.monthly_payment,
      createdAt: l.created_at,
    })),
    loanScenarios: scenarios.map((s) => ({
      name: s.name,
      deal: toDeal(s.deal),
      price: s.price,
      region: toRegion(s.region),
      rateBp: s.rate_bp,
      termYears: s.term_years,
      extraCosts: s.extra_costs,
      memo: s.memo,
      createdAt: s.created_at,
    })),
  };
}
