"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import {
  assetInfoSchema,
  assetValueSchema,
  firstError,
  idSchema,
  type AssetInfoInput,
  type AssetValueInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const done = () => {
  revalidatePath("/", "layout");
  return ok();
};

/** 자산·부채 추가: 항목 정보 + 첫 금액 기록 (F-40) */
export async function createAsset(info: AssetInfoInput, value: AssetValueInput): Promise<ActionResult> {
  const i = assetInfoSchema.safeParse(info);
  if (!i.success) return fail(firstError(i.error));
  const v = assetValueSchema.safeParse(value);
  if (!v.success) return fail(firstError(v.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      household_id: me.householdId,
      name: i.data.name,
      kind: i.data.kind,
      owner: i.data.owner,
      memo: i.data.memo,
      is_liability: i.data.isLiability,
      amount: v.data.amount,
      value_as_of: v.data.asOf,
    })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  const { error: valueError } = await supabase.rpc("set_asset_value", {
    p_asset_id: data.id,
    p_as_of: v.data.asOf,
    p_amount: v.data.amount,
  });
  return valueError ? fail(dbErrorMessage(valueError)) : done();
}

/** 자산·부채 정보 수정 (이름·종류·소유·부채 여부·메모). 금액은 기록으로만 바꾼다 */
export async function updateAssetInfo(info: AssetInfoInput): Promise<ActionResult> {
  const i = assetInfoSchema.safeParse(info);
  if (!i.success || !i.data.id) return fail(i.success ? "잘못된 요청이에요" : firstError(i.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({ name: i.data.name, kind: i.data.kind, owner: i.data.owner, memo: i.data.memo, is_liability: i.data.isLiability })
    .eq("id", i.data.id);
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 금액 기록 추가 (같은 날짜가 있으면 금액만 바꿈). 지난 날짜도 된다 → 그 달 추이에 반영 */
export async function addAssetValue(rawAssetId: string, value: AssetValueInput): Promise<ActionResult> {
  const id = idSchema.safeParse(rawAssetId);
  if (!id.success) return fail(firstError(id.error));
  const v = assetValueSchema.safeParse(value);
  if (!v.success) return fail(firstError(v.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_asset_value", { p_asset_id: id.data, p_as_of: v.data.asOf, p_amount: v.data.amount });
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 금액 기록 지우기 (항목마다 하나는 남아야 한다) */
export async function deleteAssetValue(rawValueId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(rawValueId);
  if (!id.success) return fail(firstError(id.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_asset_value", { p_value_id: id.data });
  return error ? fail(dbErrorMessage(error)) : done();
}

type SoftDeletable = "assets";

/** 삭제 (소프트 삭제) / 되돌리기 */
export async function setDeleted(table: SoftDeletable, rawId: string, deleted: boolean): Promise<ActionResult> {
  if (table !== "assets") return fail("잘못된 요청이에요");
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id.data);
  return error ? fail(dbErrorMessage(error)) : done();
}
