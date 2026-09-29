"use client";

import { Button } from "@/components/ui/Button";

export type RepeatScope = "one" | "all";

type Props = {
  action: "edit" | "delete";
  pending: boolean;
  onChoose: (scope: RepeatScope) => void;
  onCancel: () => void;
};

const DANGER =
  "inline-flex h-12 items-center justify-center rounded-md px-4 text-body font-semibold disabled:cursor-not-allowed disabled:opacity-60";

/** 반복 일정을 고치거나 지울 때: "이 일정만" 또는 "반복 전체" (F-19). 일정 창 아래에 뜬다 */
export function RepeatScopeChoice({ action, pending, onChoose, onCancel }: Props) {
  const verb = action === "edit" ? "수정" : "삭제";

  return (
    <div role="group" aria-labelledby="repeat-scope-title" className="flex flex-col gap-2">
      <p id="repeat-scope-title" className="text-body text-ink">
        반복 일정이에요. 어떤 일정을 {verb}할까요?
      </p>
      {action === "edit" ? (
        <>
          <Button autoFocus onClick={() => onChoose("one")} disabled={pending}>
            이 일정만 수정
          </Button>
          <Button variant="secondary" onClick={() => onChoose("all")} disabled={pending}>
            반복 전체 수정
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            autoFocus
            onClick={() => onChoose("one")}
            disabled={pending}
            className={`${DANGER} bg-danger-soft text-danger hover:bg-danger/20`}
          >
            이 일정만 삭제
          </button>
          <button
            type="button"
            onClick={() => onChoose("all")}
            disabled={pending}
            className={`${DANGER} bg-danger text-on-primary hover:bg-danger/90`}
          >
            반복 전체 삭제
          </button>
        </>
      )}
      <Button variant="secondary" onClick={onCancel} disabled={pending}>
        취소
      </Button>
    </div>
  );
}
