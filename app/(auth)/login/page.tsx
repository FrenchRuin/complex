import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "로그인 · 우리 둘 가계부" };

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "초대받은 계정만 사용할 수 있어요",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8">
      <section className="w-full max-w-[400px] rounded-md bg-surface-raised p-5 sm:p-8">
        <h1 className="text-title text-ink">우리 둘 가계부</h1>
        <p className="mt-2 mb-6 text-caption text-ink-muted">둘이 함께 쓰는 가계부예요.</p>
        <LoginForm initialError={initialError} />
      </section>
    </main>
  );
}
