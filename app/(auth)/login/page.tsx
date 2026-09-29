import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { PotatoLogo } from "@/components/brand/PotatoLogo";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "로그인 · 감자밭" };

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "초대받은 계정만 사용할 수 있어요",
};

/** 로그인: 가운데 감자 로고 + 이름 + 소개 한 줄 + 로그인 칸. 바탕은 은은한 밭고랑 무늬 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const initialError = typeof error === "string" ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* 밭고랑: 옅은 가로줄 무늬 (꾸밈) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-60 [background-image:repeating-linear-gradient(to_bottom,transparent_0_22px,var(--potato-soft)_22px_26px)] [mask-image:linear-gradient(to_bottom,transparent,black)]"
      />
      <section className="relative w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <PotatoLogo size={84} />
          <h1 className="mt-3 text-[28px] leading-9 font-bold tracking-tight text-ink">감자밭</h1>
          <p className="mt-1 text-body text-ink-muted">둘이 가꾸는 가계부</p>
        </div>
        <div className="mt-8 rounded-lg bg-surface-raised p-5 ring-1 ring-line sm:p-6">
          <LoginForm initialError={initialError} next={safeNextPath(next)} />
        </div>
        <p className="mt-6 text-center text-caption text-ink-muted">초대받은 두 사람만 쓸 수 있어요.</p>
      </section>
    </main>
  );
}
