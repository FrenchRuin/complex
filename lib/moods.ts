import { cache } from "react";
import { pickToday, type TodayMood } from "./calc/mood";
import { todayKST } from "./date";
import { createClient } from "./supabase/server";

/** 우리 가구의 오늘 기분 (F-04). RLS가 같은 가구로 좁힌다. 사람 id → 기분 */
export const getTodayMoods = cache(async (): Promise<Record<string, TodayMood>> => {
  const today = todayKST();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moods")
    .select("member_id, mood_date, mood, note, deleted_at")
    .eq("mood_date", today)
    .is("deleted_at", null);
  if (error) throw new Error(`오늘 기분을 불러오지 못했어요: ${error.message}`);
  return pickToday(data, today);
});
