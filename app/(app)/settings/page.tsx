import Link from "next/link";
import { ChevronRight, ListTree, UserRound } from "lucide-react";

const options = [
  {
    href: "/settings/categories",
    icon: ListTree,
    tone: "bg-accent text-primary",
    title: "카테고리 설정",
    description: "지출·수입 카테고리를 추가, 수정, 삭제해요.",
  },
  {
    href: "/settings/profile",
    icon: UserRound,
    tone: "bg-partner-b/15 text-partner-b",
    title: "프로필 설정",
    description: "내 정보와 커플 연결 상태를 확인해요.",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex max-w-xl flex-col gap-1.5">
        <h1 className="font-heading text-[28px] font-bold text-foreground md:text-[32px]">설정</h1>
        <p className="text-[14.5px] text-ink-secondary">가계부와 프로필에 관한 설정을 관리해요.</p>
      </div>

      <div className="flex max-w-xl flex-col gap-3">
        {options.map(({ href, icon: Icon, tone, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-ink-muted"
          >
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="size-[22px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-base font-bold text-foreground">{title}</div>
              <div className="text-[13px] text-ink-secondary">{description}</div>
            </div>
            <ChevronRight className="size-[18px] shrink-0 text-ink-muted" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </div>
  );
}
