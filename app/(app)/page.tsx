import Link from "next/link";
import { CenteredCard } from "@/components/layout/CenteredCard";
import { PersonChip } from "@/components/ui/PersonChip";
import { getHouseholdMembers, requireMember } from "@/lib/household";

/** 임시 홈 (M1). M3에서 대시보드로 바뀐다. */
export default async function HomePage() {
  const me = await requireMember();
  const members = await getHouseholdMembers();
  const partner = members.find((m) => m.id !== me.id);

  return (
    <CenteredCard
      title={`${me.displayName}님, 반가워요`}
      description={
        partner
          ? `${partner.displayName}님과 함께 쓰고 있어요. 가계부 화면은 다음 단계에서 만들어요.`
          : "아직 혼자예요. 설정에서 초대 링크를 만들어 배우자에게 보내 주세요."
      }
    >
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <PersonChip key={m.id} owner={m.slot} label={m.displayName} />
        ))}
      </div>
      <Link
        href="/settings"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-body font-semibold text-on-primary"
      >
        설정으로 가기
      </Link>
    </CenteredCard>
  );
}
