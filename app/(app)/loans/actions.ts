"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { RULE_GROUPS, ruleSchemas, type RuleGroup } from "@/lib/calc/loan-rules";
import { requireMember } from "@/lib/household";
import {
  firstError,
  idSchema,
  loanDebtSchema,
  loanProfileSchema,
  loanScenarioSchema,
  type LoanDebtInput,
  type LoanProfileInput,
  type LoanScenarioFormInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const done = () => {
  revalidatePath("/loans", "layout");
  return ok();
};

/** 우리 정보 저장 (F-43). 기준값(rules)은 건드리지 않는다 */
export async function saveLoanProfile(input: LoanProfileInput): Promise<ActionResult> {
  const parsed = loanProfileSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { incomeA, incomeB, homeStatus, firstTime } = parsed.data;
  const { error } = await supabase
    .from("loan_profiles")
    .upsert(
      { household_id: me.householdId, income_a: incomeA, income_b: incomeB, home_status: homeStatus, first_time: firstTime },
      { onConflict: "household_id" },
    );
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 기존 대출 추가·수정 */
export async function saveLoanDebt(input: LoanDebtInput): Promise<ActionResult> {
  const parsed = loanDebtSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { id, name, kind, owner, balance, rateBp, monthsLeft, monthlyPayment } = parsed.data;
  const values = { name, kind, owner, balance, rate_bp: rateBp, months_left: monthsLeft, monthly_payment: monthlyPayment };
  const { error } = id
    ? await supabase.from("loan_debts").update(values).eq("id", id)
    : await supabase
        .from("loan_debts")
        // 트리거가 로그인한 사람 기준으로 다시 채운다
        .insert({ ...values, household_id: me.householdId, created_by: me.id, updated_by: me.id });
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 자산 메뉴의 부채 중 아직 안 불러온 것을 이름·잔액·소유만 채워 추가 (종류 기타, 금리 0) */
export async function importDebtsFromAssets(): Promise<ActionResult & { count?: number }> {
  const me = await requireMember();
  const supabase = await createClient();
  const [assetsRes, debtsRes] = await Promise.all([
    supabase.from("assets").select("id, name, owner, amount").eq("is_liability", true).is("deleted_at", null).gt("amount", 0),
    supabase.from("loan_debts").select("asset_id").is("deleted_at", null).not("asset_id", "is", null),
  ]);
  if (assetsRes.error || debtsRes.error) return fail("자산 메뉴를 읽지 못했어요. 잠시 후 다시 시도해 주세요");
  const taken = new Set(debtsRes.data.map((d) => d.asset_id));
  const rows = assetsRes.data
    .filter((a) => !taken.has(a.id))
    .map((a) => ({
      household_id: me.householdId,
      name: a.name,
      kind: "other",
      owner: a.owner,
      balance: a.amount,
      rate_bp: 0,
      asset_id: a.id,
      created_by: me.id,
      updated_by: me.id,
    }));
  if (rows.length === 0) return { ...ok(), count: 0 };
  const { error } = await supabase.from("loan_debts").insert(rows);
  if (error) return fail(dbErrorMessage(error));
  done();
  return { ...ok(), count: rows.length };
}

/** 집 후보 추가·수정 */
export async function saveLoanScenario(input: LoanScenarioFormInput): Promise<ActionResult> {
  const parsed = loanScenarioSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { id, name, deal, price, region, rateBp, termYears, extraCosts, memo } = parsed.data;
  const values = { name, deal, price, region, rate_bp: rateBp, term_years: termYears, extra_costs: extraCosts, memo };
  const { error } = id
    ? await supabase.from("loan_scenarios").update(values).eq("id", id)
    : await supabase.from("loan_scenarios").insert({ ...values, household_id: me.householdId, created_by: me.id, updated_by: me.id });
  return error ? fail(dbErrorMessage(error)) : done();
}

const LOAN_TABLES = ["loan_debts", "loan_scenarios"] as const;

/** 지우기(소프트 삭제)·되돌리기 */
export async function setLoanDeleted(
  table: (typeof LOAN_TABLES)[number],
  rawId: string,
  deleted: boolean,
): Promise<ActionResult> {
  if (!LOAN_TABLES.includes(table)) return fail("잘못된 요청이에요");
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id.data);
  // 지운 뒤 같은 자산을 다시 불러왔으면 되돌릴 때 부분 유니크 인덱스에 걸린다
  if (error?.code === "23505") return fail("같은 자산 항목을 이미 다시 불러왔어요");
  return error ? fail(dbErrorMessage(error)) : done();
}

function toGroup(group: string): RuleGroup | null {
  return (RULE_GROUPS as string[]).includes(group) ? (group as RuleGroup) : null;
}

/** 기준값 묶음 하나 저장 (값·확인한 날·출처) */
export async function saveLoanRuleGroup(group: string, value: unknown): Promise<ActionResult> {
  const g = toGroup(group);
  if (!g) return fail("기준값 묶음을 찾을 수 없어요. 새로고침해 주세요");
  const parsed = ruleSchemas[g].safeParse(value);
  if (!parsed.success) return fail("기준값을 확인해 주세요. 비었거나 범위를 벗어난 칸이 있어요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_loan_rule_group", { p_group: g, p_value: parsed.data });
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 기준값 묶음을 조사값으로 되돌리기 */
export async function resetLoanRuleGroup(group: string): Promise<ActionResult> {
  const g = toGroup(group);
  if (!g) return fail("기준값 묶음을 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_loan_rule_group", { p_group: g });
  return error ? fail(dbErrorMessage(error)) : done();
}
