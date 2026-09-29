"use client";

import { useTransition } from "react";
import { refreshHolidays } from "@/app/(app)/settings/holiday-actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** "최신 공휴일 받기" (F-55): 정부 발표가 반영된 공휴일 파일을 받아 저장 */
export function HolidayRefreshButton({ lastFetched }: { lastFetched: string | null }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        pending={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await refreshHolidays();
            toast(result.error ?? result.message ?? "공휴일을 받았어요");
          })
        }
      >
        {pending ? "받는 중" : "최신 공휴일 받기"}
      </Button>
      <p className="text-caption text-ink-muted">
        {lastFetched ? `마지막으로 받은 날: ${lastFetched}` : "아직 받은 적이 없어요. 앱에 들어 있는 공휴일을 쓰고 있어요."}
      </p>
    </div>
  );
}
