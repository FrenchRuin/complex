import { barWidth } from "@/lib/calc/budget";
import { formatWon } from "@/lib/money";

type Props = { percent: number; overBy: number; label: string };

/**
 * 예산 진행바 (F-22). 트랙 surface-sunken, 채움 primary.
 * 100%를 넘으면 danger 채움 + "초과 ○원" 배지 (색만으로 표시하지 않음).
 */
export function BudgetBar({ percent, overBy, label }: Props) {
  const over = overBy > 0;
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={`${label} 예산 사용률`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barWidth(percent)}
        aria-valuetext={over ? `${percent}%, 초과 ${formatWon(overBy)}` : `${percent}%`}
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-primary"}`} style={{ width: `${barWidth(percent)}%` }} />
      </div>
      {over ? (
        <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-label text-danger tabular-nums">
          초과 {formatWon(overBy)}
        </span>
      ) : (
        <span className="w-10 shrink-0 text-right text-caption text-ink-muted tabular-nums">{percent}%</span>
      )}
    </div>
  );
}
