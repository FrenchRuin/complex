import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DisplayNameForm } from "@/components/household/DisplayNameForm";
import { CenteredCard } from "@/components/layout/CenteredCard";
import { getCurrentMember } from "@/lib/household";
import { createHousehold } from "./actions";

export const metadata: Metadata = { title: "가구 만들기 · 감자밭" };

export default async function OnboardingPage() {
  if (await getCurrentMember()) redirect("/");

  return (
    <CenteredCard
      title="가구 만들기"
      description="앱에서 부를 이름을 정해 주세요. 가구를 만든 뒤 설정에서 배우자를 초대할 수 있어요."
    >
      <DisplayNameForm action={createHousehold} submitLabel="가구 만들기" pendingLabel="만드는 중" />
      <p className="mt-6 border-t border-line pt-4 text-caption text-ink-muted">
        배우자에게 초대 링크를 받았다면 가구를 만들지 말고 그 링크를 열어 주세요.
      </p>
    </CenteredCard>
  );
}
