import type { Metadata } from "next";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { ThemeSetting } from "@/components/settings/ThemeSetting";
import { requireMember } from "@/lib/household";

export const metadata: Metadata = { title: "화면 모드 · 설정 · 감자밭" };

export default async function ThemeSettingsPage() {
  await requireMember();
  return (
    <SettingsSubpage title="화면 모드">
      <ThemeSetting />
    </SettingsSubpage>
  );
}
