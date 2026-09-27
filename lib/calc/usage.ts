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

/** 마지막 사용 이후 지난 날 수 (한국 시간 날짜 기준이 아니라 경과 시간 기준, 내림) */
export function daysSince(timestamp: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 86_400_000));
}

/** 일시 정지 안내 문구 */
export function pauseNotice(lastActivity: string | null, now: Date): string {
  if (!lastActivity) return `무료 프로젝트는 ${PAUSE_AFTER_DAYS}일 동안 요청이 없으면 일시 정지돼요.`;
  const days = daysSince(lastActivity, now);
  const left = PAUSE_AFTER_DAYS - days;
  if (left <= 1) {
    return `마지막 입력이 ${days}일 전이에요. 7일 동안 아무도 안 쓰면 일시 정지되니 앱을 한 번 열어 주세요.`;
  }
  return `무료 프로젝트는 ${PAUSE_AFTER_DAYS}일 동안 요청이 없으면 일시 정지돼요. 앱을 열기만 해도 괜찮아요.`;
}
