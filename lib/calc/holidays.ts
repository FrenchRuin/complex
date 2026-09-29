/**
 * 공휴일 계산 (F-55). 기본 공휴일(라이브러리, 정부 월력요항) + 가구에서 고친 것(추가/빼기).
 * 쉬는 날 = 주말 + 공휴일. 월급날 계산(쉬는 날이면 앞 평일)에 쓴다.
 */
import { addDays, weekdayOf, type DateString } from "@/lib/date";

/** 날짜 → 공휴일 이름들 */
export type HolidayMap = Readonly<Record<DateString, readonly string[]>>;

export type CustomHoliday = { id: string; date: DateString; kind: "add" | "remove"; name: string };

/** 설정 화면 목록 한 줄 */
export type HolidayEntry = {
  date: DateString;
  names: readonly string[];
  /** preset: 기본 공휴일, custom: 직접 추가 */
  source: "preset" | "custom";
  /** 기본 공휴일인데 "쉬는 날 아님"으로 뺀 것 */
  removed: boolean;
  /** 직접 추가·빼기 설정의 id (되돌리기용) */
  customId: string | null;
};

/** 실제로 쉬는 공휴일: 기본 + 추가 − 빼기 (주말은 넣지 않는다) */
export function effectiveHolidays(preset: HolidayMap, custom: readonly CustomHoliday[]): HolidayMap {
  const out: Record<DateString, readonly string[]> = { ...preset };
  for (const c of custom) {
    if (c.kind === "remove") delete out[c.date];
    else out[c.date] = [...(preset[c.date] ?? []), c.name];
  }
  return out;
}

/** 설정 화면 목록: 기본 공휴일(뺀 것 포함) + 직접 추가, 날짜순 */
export function holidayEntries(preset: HolidayMap, custom: readonly CustomHoliday[]): HolidayEntry[] {
  const byDate = new Map(custom.map((c) => [c.date, c]));
  const entries: HolidayEntry[] = Object.entries(preset).map(([date, names]) => {
    const c = byDate.get(date);
    return { date, names, source: "preset", removed: c?.kind === "remove", customId: c?.kind === "remove" ? c.id : null };
  });
  for (const c of custom) {
    if (c.kind === "add" && !(c.date in preset)) {
      entries.push({ date: c.date, names: [c.name], source: "custom", removed: false, customId: c.id });
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function isWeekend(date: DateString): boolean {
  const day = weekdayOf(date);
  return day === 0 || day === 6;
}

/** 평일: 주말도 공휴일도 아닌 날 */
export function isBusinessDay(date: DateString, holidays: HolidayMap): boolean {
  return !isWeekend(date) && !(date in holidays);
}

/** 그날이 평일이면 그날, 아니면 그 앞의 가장 가까운 평일 (월급날 당기기) */
export function previousBusinessDay(date: DateString, holidays: HolidayMap): DateString {
  let d = date;
  // 연휴가 아무리 길어도 한 달을 넘지 않는다
  for (let i = 0; i < 31 && !isBusinessDay(d, holidays); i += 1) d = addDays(d, -1);
  return d;
}

/** 받아 온 공휴일 파일 한 줄 (DB holiday_presets) */
export type PresetRow = { date: DateString; year: number; names: string[] };

const YEAR = /^\d{4}$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * 인터넷 공휴일 파일(basic.json: { "2026": { "2026-01-01": ["1월 1일"], ... }, ... }) 검사·변환.
 * 형식이 조금이라도 이상하면 전부 버린다 (null). 해마다 공휴일이 5~40일이어야 정상으로 본다.
 */
export function parseHolidayFile(data: unknown): PresetRow[] | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const rows: PresetRow[] = [];
  const years = Object.entries(data as Record<string, unknown>);
  if (years.length === 0) return null;
  for (const [year, days] of years) {
    if (!YEAR.test(year) || typeof days !== "object" || days === null || Array.isArray(days)) return null;
    const entries = Object.entries(days as Record<string, unknown>);
    if (entries.length < 5 || entries.length > 40) return null;
    for (const [date, names] of entries) {
      if (!DAY.test(date) || !date.startsWith(`${year}-`)) return null;
      if (!Array.isArray(names) || names.length < 1 || names.length > 5) return null;
      if (!names.every((n) => typeof n === "string" && n.trim().length >= 1 && n.length <= 30)) return null;
      rows.push({ date, year: Number(year), names: names.map((n: string) => n.trim()) });
    }
  }
  return rows;
}
