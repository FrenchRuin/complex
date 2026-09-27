"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";

/** 버튼 한 번으로 서버 액션을 부르고, 진행 중 여부와 오류 문구를 들고 있는다. */
export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error);
    });
  }

  return { pending, error, run };
}
