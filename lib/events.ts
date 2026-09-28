import { cache } from "react";
import type { CalendarEvent, EventRepeat } from "./calc/events";
import { toOwner } from "./domain";
import { createClient } from "./supabase/server";

const REPEATS: readonly EventRepeat[] = ["none", "weekly", "monthly", "yearly"];

/** "14:00:00" → "14:00" */
const hhmm = (time: string | null) => (time ? time.slice(0, 5) : null);

/** 우리 가구의 일정 전체 (F-19). 지운 것 빼고. 반복은 화면에서 달마다 펼친다. */
export const getEvents = cache(async (): Promise<CalendarEvent[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, memo, owner, start_date, end_date, all_day, start_time, end_time, repeat, repeat_until, created_by, updated_by, updated_at")
    .is("deleted_at", null)
    .order("start_date")
    .limit(1000);

  if (error) throw new Error(`일정을 불러오지 못했어요: ${error.message}`);

  return data.map((e) => ({
    id: e.id,
    title: e.title,
    memo: e.memo,
    owner: toOwner(e.owner),
    startDate: e.start_date,
    endDate: e.end_date,
    allDay: e.all_day,
    startTime: hhmm(e.start_time),
    endTime: hhmm(e.end_time),
    repeat: (REPEATS as readonly string[]).includes(e.repeat) ? (e.repeat as EventRepeat) : "none",
    repeatUntil: e.repeat_until,
    createdBy: e.created_by,
    updatedBy: e.updated_by,
    updatedAt: e.updated_at,
  }));
});
