"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { daysBetween } from "@/lib/calc/events";
import { requireMember } from "@/lib/household";
import { dateStringSchema, eventInputSchema, firstError, idSchema, type EventInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/schedule");
  revalidatePath("/");
}

/** 반복 일정의 회차 하나: 일정 id + 그 회차 시작 날짜 */
export type OccurrenceRef = { eventId: string; date: string };

function parseOccurrence(ref: OccurrenceRef): boolean {
  return idSchema.safeParse(ref.eventId).success && dateStringSchema.safeParse(ref.date).success;
}

/**
 * 일정 추가·수정 (F-19). 반복 일정은 전체가 바뀐다. 가구·작성자는 DB가 채운다.
 * detachFrom이 있으면 "이 일정만 고치기": 그 회차를 반복에서 떼어 낸 한 번짜리 일정에 저장한다.
 */
export async function saveEvent(input: EventInput, detachFrom?: OccurrenceRef): Promise<ActionResult & { id?: string }> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const v = parsed.data;
  if (daysBetween(v.startDate, v.endDate) > 30) return fail("여러 날 일정은 31일까지 만들 수 있어요");
  if (detachFrom && (!parseOccurrence(detachFrom) || v.id || v.repeat !== "none")) {
    return fail("일정을 찾을 수 없어요. 새로고침해 주세요");
  }

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

  let id = v.id;
  if (detachFrom) {
    const { data, error } = await supabase.rpc("detach_event_occurrence", {
      p_event_id: detachFrom.eventId,
      p_date: detachFrom.date,
    });
    if (error) return fail(dbErrorMessage(error));
    id = data;
  }

  if (id) {
    const { error } = await supabase.from("events").update(values).eq("id", id).is("deleted_at", null);
    if (error) return fail(dbErrorMessage(error));
    refresh();
    return { ...ok(), id };
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

/** 반복 일정의 회차 하나만 지우기·되돌리기 ("이 일정만 삭제"). 반복 일정의 건너뛸 날짜에 넣고 뺀다. */
export async function setEventOccurrenceSkipped(ref: OccurrenceRef, skipped: boolean): Promise<ActionResult> {
  if (!parseOccurrence(ref)) return fail("일정을 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_occurrence_skipped", {
    p_event_id: ref.eventId,
    p_date: ref.date,
    p_skipped: skipped,
  });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}
