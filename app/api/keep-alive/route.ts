import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase 무료 프로젝트는 7일 동안 요청이 없으면 일시 정지된다. Vercel Cron이 하루 한 번 이 주소를 불러
 * DB를 아주 작게 한 번 읽어 둔다 (vercel.json의 crons). 읽기만 하고 아무것도 바꾸지 않는다.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { error } = await createAdminClient().from("households").select("id").limit(1);
  if (error) {
    console.error("깨우기 실패", error);
    return NextResponse.json({ error: "db_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
