import type { PersonFilter, TransactionFilters } from "./calc/filters";
import { monthRange, type DateRange } from "./date";
import { toCategoryType, toScope, toSlot, type CategoryType, type Scope, type Slot } from "./domain";
import { createClient } from "./supabase/server";

/** 화면에서 쓰는 내역 한 건 */
export type TransactionRecord = {
  id: string;
  type: CategoryType;
  amount: number;
  occurredOn: string;
  categoryId: string;
  merchant: string | null;
  memo: string | null;
  paymentMethodId: string | null;
  scope: Scope;
  memberSlot: Slot;
  /** manual / sms / recurring / import */
  source: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS =
  "id, type, amount, occurred_on, category_id, merchant, memo, payment_method_id, scope, member_slot, source, created_by, updated_by, created_at, updated_at";

type Query = Partial<Omit<TransactionFilters, "month" | "day">> & {
  range?: DateRange;
  limit?: number;
};

/**
 * 내역 조회 (삭제 제외, 최근 날짜 먼저).
 * 사람 필터: 공동 = scope joint, A = A의 개인만 (SPEC §6)
 */
async function fetchTransactions(q: Query): Promise<TransactionRecord[]> {
  const supabase = await createClient();
  let query = supabase.from("transactions").select(COLUMNS).is("deleted_at", null);

  if (q.range) query = query.gte("occurred_on", q.range.start).lte("occurred_on", q.range.end);
  if (q.who === "joint") query = query.eq("scope", "joint");
  if (q.who === "a" || q.who === "b") query = query.eq("scope", "personal").eq("member_slot", q.who);
  if (q.type && q.type !== "all") query = query.eq("type", q.type);
  if (q.categories?.length) query = query.in("category_id", q.categories);
  if (q.paymentMethods?.length) query = query.in("payment_method_id", q.paymentMethods);
  if (q.q) {
    // 가맹점·메모 부분 일치, 검색어가 금액이면 그 금액인 내역도
    const amount = q.amount ? `,amount.eq.${q.amount}` : "";
    query = query.or(`merchant.ilike.*${q.q}*,memo.ilike.*${q.q}*${amount}`);
  }

  query = query.order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (q.limit) query = query.limit(q.limit);

  const { data, error } = await query;
  if (error) throw new Error(`내역을 불러오지 못했어요: ${error.message}`);
  return data.map(toRecord);
}

/** 한 달치 내역. 캘린더 합계도 같은 목록으로 내므로 day 필터는 여기서 쓰지 않는다. */
export function getMonthTransactions(filters: TransactionFilters): Promise<TransactionRecord[]> {
  return fetchTransactions({ ...filters, range: monthRange(filters.month) });
}

/** 전체 기간 검색: 날짜 제한 없이 최근 것부터 최대 2000건 (요약 합계용), 화면에는 limit건만 */
export function searchAllTransactions(filters: TransactionFilters): Promise<TransactionRecord[]> {
  return fetchTransactions({ ...filters, limit: 2000 });
}

/** 기간 안의 모든 내역 (사람 필터 없음 — 홈에서 나눠 계산) */
export function getTransactionsInRange(range: DateRange): Promise<TransactionRecord[]> {
  return fetchTransactions({ range });
}

/** 최근 내역 n건 */
export function getRecentTransactions(who: PersonFilter, limit: number): Promise<TransactionRecord[]> {
  return fetchTransactions({ who, limit });
}

type Row = {
  id: string;
  type: string;
  amount: number;
  occurred_on: string;
  category_id: string;
  merchant: string | null;
  memo: string | null;
  payment_method_id: string | null;
  scope: string;
  member_slot: string;
  source: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

function toRecord(row: Row): TransactionRecord {
  return {
    id: row.id,
    type: toCategoryType(row.type),
    amount: row.amount,
    occurredOn: row.occurred_on,
    categoryId: row.category_id,
    merchant: row.merchant,
    memo: row.memo,
    paymentMethodId: row.payment_method_id,
    scope: toScope(row.scope),
    memberSlot: toSlot(row.member_slot),
    source: row.source,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type PartnerActivity = {
  memberId: string;
  subjectMerchant: string | null;
  categoryId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** 상대가 마지막으로 추가·수정·삭제한 내역 1건 (F-14). 삭제된 것도 포함한다. */
export async function getLatestActivityBy(memberId: string): Promise<PartnerActivity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("merchant, category_id, amount, created_at, updated_at, deleted_at")
    .eq("updated_by", memberId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`최근 활동을 불러오지 못했어요: ${error.message}`);
  if (!data) return null;
  return {
    memberId,
    subjectMerchant: data.merchant,
    categoryId: data.category_id,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    deletedAt: data.deleted_at,
  };
}

export type LabelMaps = {
  categories: Record<string, { name: string; icon: string }>;
  paymentMethods: Record<string, string>;
};

/** 숨긴 것까지 포함한 카테고리·결제수단 이름 (지난 내역 표시용) */
export async function getLabelMaps(): Promise<LabelMaps> {
  const supabase = await createClient();
  const [categories, methods] = await Promise.all([
    supabase.from("categories").select("id, name, icon"),
    supabase.from("payment_methods").select("id, name"),
  ]);
  if (categories.error) throw new Error(`카테고리를 불러오지 못했어요: ${categories.error.message}`);
  if (methods.error) throw new Error(`결제수단을 불러오지 못했어요: ${methods.error.message}`);

  return {
    categories: Object.fromEntries(categories.data.map((c) => [c.id, { name: c.name, icon: c.icon }])),
    paymentMethods: Object.fromEntries(methods.data.map((m) => [m.id, m.name])),
  };
}
