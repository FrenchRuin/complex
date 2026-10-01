"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { moodInputSchema } from "@/lib/calc/mood";
import { requireMember } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

/** 오늘 기분 정하기 (F-04). 날짜는 DB가 한국 시각으로 정한다 */
export async function saveMood(input: { mood: string; note: string | null }): Promise<ActionResult> {
  const parsed = moodInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_mood", { p_mood: parsed.data.mood, p_note: parsed.data.note ?? "" });
  if (error) return fail("기분을 저장하지 못했어요. 잠시 후 다시 시도해 주세요");
  revalidatePath("/", "layout");
  return ok();
}

/** 오늘 기분 지우기 (소프트 삭제, 알림 없음) */
export async function clearMood(): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_my_mood");
  if (error) return fail("기분을 지우지 못했어요. 잠시 후 다시 시도해 주세요");
  revalidatePath("/", "layout");
  return ok();
}
