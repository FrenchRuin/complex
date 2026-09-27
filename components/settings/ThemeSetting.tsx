"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { THEME_STORAGE_KEY, applyTheme, toThemeMode, type ThemeMode } from "@/lib/theme";
import { SettingsSection } from "./SettingsSection";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

const listeners = new Set<() => void>();

function read(): ThemeMode {
  try {
    return toThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function save(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 저장이 안 되는 환경이면 이번 화면에만 적용된다
  }
  applyTheme(mode);
  listeners.forEach((l) => l());
}

/** 화면 모드 고르기 (F-53). 이 기기에만 저장된다 */
export function ThemeSetting() {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as ThemeMode);

  return (
    <SettingsSection
      title="화면 모드"
      description="시스템은 폰 설정(밝게/어둡게)을 따라가요. 이 기기에만 저장되니 각자 원하는 모드로 쓰면 돼요."
    >
      <SegmentedControl legend="화면 모드" options={OPTIONS} value={mode} onChange={save} />
    </SettingsSection>
  );
}
