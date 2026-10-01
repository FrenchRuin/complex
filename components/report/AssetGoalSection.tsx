import Link from "next/link";
import { AssetCompositionChart } from "@/components/assets/AssetCompositionChart";
import { SettingsSection } from "@/components/settings/SettingsSection";
import type { CompositionPart } from "@/lib/calc/assets";
import { netWorthDiffText, type NetWorthChange, type ReportGoal } from "@/lib/calc/report";
import { formatWon } from "@/lib/money";

type Props = { change: NetWorthChange | null; composition: CompositionPart[]; goals: ReportGoal[] };

/** 자산·목표 (F-25): 기간 끝 순자산과 지난달 대비, 자산 구성(지금 금액), 목표 진행률·그 달 적립 */
export function AssetGoalSection({ change, composition, goals }: Props) {
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="자산·목표">
        {change === null && goals.length === 0 ? (
          <p className="text-body text-ink-muted">
            자산과 목표를 아직 적지 않았어요.{" "}
            <Link href="/assets" className="font-semibold text-primary underline-offset-4 hover:underline print:hidden">
              자산·목표
            </Link>
          </p>
        ) : null}
        {change ? (
          <div>
            <p className="text-caption text-ink-muted">순자산</p>
            <p className="text-amount-hero text-ink tabular-nums">{formatWon(change.net)}</p>
            <p className="mt-1 text-caption text-ink-muted tabular-nums">{netWorthDiffText(change.diff)}</p>
          </div>
        ) : null}
        {composition.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-2 text-label text-ink-muted">지금 자산 구성</h3>
            <AssetCompositionChart parts={composition} />
          </div>
        ) : null}
        {goals.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-2 text-label text-ink-muted">저축 목표</h3>
            <ul className="flex flex-col gap-3">
              {goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex justify-between gap-2 text-body tabular-nums">
                    <span className="min-w-0 truncate text-ink">{g.name}</span>
                    <span className="shrink-0 text-caption text-ink-muted">
                      {formatWon(g.saved)} / {formatWon(g.targetAmount)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${g.name} 진행률`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={g.percent}
                    className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${g.percent}%` }} />
                  </div>
                  <p className="mt-1 text-caption text-ink-muted tabular-nums">
                    {g.percent}% · {g.addedThisPeriod > 0 ? `이 달 ${formatWon(g.addedThisPeriod)} 모았어요` : "이 달 적립 없음"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SettingsSection>
    </div>
  );
}
