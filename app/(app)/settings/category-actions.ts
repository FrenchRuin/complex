"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { moveItem, nextSortOrder } from "@/lib/order";
import {
  categoryInputSchema,
  firstError,
  idSchema,
  moveDirectionSchema,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/** 카테고리 추가 또는 수정 (F-50). id가 있으면 수정. */
export async function saveCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name") ?? "",
    icon: formData.get("icon"),
  });
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const rawId = formData.get("id");

  if (rawId) {
    const id = idSchema.safeParse(rawId);
    if (!id.success) return fail(firstError(id.error));
    const { error } = await supabase
      .from("categories")
      .update({ name: parsed.data.name, icon: parsed.data.icon })
      .eq("id", id.data);
    if (error) return fail(dbErrorMessage(error));
  } else {
    const { data: siblings, error: listError } = await supabase
      .from("categories")
      .select("id, sort_order")
      .eq("type", parsed.data.type);
    if (listError) return fail(dbErrorMessage(listError));

    const { error } = await supabase.from("categories").insert({
      household_id: me.householdId,
      type: parsed.data.type,
      name: parsed.data.name,
      icon: parsed.data.icon,
      sort_order: nextSortOrder(siblings),
    });
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/settings");
  return ok();
}

/** 한 칸 위/아래로 */
export async function moveCategory(rawId: string, rawDirection: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  const direction = moveDirectionSchema.safeParse(rawDirection);
  if (!id.success || !direction.success) return fail("잘못된 요청이에요. 새로고침해 주세요");

  await requireMember();
  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from("categories")
    .select("type")
    .eq("id", id.data)
    .single();
  if (targetError) return fail(dbErrorMessage(targetError));

  const { data: siblings, error: listError } = await supabase
    .from("categories")
    .select("id, sort_order")
    .eq("type", target.type);
  if (listError) return fail(dbErrorMessage(listError));

  for (const change of moveItem(siblings, id.data, direction.data)) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: change.sort_order })
      .eq("id", change.id);
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/settings");
  return ok();
}

/** 숨기기/다시 보이기. 삭제는 하지 않는다. */
export async function setCategoryHidden(rawId: string, hidden: boolean): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));

  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_hidden: hidden })
    .eq("id", id.data);
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/settings");
  return ok();
}
