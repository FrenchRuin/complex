"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useId } from "react";

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** 아무것도 안 골랐을 때 칸에 보일 글자 (예: "골라 주세요") */
  placeholder?: string;
  /** "선택 안 함"처럼 빈 값("")을 고를 수 있는 항목을 맨 위에 둔다 */
  emptyLabel?: string;
  /** 문자 확인 화면처럼 좁은 곳: 높이 40, 라벨 작게 */
  compact?: boolean;
  id?: string;
};

/** Radix Select는 빈 문자열 값을 못 쓰므로 "선택 안 함"은 이 값으로 바꿔 둔다 */
const NONE = "__none__";

/** 드롭다운. 칸은 입력창과 같은 모양, 목록은 날짜 고르기 창과 같은 떠 있는 패널 */
export function Select({ label, value, onChange, options, placeholder, emptyLabel, compact = false, id }: Props) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const items = emptyLabel ? [{ value: NONE, label: emptyLabel }, ...options] : options;
  const current = value === "" ? (emptyLabel ? NONE : undefined) : value;

  return (
    <div className={`flex flex-col ${compact ? "gap-1" : "gap-2"}`}>
      <label
        htmlFor={triggerId}
        className={compact ? "text-label text-ink-muted" : "text-caption font-semibold text-ink-muted"}
      >
        {label}
      </label>
      <RadixSelect.Root value={current} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <RadixSelect.Trigger
          id={triggerId}
          className={`flex w-full items-center justify-between gap-2 rounded-sm bg-surface-sunken text-left text-body text-ink data-[placeholder]:text-ink-muted ${
            compact ? "h-10 px-3" : "h-12 px-4"
          }`}
        >
          <span className="min-w-0 truncate">
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon asChild>
            <ChevronDown size={18} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={8}
            collisionPadding={16}
            className="z-[70] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md bg-surface-raised shadow-float motion-safe:animate-[fade-in_150ms_ease-out]"
          >
            <RadixSelect.Viewport className="p-1">
              {items.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-body text-ink outline-none select-none data-[highlighted]:bg-surface-sunken data-[state=checked]:font-semibold data-[state=checked]:text-primary"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="ml-auto">
                    <Check size={18} strokeWidth={1.75} aria-hidden />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
