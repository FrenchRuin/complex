import { formatPeriodRange, isCalendarRange } from "@/lib/calc/period";
import { madeOnText } from "@/lib/calc/report";
import type { DateRange, DateString } from "@/lib/date";
import { PrintButton } from "./print";

type Props = { title: string; range: DateRange; inProgress: boolean; today: DateString };

/** 결산 머리 (F-25): 인쇄할 때만 큰 제목(화면은 위 머리줄에 있음), 기간·만든 날, 진행 중 배지, PDF로 저장 */
export function ReportHeader({ title, range, inProgress, today }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="hidden text-title text-ink print:block">{title}</p>
        <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted tabular-nums">
          {isCalendarRange(range) ? null : <span>{formatPeriodRange(range)}</span>}
          <span>{madeOnText(today)}</span>
          {inProgress ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-label text-primary">진행 중</span> : null}
        </p>
      </div>
      <PrintButton />
    </div>
  );
}
