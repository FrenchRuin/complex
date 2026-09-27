/**
 * 화면 모드 (F-53): 시스템 / 라이트 / 다크. 기기마다 localStorage에 저장한다.
 */
export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "woori-theme";

export function toThemeMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

/** <html data-theme>에 반영. system이면 속성을 지워 폰 설정을 따르게 한다 */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

/**
 * 첫 화면을 그리기 전에 실행하는 스크립트 (깜빡임 방지).
 * localStorage를 못 쓰는 환경(사생활 보호 모드 등)이면 조용히 시스템 설정을 따른다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(m==="light"||m==="dark"){document.documentElement.dataset.theme=m;}}catch(e){}})();`;
