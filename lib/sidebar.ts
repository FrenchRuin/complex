/**
 * 웹 사이드바 접기 (2026-09-30). 기기마다 쿠키로 기억해 서버가 처음부터 맞는 폭으로 그린다 (깜빡임 없음).
 */
export const SIDEBAR_COOKIE = "sidebar-collapsed";

/** 브라우저에서 접힘 상태 저장 (1년) */
export function saveSidebarCollapsed(collapsed: boolean) {
  document.cookie = collapsed
    ? `${SIDEBAR_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${SIDEBAR_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
