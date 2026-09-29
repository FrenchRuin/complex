import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecurringChecklist } from "@/components/recurring/RecurringChecklist";
import { RecurringManager } from "@/components/recurring/RecurringManager";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { formatMonthLabel } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getVisibleCategories, getVisiblePaymentMethods } from "@/lib/household-data";
import { getRecurringOverview } from "@/lib/recurring";
import { getLabelMaps } from "@/lib/transactions";

export const metadata: Metadata = { title: "정기지출 · 감자밭" };

/** 정기지출: 이번 달 납부 체크 + 등록·관리 (F-30, F-31) */
export default async function RecurringPage() {
  const me = await requireMember();
  const [overview, members, categories, paymentMethods, labels] = await Promise.all([
    getRecurringOverview(),
    getHouseholdMembers(),
    getVisibleCategories(),
    getVisiblePaymentMethods(),
    getLabelMaps(),
  ]);
  const names = toMemberNames(members);

  return (
    <>
      <PageHeader title="정기지출" />
      <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
        <SettingsSection title={`${formatMonthLabel(overview.month)} 납부`}>
          <RecurringChecklist
            overview={overview}
            names={names}
            paymentMethodNames={labels.paymentMethods}
          />
        </SettingsSection>
        <SettingsSection
          title="정기지출 관리"
          description="중지하면 다음 달부터 목록에 나오지 않아요. 지난 기록은 그대로 남아요."
        >
          <RecurringManager
            items={overview.items}
            monthFirst={`${overview.month}-01`}
            data={{ categories, paymentMethods, names, mySlot: me.slot }}
          />
        </SettingsSection>
      </div>
    </>
  );
}
