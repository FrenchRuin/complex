"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { currentMonthKST } from "@/lib/date";
import { requireMember } from "@/lib/household";
import { dateStringSchema, firstError, idSchema, recurringInputSchema, type RecurringInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const thisMonthFirst = () => `${currentMonthKST()}-01`;

/** 정기지출 등록·수정 (F-30). 새로 만들면 이번 달부터 보인다. */
export async function saveRecurringItem(input: RecurringInput): Promise<ActionResult> {
  const parsed = recurringInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const { id, ...v } = parsed.data;
  const values = {
    name: v.name,
    amount: v.amount,
    day_of_month: v.dayOfMonth,
    category_id: v.categoryId,
    payment_method_id: v.paymentMethodId,
    scope: v.scope,
    member_slot: v.memberSlot,
    is_variable: v.isVariable,
    has_variable_date: v.hasVariableDate,
  };

  const { error } = id
    ? await supabase.from("recurring_items").update(values).eq("id", id)
    : await supabase
        .from("recurring_items")
        .insert({ ...values, household_id: me.householdId, start_month: thisMonthFirst() });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

/** 중지: 이번 달까지만 보이고 다음 달부터 안 보인다 */
export async function stopRecurringItem(rawId: string): Promise<ActionResult> {
  return setEndMonth(rawId, thisMonthFirst());
}

export async function resumeRecurringItem(rawId: string): Promise<ActionResult> {
  return setEndMonth(rawId, null);
}

async function setEndMonth(rawId: string, endMonth: string | null): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_items").update({ end_month: endMonth }).eq("id", id.data);
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

/**
 * 납부 체크 (F-31): 이번 달 결제일로 내역을 만든다.
 * amount는 금액이 매달 다른 항목만, occurredOn은 결제일이 매달 다른 항목만 전달한다.
 */
export async function checkRecurring(
  rawId: string,
  amount: number | null,
  occurredOn: string | null,
): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));
  if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) {
    return fail("금액을 입력해 주세요");
  }
  if (occurredOn !== null && !dateStringSchema.safeParse(occurredOn).success) {
    return fail("날짜를 확인해 주세요");
  }

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_recurring", {
    p_item_id: id.data,
    p_month: thisMonthFirst(),
    ...(amount !== null ? { p_amount: amount } : {}),
    ...(occurredOn !== null ? { p_occurred_on: occurredOn } : {}),
  });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

/** 체크 해제: 이번 달 자동 내역을 삭제한다 */
export async function uncheckRecurring(rawId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("uncheck_recurring", {
    p_item_id: id.data,
    p_month: thisMonthFirst(),
  });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
