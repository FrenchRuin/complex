import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

/** 임시 홈 (M0). M3에서 대시보드로 바뀐다. */
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8">
      <section className="w-full max-w-[400px] rounded-md bg-surface-raised p-5 sm:p-8">
        <h1 className="text-title text-ink">로그인됐어요</h1>
        <p className="mt-2 text-body text-ink">{email}</p>
        <p className="mt-1 mb-6 text-caption text-ink-muted">
          가계부 화면은 다음 단계에서 만들어요.
        </p>
        <form action={logout}>
          <Button type="submit" variant="secondary" className="w-full">
            로그아웃
          </Button>
        </form>
      </section>
    </main>
  );
}
