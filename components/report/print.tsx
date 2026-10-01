"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * 인쇄하는 동안만 (F-25): 다크 모드여도 라이트 토큰으로 찍고, 문서 제목을 파일 이름으로 쓰게 바꾼다.
 * 브라우저 메뉴(Ctrl+P)로 인쇄해도 같도록 버튼이 아니라 beforeprint/afterprint에서 한다.
 * 끝나면 원래 화면 모드(속성 없음 = 시스템 설정)와 제목으로 되돌린다.
 */
export function PrintSetup({ title }: { title: string }) {
  useEffect(() => {
    const root = document.documentElement;
    let saved: { theme: string | undefined; title: string } | null = null;
    const before = () => {
      if (saved) return;
      saved = { theme: root.dataset.theme, title: document.title };
      root.dataset.theme = "light";
      document.title = title;
    };
    const after = () => {
      if (!saved) return;
      if (saved.theme === undefined) delete root.dataset.theme;
      else root.dataset.theme = saved.theme;
      document.title = saved.title;
      saved = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      after();
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [title]);
  return null;
}

/** 인쇄 창을 연다. 인쇄 창에서 "PDF로 저장"을 고르면 파일이 된다 */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="h-10 px-4 print:hidden!">
      <Printer size={18} strokeWidth={1.75} aria-hidden />
      PDF로 저장
    </Button>
  );
}
