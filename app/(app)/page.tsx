import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PersonChip } from "@/components/ui/PersonChip";
import { getHouseholdMembers, requireMember } from "@/lib/household";

/** 임시 홈 (M2). M3에서 대시보드로 바뀐다. */
export default async function HomePage() {
  const me = await requireMember();
  const members = await getHouseholdMembers();
  const partner = members.find((m) => m.id !== me.id);

  return (
    <>
      <PageHeader title="홈" />
      <div className="px-5 py-6 lg:px-8">
        <section className="rounded-md bg-surface-raised p-5">
          <h2 className="text-heading text-ink">{me.displayName}님, 반가워요</h2>
          <p className="mt-1 text-body text-ink-muted">
            {partner
              ? `${partner.displayName}님과 함께 쓰고 있어요. 홈 대시보드는 M3에서 만들어요.`
              : "아직 혼자예요. 설정에서 초대 링크를 만들어 배우자에게 보내 주세요."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {members.map((m) => (
              <PersonChip key={m.id} owner={m.slot} label={m.displayName} />
            ))}
          </div>
          <Link
            href="/transactions"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-body font-semibold text-on-primary"
          >
            내역 보러 가기
          </Link>
        </section>
      </div>
    </>
  );
}
