"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import {
  assetInputSchema,
  contributionInputSchema,
  firstError,
  goalInputSchema,
  idSchema,
  type AssetInput,
  type ContributionInput,
  type GoalInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const done = () => {
  revalidatePath("/", "layout");
  return ok();
};

/** 자산·부채 추가·수정 (F-40) */
export async function saveAsset(input: AssetInput): Promise<ActionResult> {
  const parsed = assetInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { id, isLiability, ...v } = parsed.data;
  const values = { ...v, is_liability: isLiability };
  const { error } = id
    ? await supabase.from("assets").update(values).eq("id", id)
    : await supabase.from("assets").insert({ ...values, household_id: me.householdId });
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 저축 목표 추가·수정 (F-42) */
export async function saveGoal(input: GoalInput): Promise<ActionResult> {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { id, targetAmount, dueDate, name } = parsed.data;
  const values = { name, target_amount: targetAmount, due_date: dueDate };
  const { error } = id
    ? await supabase.from("goals").update(values).eq("id", id)
    : await supabase.from("goals").insert({ ...values, household_id: me.householdId });
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 목표 달성 표시 / 되돌리기 */
export async function setGoalDone(rawId: string, isDone: boolean): Promise<ActionResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(firstError(id.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
    .eq("id", id.data);
  return error ? fail(dbErrorMessage(error)) : done();
}

/** 적립 기록 (가계부 지출 내역으로는 만들지 않는다) */
export async function addContribution(input: ContributionInput): Promise<ActionResult> {
  const parsed = contributionInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const me = await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("goal_contributions").insert({
    household_id: me.householdId,
    created_by: me.id,
    goal_id: parsed.data.goalId,
    amount: parsed.data.amount,
    contributed_on: parsed.data.contributedOn,
    member_slot: parsed.data.memberSlot,
  });
  return error ? fail(dbErrorMessage(error)) : done();
}

type SoftDeletable = "assets" | "goals" | "goal_contributions";

/** 삭제 (소프트 삭제) / 되돌리기 */
export async function setDeleted(table: SoftDeletable, rawId: string, deleted: boolean): Promise<ActionResult> {
  if (!["assets", "goals", "goal_contributions"].includes(table)) return fail("잘못된 요청이에요");
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
