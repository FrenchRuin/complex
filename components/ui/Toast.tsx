"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction };
type ShowToast = (message: string, options?: { action?: ToastAction; durationMs?: number }) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("ToastProvider 안에서만 쓸 수 있어요");
  return show;
}

/** 화면 아래 한 줄 알림. 한 번에 하나만 보인다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ShowToast>((message, options) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action: options?.action });
    timer.current = setTimeout(() => setToast(null), options?.durationMs ?? 3000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[60] flex justify-center px-5 lg:bottom-8"
      >
        {toast ? (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-12 w-full max-w-[400px] items-center gap-3 rounded-md bg-ink px-4 py-2 text-body text-surface shadow-float"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
                className="shrink-0 rounded-sm px-2 py-1 font-semibold text-primary-soft underline-offset-4 hover:underline"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
