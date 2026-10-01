/**
 * 서비스 사용량 표시 계산 (F-54).
 */

/** Supabase 무료 플랜 데이터베이스 한도 */
export const FREE_DB_LIMIT_BYTES = 500 * 1024 * 1024;
/** 무료 프로젝트 일시 정지까지 요청 없는 기간 */
export const PAUSE_AFTER_DAYS = 7;

/** 1234567 → "1.2MB" (1024 단위, 소수 첫째 자리) */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  return `${text}${units[unit]}`;
}

/** 한도 대비 사용률(%) — 0~100, 1% 미만이지만 0이 아니면 1로 올려 보여준다 */
export function usagePercent(used: number, limit: number): number {
  if (used <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round((used / limit) * 100)));
}

/** 일시 정지 안내 문구. 하루 한 번 Vercel Cron이 DB를 깨운다 (/api/keep-alive) */
export function pauseNotice(): string {
  return `무료 프로젝트는 ${PAUSE_AFTER_DAYS}일 동안 요청이 없으면 일시 정지돼요. 하루 한 번 자동으로 깨워 둬서 앱을 안 열어도 괜찮아요.`;
}
