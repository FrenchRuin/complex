"use client";

import { WifiOff } from "lucide-react";
import { useSyncStatus } from "./RealtimeProvider";

/** 연결이 끊기면 메인 위쪽에 한 줄 (F-14) */
export function OfflineBanner() {
  const status = useSyncStatus();
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-primary-soft px-5 py-2 text-caption text-ink lg:px-8"
    >
      <WifiOff size={16} strokeWidth={1.75} aria-hidden />
      연결이 끊겼어요. 다시 연결하는 중
    </div>
  );
}
