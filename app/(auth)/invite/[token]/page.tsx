import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayNameForm } from "@/components/household/DisplayNameForm";
import { CenteredCard } from "@/components/layout/CenteredCard";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

export const metadata: Metadata = { title: "초대 · 감자밭" };

const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  not_found: {
    title: "초대 링크를 찾을 수 없어요",
    description: "링크가 잘렸거나 잘못됐을 수 있어요. 배우자에게 링크를 다시 받아 주세요.",
  },
  used: {
    title: "이미 사용한 초대 링크예요",
    description: "초대 링크는 한 번만 쓸 수 있어요. 배우자에게 새 링크를 받아 주세요.",
  },
  expired: {
    title: "초대 링크가 만료됐어요",
    description: "초대 링크는 7일 동안만 쓸 수 있어요. 배우자에게 새 링크를 받아 주세요.",
  },
  full: {
    title: "이미 두 명이 쓰고 있어요",
    description: "이 가구에는 더 들어갈 수 없어요.",
  },
  already_member: {
    title: "이미 다른 가구에 들어가 있어요",
    description: "한 계정은 가구 하나에만 들어갈 수 있어요.",
  },
};

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite", { p_token: token });

  if (error) {
    return (
      <CenteredCard
        title="초대 정보를 불러오지 못했어요"
        description="잠시 후 새로고침해 주세요."
      />
    );
  }

  const invite = data[0];
  const status = invite?.status ?? "not_found";

  if (status === "joined") redirect("/");

  if (status !== "valid") {
    const message = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.not_found;
    return (
      <CenteredCard title={message.title} description={message.description}>
        <Link href="/" className="text-body font-semibold text-primary underline-offset-4 hover:underline">
          홈으로 가기
        </Link>
      </CenteredCard>
    );
  }

  const inviter = invite?.inviter_name ?? "배우자";

  return (
    <CenteredCard
      title={`${inviter}님이 초대했어요`}
      description="앱에서 부를 이름을 정하고 합류해 주세요."
    >
      <DisplayNameForm
        action={acceptInvite}
        hidden={{ token }}
        submitLabel="합류하기"
        pendingLabel="합류하는 중"
      />
    </CenteredCard>
  );
}
