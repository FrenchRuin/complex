/**
 * 서비스 키로 DB를 쓰는 서버 전용 클라이언트. RLS를 건너뛰므로 꼭 필요한 곳(푸시 보내기, 공휴일 저장)에서만 쓴다.
 * SUPABASE_SERVICE_ROLE_KEY는 절대 브라우저 번들에 들어가면 안 된다.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

if (typeof window !== "undefined") {
  throw new Error("admin 클라이언트는 서버에서만 쓸 수 있어요");
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY가 비어 있어요. .env.local과 Vercel 환경변수를 확인해 주세요");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
