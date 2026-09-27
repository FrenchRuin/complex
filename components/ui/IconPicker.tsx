"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import {
  CATEGORY_ICON_LABELS,
  CATEGORY_ICON_NAMES,
  type CategoryIconName,
} from "@/lib/category-icons";
import { CATEGORY_ICONS, CategoryIcon } from "./CategoryIcon";

type Props = { name: string; value: CategoryIconName; onChange: (icon: CategoryIconName) => void };

/** 카테고리 아이콘 고르기. 폼에는 hidden input으로 값을 보낸다. */
export function IconPicker({ name, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger
        aria-label="아이콘 바꾸기"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm bg-surface-sunken"
      >
        <CategoryIcon name={value} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[292px] rounded-md bg-surface-raised p-3 shadow-float"
        >
          <p className="mb-2 text-caption text-ink-muted">아이콘 고르기</p>
          <div role="radiogroup" aria-label="아이콘" className="grid grid-cols-6 gap-1">
            {CATEGORY_ICON_NAMES.map((icon) => {
              const Icon = CATEGORY_ICONS[icon];
              const selected = icon === value;
              return (
                <button
                  key={icon}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={CATEGORY_ICON_LABELS[icon]}
                  onClick={() => {
                    onChange(icon);
                    setOpen(false);
                  }}
                  className={`inline-flex size-11 items-center justify-center rounded-sm ${
                    selected ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-sunken"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
