"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeMerchant } from "@/lib/calc/merchant";
import { TransactionPanel } from "./TransactionPanel";
import type { PanelData, TransactionRecord } from "./types";

export type PanelState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; record: TransactionRecord };

type PanelApi = { openNew: () => void; openEdit: (record: TransactionRecord) => void };

const PanelContext = createContext<PanelApi | null>(null);

export function useTransactionPanel(): PanelApi {
  const api = useContext(PanelContext);
  if (!api) throw new Error("TransactionPanelProvider 안에서만 쓸 수 있어요");
  return api;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** 내역 추가·편집 패널을 앱 어디서나 열 수 있게 한다. 단축키 N (F-10) */
export function TransactionPanelProvider({ data, children }: { data: PanelData; children: ReactNode }) {
  const [state, setState] = useState<PanelState>({ mode: "closed" });
  // 같은 모드로 다시 열 때도 폼을 새로 만들기 위한 번호
  const [openCount, setOpenCount] = useState(0);
  // 방금 저장한 가맹점 규칙. 서버 새로고침을 기다리지 않고 다음 입력부터 바로 쓴다 (F-16)
  const [learned, setLearned] = useState<Record<string, string>>({});
  const panelData = useMemo(() => ({ ...data, rules: { ...data.rules, ...learned } }), [data, learned]);
  const learn = useCallback((merchant: string, categoryId: string) => {
    const key = normalizeMerchant(merchant);
    if (key) setLearned((current) => ({ ...current, [key]: categoryId }));
  }, []);

  const openNew = useCallback(() => {
    setOpenCount((n) => n + 1);
    setState({ mode: "new" });
  }, []);
  const openEdit = useCallback((record: TransactionRecord) => {
    setOpenCount((n) => n + 1);
    setState({ mode: "edit", record });
  }, []);
  const close = useCallback(() => setState({ mode: "closed" }), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 한글 입력 상태에서도 동작하도록 e.code로 본다
      if (e.code !== "KeyN" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (isTypingTarget(e.target) || state.mode !== "closed") return;
      e.preventDefault();
      openNew();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openNew, state.mode]);

  const api = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <PanelContext.Provider value={api}>
      {children}
      <TransactionPanel key={openCount} state={state} data={panelData} onClose={close} onLearn={learn} />
    </PanelContext.Provider>
  );
}
