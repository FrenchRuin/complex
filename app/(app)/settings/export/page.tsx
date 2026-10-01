import { Download } from "lucide-react";
import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { EXPORT_SHEET_NAMES } from "@/lib/calc/export-sheets";
import { requireMember } from "@/lib/household";

export const metadata: Metadata = { title: "데이터 내보내기 · 설정 · 감자밭" };

/**
 * 데이터 내보내기 (F-52): 가구 데이터 전체를 엑셀 파일 하나로 받는다. 다운로드는 일반 링크(아이폰 홈 화면 앱 포함).
 * 받기가 실패하면 /api/export가 ?error=1로 이 화면에 돌려보낸다 (글자만 있는 화면에 갇히지 않게).
 */
export default async function ExportSettingsPage({ searchParams }: PageProps<"/settings/export">) {
  await requireMember();
  const failed = (await searchParams).error === "1";
  return (
    <SettingsSubpage title="데이터 내보내기">
      {failed ? (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-body text-danger">
          내보내기에 실패했어요. 잠시 뒤 다시 해 주세요.
        </p>
      ) : null}
      <SettingsSection
        title="엑셀 백업"
        description="처음부터 지금까지의 데이터를 엑셀 파일 하나로 받아요. 앱에 문제가 생겨도 기록이 남도록 가끔 받아 두세요."
      >
        <p className="text-body text-ink">시트 {EXPORT_SHEET_NAMES.length}장</p>
        <p className="mt-1 text-caption text-ink-muted">{EXPORT_SHEET_NAMES.join(" · ")}</p>
        <p className="mt-3 text-caption text-ink-muted">지운 항목, 메모·일정, 알림, 설정값은 담지 않아요.</p>
        <a
          href="/api/export"
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-body font-semibold text-on-primary hover:bg-primary/90"
        >
          <Download size={20} strokeWidth={1.75} aria-hidden />
          엑셀로 내보내기
        </a>
        <p className="mt-3 text-caption text-ink-muted">아이폰에서 미리보기가 열리면 공유 → &quot;파일에 저장&quot;을 눌러요.</p>
      </SettingsSection>
    </SettingsSubpage>
  );
}
