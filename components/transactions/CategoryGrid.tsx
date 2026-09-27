"use client";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import type { CategoryOption } from "@/lib/household-data";

type Props = {
  categories: CategoryOption[];
  value: string | null;
  onChange: (id: string) => void;
};

/** 카테고리 고르기 (아이콘 + 이름 칸). 라디오 그룹이라 화살표 없이 Tab으로 이동한다. */
export function CategoryGrid({ categories, value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-caption font-semibold text-ink-muted">카테고리</legend>
      <div role="radiogroup" aria-label="카테고리" className="grid grid-cols-4 gap-1">
        {categories.map((category) => {
          const selected = category.id === value;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(category.id)}
              className={`flex flex-col items-center gap-1 rounded-sm px-1 py-2 text-caption ${
                selected ? "bg-primary-soft font-semibold text-primary" : "text-ink hover:bg-surface-sunken"
              }`}
            >
              <CategoryIcon name={category.icon} size="sm" />
              <span className="w-full truncate text-center">{category.name}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
