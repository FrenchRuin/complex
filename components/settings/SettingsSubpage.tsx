import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

type Props = { title: string; back?: { href: string; label: string }; children: ReactNode };

/** 설정 하위 화면 틀: 위쪽 "‹ 설정"(또는 back)으로 돌아가기 + 한 열 내용 */
export function SettingsSubpage({ title, back = { href: "/settings", label: "설정으로 돌아가기" }, children }: Props) {
  return (
    <>
      <PageHeader
        title={title}
        titleStart={
          <Link
            href={back.href}
            aria-label={back.label}
            className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken lg:-ml-2"
          >
            <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        }
      />
      <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">{children}</div>
    </>
  );
}
