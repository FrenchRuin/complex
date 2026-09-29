import { cache } from "react";
import { effectiveHolidays } from "./calc/holidays";
import { periodOf, periodRange, type PeriodConfig, type PeriodSettings } from "./calc/period";
import { todayKST, type DateRange, type DateString, type MonthString } from "./date";
import { getCustomHolidays, getPresetHolidaysForYears } from "./holidays";
import { createClient } from "./supabase/server";

/** 우리 가구의 한 달 기준 설정 (F-56) */
export const getPeriodSettings = cache(async (): Promise<PeriodSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("households")
    .select("period_start_day, period_label, period_shift")
    .limit(1)
    .single();
  if (error) throw new Error(`한 달 기준을 불러오지 못했어요: ${error.message}`);
  return {
    startDay: data.period_start_day,
    label: data.period_label === "start" ? "start" : "end",
    shift: data.period_shift,
  };
});

/** 달마다 직접 고친 시작일: 달 이름(yyyy-MM) → 시작일 */
export const getPeriodOverrides = cache(async (): Promise<Record<MonthString, DateString>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("period_overrides").select("month, start_date");
  if (error) throw new Error(`시작일 설정을 불러오지 못했어요: ${error.message}`);
  return Object.fromEntries(data.map((o) => [o.month.slice(0, 7), o.start_date]));
});

/**
 * 기간 계산에 필요한 전부: 설정 + 직접 고친 시작일 + 쉬는 공휴일.
 * 공휴일은 라이브러리에 있는 해(2018~)부터 내후년까지 한 번에 불러온다 (해마다 20일 남짓이라 가볍다).
 */
export const getPeriodConfig = cache(async (): Promise<PeriodConfig> => {
  const thisYear = Number(todayKST().slice(0, 4));
  const years = Array.from({ length: thisYear + 3 - 2018 }, (_, i) => 2018 + i);
  const [settings, overrides, preset, custom] = await Promise.all([
    getPeriodSettings(),
    getPeriodOverrides(),
    getPresetHolidaysForYears(years),
    getCustomHolidays(),
  ]);
  return { ...settings, overrides, holidays: effectiveHolidays(preset, custom) };
});

/** 오늘이 속한 기간 */
export const getCurrentPeriod = cache(async (): Promise<{ month: MonthString; range: DateRange }> => {
  const cfg = await getPeriodConfig();
  const month = periodOf(todayKST(), cfg);
  return { month, range: periodRange(month, cfg) };
});
