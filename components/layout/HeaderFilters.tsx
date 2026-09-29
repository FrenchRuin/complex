"use client";

import { useEffect, useState, type ReactNode } from "react";

/** 이만큼 넘게 움직여야 숨기거나 다시 보인다 (손가락 떨림 무시) */
const STEP = 8;
/** 맨 위 근처에서는 항상 보인다 */
const TOP = 80;

/**
 * 헤더의 필터 줄. 폰(1024px 미만)에서 아래로 스크롤하면 접히고, 위로 조금만 올려도 다시 나온다.
 * 제목 줄(☰·제목·종)은 그대로. 웹은 메인만 스크롤되고 필터가 제목 옆에 있어 늘 보인다.
 * 키보드로 필터에 들어오면 다시 펼친다.
 */
export function HeaderFilters({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    let lastY = window.scrollY;
    let current = false;
    // 헤더 높이가 바뀌면 브라우저가 스크롤 위치를 보정한다(scroll anchoring).
    // 그 보정을 사용자 스크롤로 읽으면 접혔다 펴졌다를 반복하므로, 바뀌는 동안은 무시한다.
    let lockUntil = 0;
    function apply(next: boolean) {
      if (next === current) return;
      current = next;
      lockUntil = performance.now() + 300;
      setHidden(next);
    }
    function onScroll() {
      const y = window.scrollY;
      if (performance.now() < lockUntil) {
        lastY = y;
        return;
      }
      if (wide.matches || y < TOP) {
        apply(false);
        lastY = y;
        return;
      }
      if (Math.abs(y - lastY) < STEP) return;
      apply(y > lastY);
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      data-hidden={hidden || undefined}
      onFocusCapture={() => setHidden(false)}
      // 폰: 제목 줄과의 간격(12px)도 이 줄이 가진다 → 접히면 간격까지 없어진다. 웹(lg)은 늘 펼침
      className="group grid w-full grid-rows-[1fr] transition-[grid-template-rows,opacity,padding] duration-200 ease-out motion-reduce:transition-none pt-3 data-hidden:grid-rows-[0fr] data-hidden:pt-0 data-hidden:opacity-0 lg:w-auto lg:pt-0 lg:data-hidden:grid-rows-[1fr] lg:data-hidden:opacity-100"
    >
      {/* 포커스 링(4px)이 잘리지 않게 안쪽 여백 */}
      <div className="-m-1 min-h-0 overflow-hidden p-1 group-data-hidden:m-0 group-data-hidden:p-0 lg:overflow-visible">{children}</div>
    </div>
  );
}
