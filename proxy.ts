import { NextResponse, type NextRequest } from "next/server";
import { getUserAndResponse } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await getUserAndResponse(request);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
