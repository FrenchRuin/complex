/**
 * Vercel Cron이 부르는 주소의 비밀값 확인. Vercel은 환경변수 CRON_SECRET을 `Authorization: Bearer <값>`으로 보낸다.
 * 서버에 값이 없으면 "Bearer undefined" 같은 요청이 통과하지 않도록 항상 거절한다.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}
