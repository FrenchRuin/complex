import type { ActionResult } from "@/lib/action-result";

type Props = { state: ActionResult; successMessage?: string };

/** 폼 아래 한 줄: 오류(danger) 또는 저장 완료(ink-muted). 자리는 항상 차지한다. */
export function FormMessage({ state, successMessage }: Props) {
  const text = state.error ?? (state.savedAt && successMessage ? successMessage : null);

  return (
    <p
      role="status"
      aria-live="polite"
      className={`min-h-[18px] text-caption ${state.error ? "text-danger" : "text-ink-muted"}`}
    >
      {text}
    </p>
  );
}
