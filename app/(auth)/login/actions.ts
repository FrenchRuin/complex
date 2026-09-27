"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요")
    .pipe(z.email("이메일 형식을 확인해 주세요")),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요", email: rawEmail };
  }

  const { email, password } = parsed.data;

  if (!isAllowedEmail(email)) {
    return { error: "초대받은 계정만 사용할 수 있어요", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "이메일 또는 비밀번호가 맞지 않아요", email };
    }
    return { error: "로그인하지 못했어요. 잠시 후 다시 시도해 주세요", email };
  }

  redirect("/");
}
