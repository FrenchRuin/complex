/**
 * 내역 화면 필터 (F-12). 주소 쿼리 ↔ 필터 값.
 * 기본값은 주소에 쓰지 않아 주소를 짧게 유지한다.
 */
import { monthOf, type DateString, type MonthString } from "@/lib/date";

export type PersonFilter = "all" | "joint" | "a" | "b";
export type TypeFilter = "all" | "expense" | "income";

export type TransactionFilters = {
  month: MonthString;
  who: PersonFilter;
  type: TypeFilter;
  categories: string[];
  paymentMethods: string[];
  q: string;
  /** 캘린더에서 고른 날 (F-13) */
  day: DateString | null;
};

type RawParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function idList(value: string | string[] | undefined): string[] {
  return [...new Set(single(value).split(",").filter((id) => UUID.test(id)))];
}

/** 검색어에서 PostgREST 필터 문법을 깨는 문자를 지운다 */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[%*,()"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
}

export function parseFilters(params: RawParams, currentMonth: MonthString): TransactionFilters {
  const monthParam = single(params.month);
  const month = MONTH.test(monthParam) ? monthParam : currentMonth;
  const who = single(params.who);
  const type = single(params.type);
  const day = single(params.day);

  return {
    month,
    who: who === "joint" || who === "a" || who === "b" ? who : "all",
    type: type === "expense" || type === "income" ? type : "all",
    categories: idList(params.cat),
    paymentMethods: idList(params.pm),
    q: sanitizeSearch(single(params.q)),
    day: DAY.test(day) && monthOf(day) === month ? day : null,
  };
}

/** 필터 → "?month=…&who=…" (기본값은 빼고). 바꿀 값만 넘기면 나머지는 유지 */
export function filtersToHref(
  filters: TransactionFilters,
  currentMonth: MonthString,
  changes: Partial<TransactionFilters> = {},
): string {
  const f = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (f.month !== currentMonth) params.set("month", f.month);
  if (f.who !== "all") params.set("who", f.who);
  if (f.type !== "all") params.set("type", f.type);
  if (f.categories.length) params.set("cat", f.categories.join(","));
  if (f.paymentMethods.length) params.set("pm", f.paymentMethods.join(","));
  if (f.q) params.set("q", f.q);
  if (f.day && monthOf(f.day) === f.month) params.set("day", f.day);
  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/** 기본값이 아닌 세부 필터 개수 (유형·카테고리·결제수단) — 필터 버튼 배지용 */
export function activeFilterCount(filters: TransactionFilters): number {
  return (
    (filters.type !== "all" ? 1 : 0) + filters.categories.length + filters.paymentMethods.length
  );
}
