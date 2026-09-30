import type { Metadata } from "next";
import { AssetCompositionChart } from "@/components/assets/AssetCompositionChart";
import { AssetList } from "@/components/assets/AssetList";
import { GoalList } from "@/components/assets/GoalList";
import { NetWorthChart } from "@/components/assets/NetWorthChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getAssetsOverview } from "@/lib/assets";
import { assetComposition, netWorth, netWorthTrend } from "@/lib/calc/assets";
import { periodOf, periodRange } from "@/lib/calc/period";
import { todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { formatWon } from "@/lib/money";
import { getPeriodConfig } from "@/lib/period";

export const metadata: Metadata = { title: "자산·목표 · 감자밭" };

/** 자산·목표 (F-40~F-42): 순자산, 자산·부채, 추이, 저축 목표 */
export default async function AssetsPage() {
  const me = await requireMember();
  const [overview, members, cfg] = await Promise.all([getAssetsOverview(), getHouseholdMembers(), getPeriodConfig()]);
  const names = toMemberNames(members);
  const worth = netWorth(overview.assets);
  // 순자산 추이도 한 달 기준(F-56): 각 기간 마지막 날 기준
  const today = todayKST();
  const trend = netWorthTrend(
    overview.history.assets,
    overview.history.values,
    periodOf(today, cfg),
    today,
    (date) => periodOf(date, cfg),
    (month) => periodRange(month, cfg).end,
  );

  return (
    <>
      <PageHeader title="자산·목표" />
      <div className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="net-worth-title" className="rounded-md bg-surface-raised p-5">
            <h2 id="net-worth-title" className="text-heading text-ink">
              순자산
            </h2>
            <p className="mt-2 text-amount-hero text-ink tabular-nums">
              {worth.net < 0 ? "−" : ""}
              {formatWon(Math.abs(worth.net))}
            </p>
            {/* 자산은 수입처럼 파랑, 부채는 지출처럼 빨강. "자산"·"부채" 글자와 함께 */}
            <p className="mt-1 text-caption text-ink-muted tabular-nums">
              자산 <span className="text-primary">{formatWon(worth.assets)}</span> − 부채{" "}
              <span className="text-expense">{formatWon(worth.liabilities)}</span>
            </p>
          </section>
          <SettingsSection title="자산 구성" description="부채를 뺀 자산을 종류별로 나눈 비율이에요.">
            <AssetCompositionChart parts={assetComposition(overview.assets)} />
          </SettingsSection>
          <SettingsSection title="자산·부채" description="금액이 바뀌면 항목을 눌러 금액 기록을 추가해 주세요.">
            <AssetList assets={overview.assets} names={names} />
          </SettingsSection>
        </div>
        <div className="flex flex-col gap-4">
          <SettingsSection
            title="순자산 추이"
            description="매달 말일 기준으로, 그때까지의 가장 최근 금액 기록을 더해 계산해요. 이번 달은 오늘 기준이에요."
          >
            <NetWorthChart points={trend} />
          </SettingsSection>
          <SettingsSection title="저축 목표" description="적립은 목표에만 기록되고 가계부 지출에는 들어가지 않아요.">
            <GoalList goals={overview.goals} names={names} mySlot={me.slot} />
          </SettingsSection>
        </div>
      </div>
    </>
  );
}
