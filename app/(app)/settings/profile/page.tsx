import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { getSessionProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function ProfileSettingsPage() {
  const { user, profile } = await getSessionProfile();

  const partners = profile?.coupleId
    ? await prisma.profile.findMany({ where: { coupleId: profile.coupleId } })
    : [];
  const partner = partners.find((p) => p.id !== profile?.id);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex max-w-xl flex-col gap-3">
        <Link href="/settings" className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-ink-secondary">
          <ChevronRight className="size-3.5 rotate-180" strokeWidth={2.2} />
          설정
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[28px] font-bold text-foreground md:text-[32px]">프로필 설정</h1>
          <p className="text-[14.5px] text-ink-secondary">내 정보와 커플 연결 상태를 확인해요.</p>
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-primary-foreground ${
                profile?.colorRole === "A" ? "bg-partner-a" : "bg-partner-b"
              }`}
            >
              {(profile?.name ?? user.email ?? "?").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground">{profile?.name ?? "이름 없음"}</div>
              <div className="truncate text-[12.5px] text-ink-muted">{user.email}</div>
            </div>
          </div>
          {!profile && (
            <p className="text-sm text-ink-secondary">
              이 계정에 연결된 프로필이 없어요. scripts/link-couple.ts를 먼저 실행해주세요.
            </p>
          )}
        </div>

        {profile?.coupleId && (
          <div>
            <h2 className="mb-2.5 px-0.5 text-[15px] font-bold text-foreground">커플 연결</h2>
            <div className="rounded-2xl border border-border bg-card px-5 shadow-sm">
              {partner ? (
                <div className="flex items-center gap-3.5 py-4">
                  <div
                    className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${
                      partner.colorRole === "A" ? "bg-partner-a" : "bg-partner-b"
                    }`}
                  >
                    {partner.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-foreground">{partner.name}</div>
                    <div className="text-xs text-ink-muted">연결됨</div>
                  </div>
                  <span className="rounded-lg bg-accent px-2.5 py-1 text-[11.5px] font-bold text-primary">
                    함께 관리 중
                  </span>
                </div>
              ) : (
                <p className="py-4 text-sm text-ink-secondary">
                  아직 연결된 파트너가 없어요. Supabase 대시보드에서 두 번째 계정을 생성한 뒤
                  scripts/link-couple.ts로 연결해주세요.
                </p>
              )}
            </div>
          </div>
        )}

        <form action={signOut}>
          <Button type="submit" variant="ghost" className="gap-2 px-1 text-destructive hover:text-destructive">
            <LogOut className="size-4" strokeWidth={1.5} />
            로그아웃
          </Button>
        </form>
      </div>
    </div>
  );
}
