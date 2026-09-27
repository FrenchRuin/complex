import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

/** 로그인 없이 볼 수 있는 경로 */
const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 요청마다 세션을 갱신하고, 로그인 여부와 허용 이메일을 확인한다.
 * - 로그인 안 함 → /login?next=원래 경로
 * - 허용되지 않은 이메일 → 로그아웃 후 /login?error=not-allowed
 * - 로그인한 사람이 /login → next 또는 /
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // createServerClient와 getClaims 사이에 다른 코드를 넣지 않는다 (세션이 끊길 수 있음).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, search = "") => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = search;
    const redirect = NextResponse.redirect(target);
    // 갱신·삭제된 세션 쿠키를 그대로 옮긴다
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!claims) {
    if (isPublicPath(pathname)) return response;
    const next = `${pathname}${request.nextUrl.search}`;
    return redirectTo("/login", pathname === "/" ? "" : `?next=${encodeURIComponent(next)}`);
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return redirectTo("/login", "?error=not-allowed");
  }

  if (isPublicPath(pathname)) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/";
    const [nextPath, nextSearch = ""] = next.split("?");
    return redirectTo(nextPath, nextSearch ? `?${nextSearch}` : "");
  }

  return response;
}
