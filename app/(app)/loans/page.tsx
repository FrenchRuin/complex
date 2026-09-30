import type { Metadata } from "next";
import { DebtList } from "@/components/loans/DebtList";
import { LoanProfileForm } from "@/components/loans/LoanProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getLoansOverview } from "@/lib/loans";

export const metadata: Metadata = { title: "대출 · 감자밭" };

/** 대출 계산 (F-43): 우리 정보, 기존 대출, 집 후보(매매·전세), 기준값 */
export default async function LoansPage() {
  await requireMember();
  const [data, members] = await Promise.all([getLoansOverview(), getHouseholdMembers()]);
  const names = toMemberNames(members);

  return (
    <>
      <PageHeader title="대출" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <p role="note" className="rounded-md bg-surface-sunken px-4 py-3 text-caption text-ink-muted">
          참고용 계산이에요. 실제 한도는 은행 심사, 신용점수, 보증기관 기준에 따라 달라요.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-4">
            <SettingsSection title="우리 정보" description="두 사람 소득을 합해서 계산해요.">
              <LoanProfileForm key={data.profile.updatedAt ?? "new"} profile={data.profile} names={names} />
            </SettingsSection>
            <SettingsSection title="기존 대출" description="DSR에 들어가는 1년 상환액을 계산해요. 불러온 항목은 금리와 기간을 채워 주세요.">
              <DebtList
                debts={data.debts}
                importableCount={data.importableCount}
                names={names}
                homeStatus={data.profile.homeStatus}
                rules={data.rules}
              />
            </SettingsSection>
          </div>
        </div>
      </div>
    </>
  );
}
