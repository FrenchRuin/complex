"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { SLOTS, type Slot } from "@/lib/domain";
import { requireMember } from "@/lib/household";
import { firstError, monthFirstSchema } from "@/lib/schemas";
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

const allowanceSchema = z
  .array(
    z.object({
      slot: z.enum(SLOTS),
      amount: z
        .number()
        .int("용돈은 원 단위로 입력해 주세요")
        .min(1)
        .max(100_000_000_000, "용돈이 너무 커요. 다시 확인해 주세요")
        .nullable(),
    }),
  )
  .max(2);

/** 그 달 용돈 저장 (사람별 개인 지출 한도). 비어 있으면 그 사람 용돈을 없앤다 */
export async function saveAllowances(
  month: string,
  entries: { slot: Slot; amount: number | null }[],
): Promise<ActionResult> {
  const m = monthFirstSchema.safeParse(month);
  if (!m.success) return fail(firstError(m.error));
  const parsed = allowanceSchema.safeParse(entries);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();

  const upserts = parsed.data.filter((e) => e.amount !== null);
  const removals = parsed.data.filter((e) => e.amount === null).map((e) => e.slot);

  if (upserts.length) {
    const { error } = await supabase.from("allowances").upsert(
      upserts.map((e) => ({
        household_id: me.householdId,
        month: m.data,
        member_slot: e.slot,
        amount: e.amount as number,
      })),
      { onConflict: "household_id,month,member_slot" },
    );
    if (error) return fail(dbErrorMessage(error));
  }
  if (removals.length) {
    const { error } = await supabase.from("allowances").delete().eq("month", m.data).in("member_slot", removals);
    if (error) return fail(dbErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return ok();
}
