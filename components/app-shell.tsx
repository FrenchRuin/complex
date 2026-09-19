import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
import type { getSessionProfile } from "@/lib/auth";

type Session = Awaited<ReturnType<typeof getSessionProfile>>;

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const { user, profile } = session;
  const displayName = profile?.name ?? user.email ?? "계정";

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
        <div className="px-4 py-5">
          <span className="font-heading text-sm font-semibold">
            커플 라이프 매니저
          </span>
        </div>
        <div className="flex-1 px-2">
          <NavLinks variant="sidebar" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <div className="flex min-w-0 items-center gap-2">
            {profile && (
              <span
                className={`size-2 shrink-0 rounded-full ${
                  profile.colorRole === "A" ? "bg-partner-a" : "bg-partner-b"
                }`}
              />
            )}
            <span className="truncate text-sm">{displayName}</span>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="로그아웃"
            >
              <LogOut strokeWidth={1.5} />
            </Button>
          </form>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <span className="font-heading text-sm font-semibold">
          커플 라이프 매니저
        </span>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="로그아웃"
          >
            <LogOut strokeWidth={1.5} />
          </Button>
        </form>
      </header>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background md:hidden">
        <NavLinks variant="mobile" />
      </div>
    </div>
  );
}
