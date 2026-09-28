"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { IconButton } from "@/components/ui/IconButton";
import type { NoteItem } from "@/lib/calc/notes";

type Props = { items: NoteItem[]; onChange: (items: NoteItem[]) => void };

/**
 * 체크리스트 편집: 항목마다 체크·글·지우기. Enter는 아래에 새 항목,
 * 빈 항목에서 Backspace는 그 항목을 지우고 위 항목으로.
 */
export function ChecklistEditor({ items, onChange }: Props) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (focusId) inputs.current.get(focusId)?.focus();
  }, [focusId, items]);

  function update(id: string, patch: Partial<NoteItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addAfter(index: number) {
    const item = { id: crypto.randomUUID(), text: "", done: false };
    onChange([...items.slice(0, index + 1), item, ...items.slice(index + 1)]);
    setFocusId(item.id);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setFocusId(items[index - 1]?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <Checkbox
              checked={item.done}
              onChange={(done) => update(item.id, { done })}
              ariaLabel={`${index + 1}번째 항목 완료`}
            />
            <input
              ref={(el) => {
                if (el) inputs.current.set(item.id, el);
                else inputs.current.delete(item.id);
              }}
              value={item.text}
              maxLength={200}
              aria-label={`${index + 1}번째 항목`}
              placeholder="항목"
              onChange={(e) => update(item.id, { text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addAfter(index);
                } else if (e.key === "Backspace" && item.text === "" && items.length > 1) {
                  e.preventDefault();
                  remove(index);
                }
              }}
              className={`h-10 min-w-0 flex-1 rounded-sm bg-surface-sunken px-3 text-body placeholder:text-ink-muted ${
                item.done ? "text-ink-muted line-through" : "text-ink"
              }`}
            />
            <IconButton icon={X} label={`${index + 1}번째 항목 지우기`} size="sm" onClick={() => remove(index)} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addAfter(items.length - 1)}
        disabled={items.length >= 100}
        className="inline-flex h-10 items-center gap-2 self-start rounded-sm px-2 text-body font-semibold text-primary hover:bg-surface-sunken disabled:text-ink-muted"
      >
        <Plus size={18} strokeWidth={1.75} aria-hidden />
        항목 추가
      </button>
    </div>
  );
}
