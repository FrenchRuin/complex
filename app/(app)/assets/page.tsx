import type { Metadata } from "next";
import { AssetList } from "@/components/assets/AssetList";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getAssetsOverview } from "@/lib/assets";
import { netWorth } from "@/lib/calc/assets";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { formatWon } from "@/lib/money";

export const metadata: Metadata = { title: "자산 · 감자밭" };

/** 자산 (F-40, F-41): 순자산, 자산·부채 목록 (2026-10-25 단순화) */
export default async function AssetsPage() {
  await requireMember();
  const [overview, members] = await Promise.all([getAssetsOverview(), getHouseholdMembers()]);
  const names = toMemberNames(members);
  const worth = netWorth(overview.assets);

  return (
    <>
      <PageHeader title="자산" />
      <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
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
        <SettingsSection title="자산·부채" description="항목을 누르면 잔액을 맞추거나 이 자산 내역을 볼 수 있어요.">
          <AssetList assets={overview.assets} names={names} />
        </SettingsSection>
      </div>
    </>
  );
}
