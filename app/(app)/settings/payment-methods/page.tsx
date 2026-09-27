import type { Metadata } from "next";
import { PaymentMethodSection } from "@/components/settings/PaymentMethodSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getAllPaymentMethods } from "@/lib/settings-data";

export const metadata: Metadata = { title: "계좌·카드 · 설정 · 우리 둘 가계부" };

export default async function PaymentMethodSettingsPage() {
  await requireMember();
  const [members, methods] = await Promise.all([getHouseholdMembers(), getAllPaymentMethods()]);
  return (
    <SettingsSubpage title="계좌·카드">
      <PaymentMethodSection names={toMemberNames(members)} methods={methods} />
    </SettingsSubpage>
  );
}
