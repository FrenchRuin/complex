import Link from "next/link";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { summaryText } from "@/lib/calc/recurring";
import { unpaidNames } from "@/lib/calc/report";
import { formatWon } from "@/lib/money";
import type { RecurringOverview } from "@/lib/recurring";

type Props = { overview: RecurringOverview; fixedTotal: number; inProgress: boolean };

/** 정기지출 (F-25): 그 달 납부 요약, 안 낸 항목, 예산 없는 고정지출 */
export function RecurringSection({ overview, fixedTotal, inProgress }: Props) {
  const unpaid = unpaidNames(overview.rows);
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="정기지출">
        {overview.summary.total === 0 ? (
          <p className="text-body text-ink-muted">
            이 달에는 정기지출이 없어요.{" "}
            <Link href="/recurring" className="font-semibold text-primary underline-offset-4 hover:underline print:hidden">
              정기지출 관리
            </Link>
          </p>
        ) : (
          <p className="text-body text-ink tabular-nums">{summaryText(overview.summary)}</p>
        )}
        {unpaid.length > 0 ? (
          <p className="mt-2 text-body text-ink-muted">
            {inProgress ? "아직 안 낸 항목" : "안 낸 항목"}: {unpaid.join(", ")}
          </p>
        ) : null}
        {fixedTotal > 0 ? (
          <p className="mt-2 text-body text-ink tabular-nums">예산 없는 고정지출 {formatWon(fixedTotal)}</p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
