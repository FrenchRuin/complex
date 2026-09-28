import type { Metadata } from "next";
import { AvatarUploadForm } from "@/components/household/AvatarUploadForm";
import { DisplayNameForm } from "@/components/household/DisplayNameForm";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { requireMember } from "@/lib/household";
import { updateDisplayName } from "../actions";

export const metadata: Metadata = { title: "프로필 · 설정 · 우리 둘 가계부" };

export default async function ProfileSettingsPage() {
  const me = await requireMember();
  return (
    <SettingsSubpage title="프로필">
      <SettingsSection title="프로필 사진" description="jpg, png, webp · 5MB까지">
        <AvatarUploadForm slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
      </SettingsSection>
      <SettingsSection title="표시 이름" description="앱의 모든 곳에서 이 이름으로 불러요.">
        <DisplayNameForm
          action={updateDisplayName}
          defaultValue={me.displayName}
          submitLabel="저장"
          pendingLabel="저장하는 중"
          successMessage="저장했어요"
        />
      </SettingsSection>
    </SettingsSubpage>
  );
}
