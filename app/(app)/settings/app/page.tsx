import type { Metadata } from "next";
import { InstallApp } from "@/components/settings/InstallApp";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { requireMember } from "@/lib/household";

export const metadata: Metadata = { title: "앱으로 설치 · 설정 · 감자밭" };

export default async function InstallSettingsPage() {
  await requireMember();
  return (
    <SettingsSubpage title="앱으로 설치">
      <InstallApp />
    </SettingsSubpage>
  );
}
