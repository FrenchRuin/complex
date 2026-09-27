"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type SyncStatus = "connecting" | "online" | "offline";

const SyncStatusContext = createContext<SyncStatus>("connecting");

export function useSyncStatus(): SyncStatus {
  return useContext(SyncStatusContext);
}

/** 서버 데이터를 다시 읽는 간격을 모은다 (여러 변경이 한꺼번에 와도 한 번만) */
const REFRESH_DEBOUNCE_MS = 300;

/**
 * 실시간 동기화 (F-14). 우리 가구의 내역이 바뀌면 화면을 다시 읽는다.
 * 읽기는 서버 컴포넌트가 하므로, 여기서는 router.refresh()만 부른다.
 */
export function RealtimeProvider({ householdId, children }: { householdId: string; children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`household:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `household_id=eq.${householdId}`,
        },
        scheduleRefresh,
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("online");
          // 끊긴 사이에 바뀐 것이 있을 수 있으니 다시 읽는다
          scheduleRefresh();
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("offline");
        }
      });

    const goOffline = () => setStatus("offline");
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("offline", goOffline);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [householdId, router]);

  return <SyncStatusContext.Provider value={status}>{children}</SyncStatusContext.Provider>;
}
