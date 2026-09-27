"use client";

import { useState } from "react";
import { moveCategory, setCategoryHidden } from "@/app/(app)/settings/category-actions";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CATEGORY_TYPE_LABEL, CATEGORY_TYPES, type CategoryType } from "@/lib/domain";
import { CategoryEditor } from "./CategoryEditor";
import { RowActions } from "./RowActions";
import { SettingsSection } from "./SettingsSection";
import { useActionRunner } from "./useActionRunner";

export type CategoryItem = {
  id: string;
  type: CategoryType;
  name: string;
  icon: string;
  sort_order: number;
  is_hidden: boolean;
};

const TYPE_OPTIONS = CATEGORY_TYPES.map((value) => ({ value, label: CATEGORY_TYPE_LABEL[value] }));

/** 카테고리 관리 (F-50): 추가, 이름·아이콘 변경, 순서 변경, 숨기기 */
export function CategorySection({ categories }: { categories: CategoryItem[] }) {
  const [type, setType] = useState<CategoryType>("expense");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useActionRunner();

  const list = categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SettingsSection
      title="카테고리"
      description="숨긴 카테고리는 내역을 입력할 때 목록에 나오지 않아요."
    >
      <SegmentedControl
        legend="카테고리 종류"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(value) => {
          setType(value);
          setEditing(null);
        }}
      />

      <ul className="mt-2">
        {list.map((category, index) =>
          editing === category.id ? (
            <li key={category.id} className="py-2">
              <CategoryEditor type={type} category={category} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li
              key={category.id}
              className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
            >
              <span className={category.is_hidden ? "opacity-50" : undefined}>
                <CategoryIcon name={category.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-body ${category.is_hidden ? "text-ink-muted" : "text-ink"}`}>
                  {category.name}
                </span>
                {category.is_hidden ? (
                  <span className="text-caption text-ink-muted">숨김</span>
                ) : null}
              </span>
              <RowActions
                itemName={category.name}
                isFirst={index === 0}
                isLast={index === list.length - 1}
                hidden={category.is_hidden}
                disabled={pending}
                onMove={(direction) => run(() => moveCategory(category.id, direction))}
                onEdit={() => setEditing(category.id)}
                onToggleHidden={() =>
                  run(() => setCategoryHidden(category.id, !category.is_hidden))
                }
              />
            </li>
          ),
        )}
      </ul>

      {error ? (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        {editing === "new" ? (
          <CategoryEditor type={type} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="secondary" onClick={() => setEditing("new")} className="w-full">
            {CATEGORY_TYPE_LABEL[type]} 카테고리 추가
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
