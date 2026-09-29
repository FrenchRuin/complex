import type { Metadata } from "next";
import { HouseholdSection } from "@/components/settings/HouseholdSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { formatMonthDayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember } from "@/lib/household";
import { getActiveInvite, getOrigin } from "@/lib/settings-data";

export const metadata: Metadata = { title: "가구·초대 · 설정 · 감자밭" };

export default async function HouseholdSettingsPage() {
  await requireMember();
  const [members, invite, origin] = await Promise.all([getHouseholdMembers(), getActiveInvite(), getOrigin()]);
  return (
    <SettingsSubpage title="가구·초대">
      <HouseholdSection
        members={members}
        origin={origin}
        activeInvite={invite ? { token: invite.token, expiresLabel: formatMonthDayKST(invite.expiresAt) } : null}
      />
    </SettingsSubpage>
  );
}
