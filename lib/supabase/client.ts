import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** 브라우저용 Supabase 클라이언트. 실시간 구독에만 쓴다. */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
