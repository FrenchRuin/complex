"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { getPresetHolidays, syncHolidayPresets } from "@/lib/holidays";
import { dateStringSchema, firstError, idSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
}

const addSchema = z.object({
  date: dateStringSchema,
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(20, "이름은 20자까지 쓸 수 있어요"),
});

/** 같은 날짜에 이미 살아 있는 설정이 있으면 (unique 인덱스) */
function duplicateMessage(error: { code?: string; message: string }): string {
  return error.code === "23505" ? "이 날짜는 이미 공휴일 설정이 있어요. 목록에서 확인해 주세요" : dbErrorMessage(error);
}

/** 공휴일 직접 추가 (임시공휴일, 회사 휴무 등). 이미 기본 공휴일인 날은 추가할 필요가 없다 */
export async function addCustomHoliday(date: string, name: string): Promise<ActionResult & { id?: string }> {
  const parsed = addSchema.safeParse({ date, name });
  if (!parsed.success) return fail(firstError(parsed.error));
  const preset = await getPresetHolidays(Number(parsed.data.date.slice(0, 4)));
  if (parsed.data.date in preset) return fail("이미 공휴일인 날이에요");

  const me = await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_holidays")
    // 가구·작성자는 트리거가 로그인한 사람 기준으로 다시 채운다
    .insert({ date: parsed.data.date, kind: "add", name: parsed.data.name, household_id: me.householdId, created_by: me.id })
    .select("id")
    .single();
  if (error) return fail(duplicateMessage(error));
  refresh();
  return { ...ok(), id: data.id };
}

/** 기본 공휴일을 "쉬는 날 아님"으로 빼기 */
export async function excludePresetHoliday(date: string): Promise<ActionResult & { id?: string }> {
  const parsed = dateStringSchema.safeParse(date);
  if (!parsed.success) return fail(firstError(parsed.error));
  const preset = await getPresetHolidays(Number(parsed.data.slice(0, 4)));
  if (!(parsed.data in preset)) return fail("기본 공휴일이 아니에요. 새로고침해 주세요");

  const me = await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_holidays")
    .insert({ date: parsed.data, kind: "remove", household_id: me.householdId, created_by: me.id })
    .select("id")
    .single();
  if (error) return fail(duplicateMessage(error));
  refresh();
  return { ...ok(), id: data.id };
}

/** 직접 추가·빼기 설정 지우기(소프트 삭제)·되돌리기. 지우면 기본 상태로 돌아간다 */
export async function setCustomHolidayDeleted(id: string, deleted: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("공휴일 설정을 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_holidays")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(duplicateMessage(error));
  refresh();
  return ok();
}

/** "최신 공휴일 받기": 인터넷 공휴일 파일을 받아 저장 (F-55) */
export async function refreshHolidays(): Promise<ActionResult & { message?: string }> {
  await requireMember();
  try {
    const result = await syncHolidayPresets();
    if (!result.ok) {
      return fail(
        result.reason === "network"
          ? "지금은 공휴일을 받을 수 없어요. 잠시 후 다시 시도해 주세요"
          : "받아 온 공휴일 형식이 이상해서 저장하지 않았어요. 나중에 다시 시도해 주세요",
      );
    }
    revalidatePath("/", "layout");
    const message = result.newYears.length
      ? `${result.newYears.join(", ")}년 공휴일을 새로 받았어요`
      : `이미 최신이에요 (${result.years[0]}~${result.years.at(-1)}년)`;
    return { ...ok(), message };
  } catch {
    return fail("공휴일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요");
  }
}
