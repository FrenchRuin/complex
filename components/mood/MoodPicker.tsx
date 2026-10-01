"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useTransition, type ReactNode } from "react";
import { clearMood, saveMood } from "@/app/(app)/mood-actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { MOOD_NOTE_MAX, MOODS, type MoodKey, type TodayMood } from "@/lib/calc/mood";

type Props = { current: TodayMood | null; children: ReactNode; align?: "start" | "end"; side?: "top" | "bottom" };

/** 오늘 기분 고르기 (F-04). children은 여는 버튼 하나 */
export function MoodPicker({ current, children, align = "start", side = "top" }: Props) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<MoodKey | null>(current?.mood ?? null);
  const [note, setNote] = useState(current?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    if (next) {
      setMood(current?.mood ?? null);
      setNote(current?.note ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function run(action: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) setOpen(false);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-label="오늘 기분"
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[320px] rounded-md bg-surface-raised p-4 shadow-float"
        >
          <p className="mb-2 text-heading text-ink">오늘 기분</p>
          <div role="radiogroup" aria-label="기분" className="grid grid-cols-4 gap-1">
            {MOODS.map((m) => {
              const selected = m.key === mood;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={m.label}
                  onClick={() => setMood(m.key)}
                  className={`flex flex-col items-center gap-1 rounded-sm px-1 py-2 ${
                    selected ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-sunken"
                  }`}
                >
                  <span aria-hidden className="text-[22px] leading-none">{m.emoji}</span>
                  <span aria-hidden className="text-label whitespace-nowrap">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <TextField
              label="한 줄 (선택)"
              value={note}
              maxLength={MOOD_NOTE_MAX}
              placeholder="야근 중"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? <p role="alert" className="mt-2 text-caption text-danger">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            {current ? (
              <Button variant="secondary" className="flex-1" pending={pending} onClick={() => run(clearMood)}>
                기분 지우기
              </Button>
            ) : null}
            <Button
              className="flex-1"
              disabled={!mood}
              pending={pending}
              onClick={() => mood && run(() => saveMood({ mood, note }))}
            >
              저장
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
