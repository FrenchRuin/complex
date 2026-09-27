"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { todayKST } from "@/lib/date";
import { requireMember } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

/** 정산 완료로 기록 (F-24). 오늘까지의 공동 지출을 DB가 다시 계산해 저장한다 */
export async function recordSettlement(): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_settlement", { p_period_end: todayKST() });
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}
