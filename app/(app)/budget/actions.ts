"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { moveItem, nextSortOrder } from "@/lib/order";
import { firstError, idSchema, monthFirstSchema, moveDirectionSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const entriesSchema = z
  .array(
    z.object({
      categoryId: z.uuid(),
      amount: z
        .number()
        .int("예산은 원 단위로 입력해 주세요")
        .min(1)
        .max(100_000_000_000, "예산이 너무 커요. 다시 확인해 주세요")
        .nullable(),
    }),
  )
  .max(100);

/** 그 달 예산 저장 (F-21). 금액이 비어 있으면 그 카테고리 예산을 없앤다 */
export async function saveBudgets(
  month: string,
  entries: { categoryId: string; amount: number | null }[],
): Promise<ActionResult> {
  const m = monthFirstSchema.safeParse(month);
  if (!m.success) return fail(firstError(m.error));
  const parsed = entriesSchema.safeParse(entries);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();

  const upserts = parsed.data.filter((e) => e.amount !== null);
  const removals = parsed.data.filter((e) => e.amount === null).map((e) => e.categoryId);

  if (upserts.length) {
    const { error } = await supabase.from("budgets").upsert(
      upserts.map((e) => ({
        household_id: me.householdId,
        month: m.data,
        category_id: e.categoryId,
        amount: e.amount as number,
      })),
      { onConflict: "household_id,month,category_id" },
    );
    if (error) return fail(dbErrorMessage(error));
  }
  if (removals.length) {
    const { error } = await supabase.from("budgets").delete().eq("month", m.data).in("category_id", removals);
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return ok();
}

const amountSchema = z
  .number()
  .int("금액은 원 단위로 입력해 주세요")
  .min(1)
  .max(100_000_000_000, "금액이 너무 커요. 다시 확인해 주세요")
  .nullable();

const spendAmountsSchema = z.array(z.object({ budgetId: z.uuid(), amount: amountSchema })).max(50);

/** 그 달 통장·카드 예산 금액 저장. 비어 있으면 그 달 금액을 없앤다 */
export async function saveSpendBudgetAmounts(
  month: string,
  entries: { budgetId: string; amount: number | null }[],
): Promise<ActionResult> {
  const m = monthFirstSchema.safeParse(month);
  if (!m.success) return fail(firstError(m.error));
  const parsed = spendAmountsSchema.safeParse(entries);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const upserts = parsed.data.filter((e) => e.amount !== null);
  const removals = parsed.data.filter((e) => e.amount === null).map((e) => e.budgetId);

  if (upserts.length) {
    const { error } = await supabase.from("spend_budget_amounts").upsert(
      upserts.map((e) => ({ household_id: me.householdId, budget_id: e.budgetId, month: m.data, amount: e.amount as number })),
      { onConflict: "budget_id,month" },
    );
    if (error) return fail(dbErrorMessage(error));
  }
  if (removals.length) {
    const { error } = await supabase.from("spend_budget_amounts").delete().eq("month", m.data).in("budget_id", removals);
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return ok();
}

const spendBudgetSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(20, "이름은 20자까지 쓸 수 있어요"),
  methodIds: z.array(z.uuid()).min(1, "셀 계좌·카드를 하나 이상 골라 주세요").max(20),
  /** 새로 만들 때 이번 달 금액 (선택) */
  amount: amountSchema.optional(),
});

/**
 * 통장·카드 예산 추가·수정: 이름과 셀 결제수단. 한 결제수단은 한 예산에만 들어간다.
 * 지운 예산이 잡고 있던 결제수단은 풀어서 쓸 수 있게 한다.
 */
export async function saveSpendBudget(
  input: z.input<typeof spendBudgetSchema>,
  month: string,
): Promise<ActionResult & { id?: string }> {
  const parsed = spendBudgetSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const m = monthFirstSchema.safeParse(month);
  if (!m.success) return fail(firstError(m.error));
  const v = parsed.data;

  const me = await requireMember();
  const supabase = await createClient();

  // 다른 (살아 있는) 예산에 이미 들어 있는 결제수단은 막고, 지운 예산에 남은 연결은 푼다
  const { data: taken, error: takenError } = await supabase
    .from("spend_budget_methods")
    .select("id, budget_id, payment_method_id, spend_budgets(name, deleted_at)")
    .in("payment_method_id", v.methodIds);
  if (takenError) return fail(dbErrorMessage(takenError));
  const conflict = taken.find((t) => t.budget_id !== v.id && t.spend_budgets && t.spend_budgets.deleted_at === null);
  if (conflict) return fail(`이미 '${conflict.spend_budgets?.name}' 예산에 들어 있는 계좌·카드가 있어요. 거기서 먼저 빼 주세요`);
  const stale = taken.filter((t) => t.budget_id !== v.id).map((t) => t.id);
  if (stale.length) {
    const { error } = await supabase.from("spend_budget_methods").delete().in("id", stale);
    if (error) return fail(dbErrorMessage(error));
  }

  let id = v.id;
  if (id) {
    const { error } = await supabase.from("spend_budgets").update({ name: v.name }).eq("id", id).is("deleted_at", null);
    if (error) return fail(dbErrorMessage(error));
    const { error: clearError } = await supabase.from("spend_budget_methods").delete().eq("budget_id", id);
    if (clearError) return fail(dbErrorMessage(clearError));
  } else {
    const { data: siblings, error: listError } = await supabase.from("spend_budgets").select("id, sort_order");
    if (listError) return fail(dbErrorMessage(listError));
    const { data, error } = await supabase
      .from("spend_budgets")
      .insert({ household_id: me.householdId, name: v.name, sort_order: nextSortOrder(siblings) })
      .select("id")
      .single();
    if (error) return fail(dbErrorMessage(error));
    id = data.id;
    if (v.amount) {
      const { error: amountError } = await supabase
        .from("spend_budget_amounts")
        .insert({ household_id: me.householdId, budget_id: id, month: m.data, amount: v.amount });
      if (amountError) return fail(dbErrorMessage(amountError));
    }
  }

  const budgetId = id;
  const { error: linkError } = await supabase
    .from("spend_budget_methods")
    .insert(v.methodIds.map((methodId) => ({ household_id: me.householdId, budget_id: budgetId, payment_method_id: methodId })));
  if (linkError) return fail(dbErrorMessage(linkError));

  revalidatePath("/", "layout");
  return { ...ok(), id: budgetId };
}

/** 통장·카드 예산 삭제(소프트 삭제)·되돌리기 */
export async function setSpendBudgetDeleted(rawId: string, deleted: boolean): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("spend_budgets")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id.data);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/", "layout");
  return ok();
}

/** 통장·카드 예산 순서 바꾸기 (위로·아래로) */
export async function moveSpendBudget(rawId: string, direction: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  const dir = moveDirectionSchema.safeParse(direction);
  if (!id.success || !dir.success) return fail("잘못된 요청이에요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase.from("spend_budgets").select("id, sort_order").is("deleted_at", null);
  if (error) return fail(dbErrorMessage(error));
  for (const change of moveItem(data, id.data, dir.data)) {
    const { error: updateError } = await supabase.from("spend_budgets").update({ sort_order: change.sort_order }).eq("id", change.id);
    if (updateError) return fail(dbErrorMessage(updateError));
  }
  revalidatePath("/", "layout");
  return ok();
}
