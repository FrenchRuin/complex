"use client";

import { useTransition } from "react";
import { excludePresetHoliday, setCustomHolidayDeleted } from "@/app/(app)/settings/holiday-actions";
import { useToast } from "@/components/ui/Toast";
import type { HolidayEntry } from "@/lib/calc/holidays";
import { objectParticle } from "@/lib/calc/notifications";
import { formatDayHeader } from "@/lib/date";

const ACTION =
  "inline-flex h-10 shrink-0 items-center rounded-sm px-3 text-caption font-semibold text-primary hover:bg-surface-sunken disabled:opacity-60";

/**
 * 그 해 공휴일 목록 (F-55). 기본 공휴일은 "쉬는 날 아님"으로 빼거나 다시 넣고,
 * 직접 추가한 날은 삭제(되돌리기 가능).
 */
export function HolidayList({ entries }: { entries: HolidayEntry[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string | null }>, message: string, undo?: () => Promise<unknown>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) return toast(result.error);
      toast(message, undo ? { action: { label: "되돌리기", onClick: () => void undo() } } : undefined);
    });
  }

  if (entries.length === 0) {
    return <p className="py-4 text-center text-body text-ink-muted">이 해에는 보여줄 공휴일이 없어요.</p>;
  }

  return (
    <ul>
      {entries.map((e) => {
        const label = e.names.join(", ");
        return (
          <li key={e.date} className="flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-body ${e.removed ? "text-ink-muted line-through" : "text-holiday"}`}>
                {label}
              </span>
              <span className="block text-caption text-ink-muted tabular-nums">
                {formatDayHeader(e.date)}
                {e.source === "custom" ? " · 직접 추가" : ""}
                {e.removed ? " · 쉬는 날 아님" : ""}
              </span>
            </span>
            {e.source === "custom" && e.customId ? (
              <button
                type="button"
                disabled={pending}
                className={ACTION}
                aria-label={`${label} 삭제`}
                onClick={() => {
                  const id = e.customId as string;
                  run(() => setCustomHolidayDeleted(id, true), `${label}${objectParticle(label)} 삭제했어요`, () => setCustomHolidayDeleted(id, false));
                }}
              >
                삭제
              </button>
            ) : e.removed && e.customId ? (
              <button
                type="button"
                disabled={pending}
                className={ACTION}
                aria-label={`${label} 다시 쉬는 날로`}
                onClick={() => run(() => setCustomHolidayDeleted(e.customId as string, true), `${label}${objectParticle(label)} 다시 쉬는 날로 했어요`)}
              >
                다시 쉬는 날로
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                className={ACTION}
                aria-label={`${label} 쉬는 날 아님`}
                onClick={() => run(() => excludePresetHoliday(e.date), `${label}${objectParticle(label)} 쉬는 날에서 뺐어요`)}
              >
                쉬는 날 아님
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
