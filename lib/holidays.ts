import { getHolidayPreset } from "@hyunbinseo/holidays-kr";
import { cache } from "react";
import type { CustomHoliday, HolidayMap } from "./calc/holidays";
import { createClient } from "./supabase/server";

/**
 * 그 해 기본 공휴일 (F-55). 라이브러리(@hyunbinseo/holidays-kr)는 해마다 다음 해 데이터가 추가되므로
 * 1년에 한 번 업데이트한다. 데이터가 없는 해는 빈 목록 (주말과 직접 추가한 날만으로 계산).
 */
export const getPresetHolidays = cache(async (year: number): Promise<HolidayMap> => {
  try {
    return await getHolidayPreset(String(year));
  } catch (error) {
    if (error instanceof RangeError) return {};
    throw error;
  }
});

/** 이 라이브러리에 데이터가 있는 해인지 (설정 화면 안내용) */
export async function hasPresetYear(year: number): Promise<boolean> {
  try {
    await getHolidayPreset(String(year));
    return true;
  } catch {
    return false;
  }
}

/** 우리 가구가 고친 공휴일 (추가/빼기), 지운 것 빼고 */
export const getCustomHolidays = cache(async (): Promise<CustomHoliday[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_holidays")
    .select("id, date, kind, name")
    .is("deleted_at", null)
    .order("date");
  if (error) throw new Error(`공휴일 설정을 불러오지 못했어요: ${error.message}`);
  return data.map((c) => ({ id: c.id, date: c.date, kind: c.kind === "remove" ? "remove" : "add", name: c.name }));
});

/** 여러 해의 기본 공휴일을 하나로 */
export async function getPresetHolidaysForYears(years: readonly number[]): Promise<HolidayMap> {
  const maps = await Promise.all([...new Set(years)].map((y) => getPresetHolidays(y)));
  return Object.assign({}, ...maps);
}
