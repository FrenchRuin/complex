"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { moveItem, nextSortOrder } from "@/lib/order";
import {
  firstError,
  idSchema,
  moveDirectionSchema,
  paymentMethodInputSchema,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/** 결제수단 추가 또는 수정 (F-51). id가 있으면 수정. */
export async function savePaymentMethod(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = paymentMethodInputSchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind"),
    owner: formData.get("owner"),
    smsAliases: formData.get("smsAliases") ?? "",
  });
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    kind: parsed.data.kind,
    owner: parsed.data.owner,
    sms_aliases: parsed.data.smsAliases,
  };
  const rawId = formData.get("id");

  if (rawId) {
    const id = idSchema.safeParse(rawId);
    if (!id.success) return fail(firstError(id.error));
    const { error } = await supabase.from("payment_methods").update(values).eq("id", id.data);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { data: siblings, error: listError } = await supabase
      .from("payment_methods")
      .select("id, sort_order");
    if (listError) return fail(dbErrorMessage(listError));

    const { error } = await supabase.from("payment_methods").insert({
      ...values,
      household_id: me.householdId,
      sort_order: nextSortOrder(siblings),
    });
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return ok();
}

export async function movePaymentMethod(rawId: string, rawDirection: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  const direction = moveDirectionSchema.safeParse(rawDirection);
  if (!id.success || !direction.success) return fail("잘못된 요청이에요. 새로고침해 주세요");

  await requireMember();
  const supabase = await createClient();
  const { data: siblings, error: listError } = await supabase
    .from("payment_methods")
    .select("id, sort_order");
  if (listError) return fail(dbErrorMessage(listError));

  for (const change of moveItem(siblings, id.data, direction.data)) {
    const { error } = await supabase
      .from("payment_methods")
      .update({ sort_order: change.sort_order })
      .eq("id", change.id);
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return ok();
}

export async function setPaymentMethodHidden(rawId: string, hidden: boolean): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_hidden: hidden })
    .eq("id", id.data);
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
