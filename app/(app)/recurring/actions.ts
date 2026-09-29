"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { dueDateInRange } from "@/lib/calc/recurring";
import { requireMember } from "@/lib/household";
import { getCurrentPeriod } from "@/lib/period";
import { dateStringSchema, firstError, idSchema, recurringInputSchema, type RecurringInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/** 이번 달(한 달 기준 F-56의 기간) 이름의 1일 */
const thisMonthFirst = async () => `${(await getCurrentPeriod()).month}-01`;

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
        .insert({ ...values, household_id: me.householdId, start_month: await thisMonthFirst() });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

/** 중지: 이번 달까지만 보이고 다음 달부터 안 보인다 */
export async function stopRecurringItem(rawId: string): Promise<ActionResult> {
  return setEndMonth(rawId, await thisMonthFirst());
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
  const { month, range } = await getCurrentPeriod();
  // 결제일을 따로 고르지 않았으면 이번 기간 안의 결제일 (DB 기본값은 달력의 달 기준이라 여기서 정해 준다)
  let date = occurredOn;
  if (date === null) {
    const { data: item } = await supabase.from("recurring_items").select("day_of_month").eq("id", id.data).single();
    if (item) date = dueDateInRange(range, item.day_of_month);
  }
  const { error } = await supabase.rpc("check_recurring", {
    p_item_id: id.data,
    p_month: `${month}-01`,
    ...(amount !== null ? { p_amount: amount } : {}),
    ...(date !== null ? { p_occurred_on: date } : {}),
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
    p_month: await thisMonthFirst(),
  });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
