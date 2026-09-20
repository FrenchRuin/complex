"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 서버는 테마를 모르니 항상 라이트 아이콘을 렌더함 — 하이드레이션 불일치를 피하려고
  // 클라이언트 마운트 후에만 실제 테마 아이콘을 보여주는, next-themes 공식 권장 패턴.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "라이트 모드로 보기" : "다크 모드로 보기"}
        className="flex size-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-accent hover:text-primary"
      >
        <Icon className="size-[17px]" strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-secondary transition-colors hover:bg-accent hover:text-primary"
    >
      <Icon className="size-[15px]" strokeWidth={2} />
      {isDark ? "라이트 모드로 보기" : "다크 모드로 보기"}
    </button>
  );
}
