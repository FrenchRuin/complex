import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { PersonChip } from "@/components/ui/PersonChip";
import { dateRangeLabel, timeLabel, upcomingOccurrences, type CalendarEvent } from "@/lib/calc/events";
import { monthOf, type DateString } from "@/lib/date";
import { ownerLabel, type MemberNames } from "@/lib/domain";

type Props = { events: readonly CalendarEvent[]; today: DateString; names: MemberNames };

/** 홈 "다가오는 일정" 카드 (F-19): 오늘부터 가까운 3개. 폰에서는 ☰ 메뉴와 함께 일정 화면으로 가는 길 */
export function UpcomingEventsCard({ events, today, names }: Props) {
  const upcoming = upcomingOccurrences(events, today, 3);

  return (
    <section aria-labelledby="home-events" className="rounded-md bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <Link
          href="/schedule"
          id="home-events"
          className="-m-1 inline-flex items-center gap-1 rounded-sm p-1 text-heading text-ink hover:bg-surface-sunken"
        >
          다가오는 일정
          <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
        </Link>
        <Link
          href="/schedule?new=1"
          className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body font-semibold text-primary hover:bg-surface-sunken"
        >
          <Plus size={18} strokeWidth={1.75} aria-hidden />
          일정 추가
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="mt-1 text-body text-ink-muted">앞으로 60일 동안 일정이 없어요. 기념일·약속을 함께 적어 보세요.</p>
      ) : (
        <ul className="mt-2">
          {upcoming.map((occ) => {
            const month = monthOf(occ.start);
            const href = `/schedule?${month === monthOf(today) ? "" : `month=${month}&`}event=${occ.event.id}`;
            return (
              <li key={occ.key} className="border-b border-line last:border-b-0">
                <Link href={href} className="flex items-center gap-3 py-3 hover:bg-surface-sunken/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">{occ.event.title}</span>
                    <span className="block truncate text-caption text-ink-muted tabular-nums">
                      {dateRangeLabel(occ.start, occ.end)} · {timeLabel(occ.event)}
                    </span>
                  </span>
                  <PersonChip owner={occ.event.owner} label={ownerLabel(occ.event.owner, names)} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
