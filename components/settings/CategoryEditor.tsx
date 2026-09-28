"use client";

import { useActionState, useState } from "react";
import { saveCategory } from "@/app/(app)/settings/category-actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { IconPicker } from "@/components/ui/IconPicker";
import { TextField } from "@/components/ui/TextField";
import { INITIAL, type ActionResult } from "@/lib/action-result";
import { isCategoryIconName, type CategoryIconName } from "@/lib/category-icons";
import type { CategoryType } from "@/lib/domain";

type Props = {
  type: CategoryType;
  /** 수정할 카테고리. 없으면 새로 추가 */
  category?: { id: string; name: string; icon: string };
  onDone: () => void;
};

/** 카테고리 추가·수정 폼 (아이콘 + 이름) */
export function CategoryEditor({ type, category, onDone }: Props) {
  const initialIcon: CategoryIconName =
    category && isCategoryIconName(category.icon) ? category.icon : "circle-ellipsis";
  const [icon, setIcon] = useState<CategoryIconName>(initialIcon);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await saveCategory(prev, formData);
      if (!result.error) onDone();
      return result;
    },
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-surface p-3" noValidate>
      <input type="hidden" name="type" value={type} />
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="flex items-end gap-3">
        <IconPicker name="icon" value={icon} onChange={setIcon} />
        <div className="flex-1">
          <TextField
            label={category ? "카테고리 이름" : "새 카테고리 이름"}
            name="name"
            defaultValue={category?.name ?? ""}
            maxLength={12}
            autoFocus
            required
          />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="flex-1">
          {pending ? "저장하는 중" : "저장"}
        </Button>
        <Button variant="secondary" onClick={onDone} className="flex-1">
          취소
        </Button>
      </div>
    </form>
  );
}
