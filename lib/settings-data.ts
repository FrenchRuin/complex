import { headers } from "next/headers";
import { cache } from "react";
import { toCategoryType, toOwner, toPaymentKind } from "./domain";
import { createClient } from "./supabase/server";

function loadError(what: string, error: { message: string }): Error {
  return new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
}

/** 숨긴 것까지 포함한 카테고리 전체 (설정 관리용) */
export const getAllCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, type, name, icon, sort_order, is_hidden");
  if (error) throw loadError("카테고리", error);
  return data.map((c) => ({ ...c, type: toCategoryType(c.type) }));
});

/** 숨긴 것까지 포함한 결제수단 전체 (설정 관리용) */
export const getAllPaymentMethods = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, kind, owner, sms_aliases, sort_order, is_hidden");
  if (error) throw loadError("결제수단", error);
  return data.map((m) => ({ ...m, kind: toPaymentKind(m.kind), owner: toOwner(m.owner) }));
});

/** 아직 쓰지 않은 유효한 초대 1건 */
export async function getActiveInvite(): Promise<{ token: string; expiresAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("token, expires_at")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw loadError("초대", error);
  return data[0] ? { token: data[0].token, expiresAt: data[0].expires_at } : null;
}

export type Usage = {
  dbSizeBytes: number;
  transactionCount: number;
  recurringCount: number;
  lastActivity: string | null;
};

/** 서비스 사용량 (F-54) */
export const getUsage = cache(async (): Promise<Usage | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_usage");
  const row = data?.[0];
  if (!row) return null;
  return {
    dbSizeBytes: row.db_size_bytes,
    transactionCount: row.transaction_count,
    recurringCount: row.recurring_count,
    lastActivity: row.last_activity,
  };
});

/** 초대 링크에 쓸 사이트 주소 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function supabaseProjectRef(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;
}
