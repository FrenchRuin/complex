"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { isLikelyDuplicate } from "@/lib/calc/duplicates";
import { requireMember } from "@/lib/household";
import { dateStringSchema, firstError, transactionInputSchema, type TransactionInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const candidateSchema = z.array(
  z.object({ date: dateStringSchema, amount: z.number().int().positive(), merchant: z.string().nullable() }),
).max(100);

/** 붙여넣은 문자들이 이미 있는 내역 같은지 (날짜 ±1일·금액·가맹점) */
export async function findSmsDuplicates(input: { date: string; amount: number; merchant: string | null }[]): Promise<boolean[]> {
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success || parsed.data.length === 0) return input.map(() => false);

  await requireMember();
  const dates = parsed.data.map((c) => c.date).sort();
  const shift = (d: string, days: number) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, day + days)).toISOString().slice(0, 10);
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, amount, merchant")
    .is("deleted_at", null)
    .gte("occurred_on", shift(dates[0], -1))
    .lte("occurred_on", shift(dates[dates.length - 1], 1));
  if (error) return input.map(() => false);

  const existing = data.map((r) => ({ occurredOn: r.occurred_on, amount: r.amount, merchant: r.merchant }));
  return parsed.data.map((c) => isLikelyDuplicate(c, existing));
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export type SmsSaveInput = TransactionInput & { occurredTime: string | null };

/** 문자로 추가한 내역 여러 건을 한 번에 저장 (전부 저장되거나 하나도 안 됨) */
export async function saveSmsTransactions(rows: SmsSaveInput[]): Promise<ActionResult & { count?: number }> {
  if (rows.length === 0) return fail("저장할 문자를 골라 주세요");
  if (rows.length > 100) return fail("한 번에 100건까지 저장할 수 있어요");

  const values = [];
  for (const [index, row] of rows.entries()) {
    const parsed = transactionInputSchema.safeParse(row);
    if (!parsed.success) return fail(`${index + 1}번째 문자: ${firstError(parsed.error)}`);
    if (row.occurredTime !== null && !TIME.test(row.occurredTime)) {
      return fail(`${index + 1}번째 문자: 시간을 확인해 주세요`);
    }
    const v = parsed.data;
    values.push({
      type: v.type,
      amount: v.amount,
      occurred_on: v.occurredOn,
      occurred_time: row.occurredTime,
      category_id: v.categoryId,
      merchant: v.merchant,
      memo: v.memo,
      payment_method_id: v.paymentMethodId,
      scope: v.scope,
      member_slot: v.memberSlot,
      source: "sms",
    });
  }

  const me = await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .insert(values.map((v) => ({ ...v, household_id: me.householdId, created_by: me.id, updated_by: me.id })));
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return { ...ok(), count: values.length };
}
