import type { ActionResult } from "@/lib/action-result";

type Props = { state: ActionResult; successMessage?: string };

/** 폼 아래 한 줄: 오류(danger) 또는 저장 완료(ink-muted). 보여줄 글이 없으면 자리를 차지하지 않는다. */
export function FormMessage({ state, successMessage }: Props) {
  const text = state.error ?? (state.savedAt && successMessage ? successMessage : null);

  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-caption empty:hidden ${state.error ? "text-danger" : "text-ink-muted"}`}
    >
      {text}
    </p>
  );
}
