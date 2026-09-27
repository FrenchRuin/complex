import { cache } from "react";
import { toOwner, toPaymentKind, type CategoryType, type Owner, type PaymentKind } from "./domain";
import { createClient } from "./supabase/server";

export type CategoryOption = { id: string; type: CategoryType; name: string; icon: string };
export type PaymentMethodOption = { id: string; name: string; kind: PaymentKind; owner: Owner };

/** 숨기지 않은 카테고리 (종류별 순서대로). 내역 입력·필터에 쓴다. */
export const getVisibleCategories = cache(async (): Promise<CategoryOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, type, name, icon")
    .eq("is_hidden", false)
    .order("type")
    .order("sort_order");
  if (error) throw new Error(`카테고리를 불러오지 못했어요: ${error.message}`);
  return data.map((c) => ({ ...c, type: c.type === "income" ? "income" : "expense" }));
});

/** 가맹점 규칙: 정리한 가맹점 이름 → 카테고리 id (F-16) */
export const getMerchantRules = cache(async (): Promise<Record<string, string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("merchant_rules").select("merchant_key, category_id");
  if (error) throw new Error(`가맹점 규칙을 불러오지 못했어요: ${error.message}`);
  return Object.fromEntries(data.map((r) => [r.merchant_key, r.category_id]));
});

/** 숨기지 않은 결제수단 (순서대로) */
export const getVisiblePaymentMethods = cache(async (): Promise<PaymentMethodOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, kind, owner")
    .eq("is_hidden", false)
    .order("sort_order");
  if (error) throw new Error(`결제수단을 불러오지 못했어요: ${error.message}`);
  return data.map((m) => ({ ...m, kind: toPaymentKind(m.kind), owner: toOwner(m.owner) }));
});
