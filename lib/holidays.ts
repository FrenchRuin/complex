import { getHolidayPreset } from "@hyunbinseo/holidays-kr";
import { cache } from "react";
import { parseHolidayFile, type CustomHoliday, type HolidayMap } from "./calc/holidays";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/** 라이브러리가 올려 두는 전체 공휴일 파일 (정부 월력요항, 새 해가 발표되면 갱신) */
const HOLIDAY_FILE_URL = "https://holidays.hyunbin.page/basic.json";

/** 받아 둔 공휴일 (holiday_presets): 해 → 날짜 → 이름들 */
const getStoredPresets = cache(async (): Promise<Record<number, Record<string, string[]>>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("holiday_presets").select("date, year, names");
  if (error) throw new Error(`공휴일을 불러오지 못했어요: ${error.message}`);
  const byYear: Record<number, Record<string, string[]>> = {};
  for (const row of data) (byYear[row.year] ??= {})[row.date] = row.names;
  return byYear;
});

/** 설치된 라이브러리의 그 해 공휴일 (없는 해는 null) */
async function libraryPreset(year: number): Promise<HolidayMap | null> {
  try {
    return await getHolidayPreset(String(year));
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/**
 * 그 해 기본 공휴일 (F-55). 인터넷에서 받아 둔 것이 있으면 그것을, 없으면 설치된 라이브러리를 쓴다.
 * 둘 다 없는 해는 빈 목록 (주말과 직접 추가한 날만으로 계산).
 */
export const getPresetHolidays = cache(async (year: number): Promise<HolidayMap> => {
  const stored = (await getStoredPresets())[year];
  if (stored && Object.keys(stored).length > 0) return stored;
  return (await libraryPreset(year)) ?? {};
});

/** 기본 공휴일 데이터가 있는 해인지 (설정 화면 안내용) */
export async function hasPresetYear(year: number): Promise<boolean> {
  return Object.keys(await getPresetHolidays(year)).length > 0;
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

/** 마지막으로 공휴일을 받은 시각·확인한 시각 */
export async function getHolidaySync(): Promise<{ fetchedAt: string | null; checkedAt: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.from("holiday_sync").select("fetched_at, checked_at").eq("id", 1).maybeSingle();
  return { fetchedAt: data?.fetched_at ?? null, checkedAt: data?.checked_at ?? null };
}

export type HolidaySyncResult = { ok: true; newYears: number[]; years: number[] } | { ok: false; reason: "network" | "format" };

/**
 * 인터넷 공휴일 파일을 받아 저장한다. 받은 해는 통째로 바꾼다(발표가 바뀐 날도 반영).
 * 파일을 못 받거나 형식이 이상하면 아무것도 바꾸지 않는다. 쓰기는 서비스 키로.
 */
export async function syncHolidayPresets(): Promise<HolidaySyncResult> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db.from("holiday_sync").update({ checked_at: now }).eq("id", 1);

  let json: unknown;
  try {
    const response = await fetch(HOLIDAY_FILE_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { ok: false, reason: "network" };
    json = await response.json();
  } catch {
    return { ok: false, reason: "network" };
  }
  const rows = parseHolidayFile(json);
  if (!rows) return { ok: false, reason: "format" };

  const years = [...new Set(rows.map((r) => r.year))].sort();
  const { data: before } = await db.from("holiday_presets").select("year");
  const hadYears = new Set((before ?? []).map((r) => r.year));
  // 라이브러리에 이미 있던 해도 "새로 받은 해"로 치지 않는다
  const libraryYears = new Set(
    (await Promise.all(years.map(async (y) => ((await libraryPreset(y)) ? y : null)))).filter((y) => y !== null),
  );

  const { error: deleteError } = await db.from("holiday_presets").delete().in("year", years);
  if (deleteError) throw new Error(`공휴일을 저장하지 못했어요: ${deleteError.message}`);
  const { error: insertError } = await db
    .from("holiday_presets")
    .insert(rows.map((r) => ({ date: r.date, year: r.year, names: r.names, fetched_at: now })));
  if (insertError) throw new Error(`공휴일을 저장하지 못했어요: ${insertError.message}`);
  await db.from("holiday_sync").update({ fetched_at: now }).eq("id", 1);

  return { ok: true, years, newYears: years.filter((y) => !hadYears.has(y) && !libraryYears.has(y)) };
}

/** 자동 받기는 하루에 한 번까지 */
const AUTO_CHECK_MS = 24 * 60 * 60 * 1000;

/** 내년 공휴일이 아직 없으면 한 번 받아 온다 (하루 한 번까지, 실패해도 조용히). 설정 → 공휴일을 열 때 */
export async function autoSyncHolidays(nextYear: number): Promise<void> {
  const { checkedAt } = await getHolidaySync();
  const checkedLongAgo = !checkedAt || Date.now() - new Date(checkedAt).getTime() > AUTO_CHECK_MS;
  if (!checkedLongAgo) return;
  // 캐시된 목록(getPresetHolidays)을 여기서 읽으면 받은 직후 화면에 옛 목록이 남으므로 직접 확인한다
  const supabase = await createClient();
  const { count } = await supabase.from("holiday_presets").select("date", { count: "exact", head: true }).eq("year", nextYear);
  if ((count ?? 0) > 0 || (await libraryPreset(nextYear))) return;
  await syncHolidayPresets().catch(() => null);
}
