"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { overrideError } from "@/lib/calc/period";
import { requireMember } from "@/lib/household";
import { getPeriodConfig } from "@/lib/period";
import { dateStringSchema, firstError } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 기간이 바뀌면 거의 모든 돈 화면의 숫자가 바뀐다 */
function refresh() {
  revalidatePath("/", "layout");
}

const settingsSchema = z.object({
  startDay: z.number().int().min(1, "1일부터 28일까지 고를 수 있어요").max(28, "1일부터 28일까지 고를 수 있어요"),
  label: z.enum(["start", "end"]),
  shift: z.boolean(),
});

/** 한 달 기준 저장 (F-56): 시작일, 이름 방식, 주말·공휴일이면 앞 평일로 */
export async function savePeriodSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_period_settings", {
    p_start_day: parsed.data.startDay,
    p_label: parsed.data.label,
    p_shift: parsed.data.shift,
  });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}

/** 그 달만 시작일 직접 고치기 (실제 월급이 다른 날 들어온 달). 앞뒤 달과 순서가 맞아야 한다 */
export async function setPeriodOverride(month: string, startDate: string): Promise<ActionResult> {
  if (!MONTH.test(month)) return fail("잘못된 요청이에요. 새로고침해 주세요");
  const date = dateStringSchema.safeParse(startDate);
  if (!date.success) return fail(firstError(date.error));

  const cfg = await getPeriodConfig();
  const problem = overrideError(month, date.data, cfg);
  if (problem) return fail(problem);

  const me = await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("period_overrides")
    .upsert(
      { household_id: me.householdId, month: `${month}-01`, start_date: date.data },
      { onConflict: "household_id,month" },
    );
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}

/** 직접 고친 시작일을 원래대로 (규칙대로) */
export async function clearPeriodOverride(month: string): Promise<ActionResult> {
  if (!MONTH.test(month)) return fail("잘못된 요청이에요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("period_overrides").delete().eq("month", `${month}-01`);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}
