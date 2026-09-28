"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Props = { initialError: string | null; next: string | null };

export function LoginForm({ initialError, next }: Props) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {
    error: initialError,
    email: "",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label="이메일"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.email}
        required
      />
      <TextField
        label="비밀번호"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <p role="alert" aria-live="polite" className="min-h-[18px] text-caption text-danger">
        {state.error}
      </p>

      <Button type="submit" pending={pending} className="w-full">
        {pending ? "로그인하는 중" : "로그인"}
      </Button>
    </form>
  );
}
