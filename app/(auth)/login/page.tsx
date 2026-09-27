import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { CenteredCard } from "@/components/layout/CenteredCard";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "로그인 · 우리 둘 가계부" };

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "초대받은 계정만 사용할 수 있어요",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const initialError = typeof error === "string" ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <CenteredCard title="우리 둘 가계부" description="둘이 함께 쓰는 가계부예요.">
      <LoginForm initialError={initialError} next={safeNextPath(next)} />
    </CenteredCard>
  );
}
