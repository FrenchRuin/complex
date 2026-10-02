"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const OnlineContext = createContext<ReadonlySet<string>>(new Set());

/** 지금 앱을 열어 둔 사람들의 id (나 포함) */
export function useOnlineMembers(): ReadonlySet<string> {
  return useContext(OnlineContext);
}

/**
 * 접속 상태 (2026-10-02 사용자 요청): 앱을 열어 둔 동안 Supabase Realtime Presence로 "나 여기 있어요"를 알리고,
 * 같은 가구에서 누가 접속 중인지 받는다. DB에는 아무것도 남기지 않는다.
 * 내역 동기화 채널과 나눠서, 접속 표시가 실패해도 동기화에는 영향이 없게 한다.
 */
export function PresenceProvider({ householdId, memberId, children }: { householdId: string; memberId: string; children: ReactNode }) {
  const [online, setOnline] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`presence:${householdId}`, {
      config: { presence: { key: memberId } },
    });
    channel
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe((state) => {
        if (state === "SUBSCRIBED") void channel.track({});
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, memberId]);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}
