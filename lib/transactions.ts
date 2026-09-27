import type { TransactionFilters } from "./calc/filters";
import { monthRange } from "./date";
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
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS =
  "id, type, amount, occurred_on, category_id, merchant, memo, payment_method_id, scope, member_slot, created_by, updated_by, created_at, updated_at";

/**
 * 한 달치 내역 (삭제 제외). 캘린더 합계도 같은 목록으로 내므로 day 필터는 여기서 쓰지 않는다.
 * 사람 필터: 공동 = scope joint, A = A의 개인만 (SPEC §6)
 */
export async function getMonthTransactions(filters: TransactionFilters): Promise<TransactionRecord[]> {
  const supabase = await createClient();
  const { start, end } = monthRange(filters.month);

  let query = supabase
    .from("transactions")
    .select(COLUMNS)
    .is("deleted_at", null)
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  if (filters.who === "joint") query = query.eq("scope", "joint");
  if (filters.who === "a" || filters.who === "b") {
    query = query.eq("scope", "personal").eq("member_slot", filters.who);
  }
  if (filters.type !== "all") query = query.eq("type", filters.type);
  if (filters.categories.length) query = query.in("category_id", filters.categories);
  if (filters.paymentMethods.length) query = query.in("payment_method_id", filters.paymentMethods);
  if (filters.q) query = query.or(`merchant.ilike.*${filters.q}*,memo.ilike.*${filters.q}*`);

  const { data, error } = await query
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`내역을 불러오지 못했어요: ${error.message}`);

  return data.map((row) => ({
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
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
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
