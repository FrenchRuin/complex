/**
 * 로그인 후 돌아갈 경로. 우리 사이트 안의 경로(/로 시작)만 허용해
 * 다른 사이트로 튀는 것(오픈 리다이렉트)을 막는다.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  // "//evil.com", "/\evil.com" 은 브라우저가 다른 사이트로 해석한다
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (value === "/login" || value.startsWith("/login?")) return null;
  return value;
}
