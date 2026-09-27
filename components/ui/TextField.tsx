import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

/** 라벨이 붙은 입력창. 바탕은 surface-sunken */
export function TextField({ label, id, className = "", ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-caption font-semibold text-ink-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`h-12 rounded-sm bg-surface-sunken px-4 text-body text-ink placeholder:text-ink-muted ${className}`}
        {...props}
      />
    </div>
  );
}
