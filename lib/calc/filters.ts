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
  /** 검색어가 금액이면 그 금액 (예: "12,000" → 12000). 금액이 딱 같은 내역도 찾는다 */
  amount: number | null;
  /** 검색 중 "이번 달만 보기"를 눌렀는지. 아니면 검색은 전체 기간 */
  thisMonthOnly: boolean;
  /** 전체 기간 검색 결과를 몇 건까지 보여줄지 ("더 보기"로 늘어남) */
  limit: number;
  /** 캘린더에서 고른 날 (F-13) */
  day: DateString | null;
};

export const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_LIMIT = 2000;

/** 검색어가 있고 "이번 달만"이 아니면 전체 기간 검색 */
export function isSearchAll(filters: TransactionFilters): boolean {
  return filters.q !== "" && !filters.thisMonthOnly;
}

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

/** "12,000", "12000원", "12 000" 처럼 숫자로만 된 검색어면 금액 */
function amountOf(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[\d,\s]+원?$/.test(trimmed) || !/\d/.test(trimmed)) return null;
  const value = Number(trimmed.replace(/[^\d]/g, ""));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function parseFilters(params: RawParams, currentMonth: MonthString): TransactionFilters {
  const monthParam = single(params.month);
  const month = MONTH.test(monthParam) ? monthParam : currentMonth;
  const who = single(params.who);
  const type = single(params.type);
  const day = single(params.day);
  const rawQ = single(params.q);
  const amount = amountOf(rawQ);
  const limit = Number(single(params.limit));

  return {
    month,
    who: who === "joint" || who === "a" || who === "b" ? who : "all",
    type: type === "expense" || type === "income" ? type : "all",
    categories: idList(params.cat),
    paymentMethods: idList(params.pm),
    // 금액이면 숫자만 남긴다 (쉼표는 필터 문법을 깨므로)
    q: amount !== null ? String(amount) : sanitizeSearch(rawQ),
    amount,
    thisMonthOnly: single(params.period) === "month",
    limit:
      Number.isInteger(limit) && limit > SEARCH_PAGE_SIZE ? Math.min(limit, MAX_SEARCH_LIMIT) : SEARCH_PAGE_SIZE,
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
  if (f.q && f.thisMonthOnly) params.set("period", "month");
  if (f.q && !f.thisMonthOnly && f.limit > SEARCH_PAGE_SIZE) params.set("limit", String(f.limit));
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
