import type { Metadata } from "next";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { UsageSection } from "@/components/settings/UsageSection";
import { requireMember } from "@/lib/household";
import { getUsage, supabaseProjectRef } from "@/lib/settings-data";

export const metadata: Metadata = { title: "서비스 사용량 · 설정 · 우리 둘 가계부" };

export default async function UsageSettingsPage() {
  await requireMember();
  const usage = await getUsage();
  return (
    <SettingsSubpage title="서비스 사용량">
      {usage ? (
        <UsageSection usage={usage} supabaseProjectRef={supabaseProjectRef()} />
      ) : (
        <p className="text-body text-ink-muted">사용량을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>
      )}
    </SettingsSubpage>
  );
}
