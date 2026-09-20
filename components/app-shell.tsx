import { Heart, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
import type { getSessionProfile } from "@/lib/auth";
import type { Profile } from "@prisma/client";

type Session = Awaited<ReturnType<typeof getSessionProfile>>;

function PartnerAvatar({ profile, offset }: { profile: Profile; offset: boolean }) {
  return (
    <div
      className={`flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-card text-xs font-bold text-primary-foreground ${
        profile.colorRole === "A" ? "bg-partner-a" : "bg-partner-b"
      } ${offset ? "-ml-2.5" : ""}`}
    >
      {profile.name.slice(0, 1)}
    </div>
  );
}

export function AppShell({
  session,
  partners,
  children,
}: {
  session: Session;
  partners: Profile[];
  children: React.ReactNode;
}) {
  const { user, profile } = session;
  const displayName = profile?.name ?? user.email ?? "계정";
  const coupleLabel = partners.length > 0 ? partners.map((p) => p.name).join(" & ") : displayName;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background md:flex-row">
      <aside className="hidden w-[264px] shrink-0 flex-col gap-7 border-r border-border bg-sidebar p-5 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-primary">
            <Heart className="size-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-bold text-foreground">
              우리가계부
            </span>
            <span className="text-[11px] text-ink-secondary">{coupleLabel}</span>
          </div>
        </div>

        <div className="flex-1">
          <NavLinks variant="sidebar" />
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
          <div className="flex shrink-0">
            {partners.length > 0 ? (
              partners.map((p, i) => (
                <PartnerAvatar key={p.id} profile={p} offset={i > 0} />
              ))
            ) : profile ? (
              <PartnerAvatar profile={profile} offset={false} />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">
              {coupleLabel}
            </span>
            <span className="text-[11px] text-ink-secondary">함께 관리 중</span>
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

      <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-primary">
            <Heart className="size-3.5 fill-primary-foreground text-primary-foreground" />
          </div>
          <span className="font-heading text-sm font-bold text-foreground">
            우리가계부
          </span>
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
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-sidebar md:hidden">
        <NavLinks variant="mobile" />
      </div>
    </div>
  );
}
