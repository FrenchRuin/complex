"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { firstError, idSchema, transactionInputSchema, type TransactionInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * 내역 추가·수정 (F-10, F-11). id가 있으면 수정.
 * 가구·작성자·수정자는 DB 트리거가 로그인한 사람 기준으로 채운다.
 */
export async function saveTransaction(input: TransactionInput): Promise<ActionResult> {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const { id, ...v } = parsed.data;
  const values = {
    type: v.type,
    amount: v.amount,
    occurred_on: v.occurredOn,
    category_id: v.categoryId,
    merchant: v.merchant,
    memo: v.memo,
    payment_method_id: v.paymentMethodId,
    scope: v.scope,
    member_slot: v.memberSlot,
  };

  const { error } = id
    ? await supabase.from("transactions").update(values).eq("id", id).is("deleted_at", null)
    : await supabase.from("transactions").insert({
        ...values,
        household_id: me.householdId,
        created_by: me.id,
        updated_by: me.id,
      });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

/** 소프트 삭제. 5초 동안 restoreTransaction으로 되돌릴 수 있다. */
export async function deleteTransaction(rawId: string): Promise<ActionResult> {
  return setDeletedAt(rawId, new Date().toISOString());
}

export async function restoreTransaction(rawId: string): Promise<ActionResult> {
  return setDeletedAt(rawId, null);
}

async function setDeletedAt(rawId: string, deletedAt: string | null): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: deletedAt })
    .eq("id", id.data);
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
