"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { INITIAL, type ActionResult } from "@/lib/action-result";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  pendingLabel: string;
  defaultValue?: string;
  hidden?: Record<string, string>;
  /** 같은 화면에 머무를 때 저장 후 보여줄 문구 */
  successMessage?: string;
};

/** 표시 이름 입력 + 버튼 하나. 온보딩·초대 수락·프로필에서 쓴다. */
export function DisplayNameForm({
  action,
  submitLabel,
  pendingLabel,
  defaultValue = "",
  hidden = {},
  successMessage,
}: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <TextField
        label="표시 이름"
        name="displayName"
        defaultValue={defaultValue}
        maxLength={10}
        autoComplete="nickname"
        required
      />
      <FormMessage state={state} successMessage={successMessage} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
