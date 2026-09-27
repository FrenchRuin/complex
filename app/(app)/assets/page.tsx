import type { Metadata } from "next";
import { AssetList } from "@/components/assets/AssetList";
import { GoalList } from "@/components/assets/GoalList";
import { NetWorthChart } from "@/components/assets/NetWorthChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getAssetsOverview } from "@/lib/assets";
import { netWorth, netWorthTrend } from "@/lib/calc/assets";
import { currentMonthKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { formatWon } from "@/lib/money";

export const metadata: Metadata = { title: "자산·목표 · 우리 둘 가계부" };

/** 자산·목표 (F-40~F-42): 순자산, 자산·부채, 추이, 저축 목표 */
export default async function AssetsPage() {
  const me = await requireMember();
  const [overview, members] = await Promise.all([getAssetsOverview(), getHouseholdMembers()]);
  const names = toMemberNames(members);
  const worth = netWorth(overview.assets);

  return (
    <>
      <PageHeader title="자산·목표" />
      <div className="grid gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="net-worth-title" className="rounded-md bg-surface-raised p-5">
            <h2 id="net-worth-title" className="text-heading text-ink">
              순자산
            </h2>
            <p className="mt-2 text-amount-hero text-ink tabular-nums">
              {worth.net < 0 ? "−" : ""}
              {formatWon(Math.abs(worth.net))}
            </p>
            <p className="mt-1 text-caption text-ink-muted tabular-nums">
              자산 {formatWon(worth.assets)} − 부채 {formatWon(worth.liabilities)}
            </p>
          </section>
          <SettingsSection title="자산·부채" description="금액이 바뀌면 항목을 눌러 고쳐 주세요.">
            <AssetList assets={overview.assets} names={names} />
          </SettingsSection>
        </div>
        <div className="flex flex-col gap-4">
          <SettingsSection title="순자산 추이" description="매달 말 기준 순자산이에요.">
            <NetWorthChart points={netWorthTrend(overview.snapshots, worth.net, currentMonthKST())} />
          </SettingsSection>
          <SettingsSection title="저축 목표" description="적립은 목표에만 기록되고 가계부 지출에는 들어가지 않아요.">
            <GoalList goals={overview.goals} names={names} mySlot={me.slot} />
          </SettingsSection>
        </div>
      </div>
    </>
  );
}
