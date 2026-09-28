"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { daysBetween } from "@/lib/calc/events";
import { requireMember } from "@/lib/household";
import { eventInputSchema, firstError, idSchema, type EventInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

/** 일정 추가·수정 (F-19). 반복 일정은 전체가 바뀐다. 가구·작성자는 DB가 채운다. */
export async function saveEvent(input: EventInput): Promise<ActionResult & { id?: string }> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  if (daysBetween(v.startDate, v.endDate) > 30) return fail("여러 날 일정은 31일까지 만들 수 있어요");

  const me = await requireMember();
  const supabase = await createClient();
  const values = {
    title: v.title,
    memo: v.memo,
    owner: v.owner,
    start_date: v.startDate,
    end_date: v.endDate,
    all_day: v.allDay,
    start_time: v.startTime,
    end_time: v.endTime,
    repeat: v.repeat,
    repeat_until: v.repeatUntil,
  };

  if (v.id) {
    const { error } = await supabase.from("events").update(values).eq("id", v.id).is("deleted_at", null);
    if (error) return fail(dbErrorMessage(error));
    refresh();
    return { ...ok(), id: v.id };
  }

  const { data, error } = await supabase
    .from("events")
    // 트리거가 로그인한 사람 기준으로 다시 채운다 (화면 값은 믿지 않음)
    .insert({ ...values, household_id: me.householdId, created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ...ok(), id: data.id };
}

/** 삭제(소프트 삭제)·되돌리기. 반복 일정은 전체가 지워진다. */
export async function setEventDeleted(id: string, deleted: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("일정을 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}
