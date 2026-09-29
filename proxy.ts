import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일, 이미지, 글꼴은 제외
    // 앱 설치 정보(manifest)와 아이콘도 로그인 없이 읽혀야 한다 (폰이 설치 전에 가져감)
    // 알림 서비스 워커(sw.js)와 DB가 부르는 푸시 경로(api/push)도 로그인 없이 (F-57)
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|api/push|icon|apple-icon|app-icon/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
