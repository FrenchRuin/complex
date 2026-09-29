"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  daysBetween,
  occurrencesBetween,
  occurrencesByDay,
  recurringDuesInMonth,
  upcomingOccurrences,
  type CalendarEvent,
  type Occurrence,
  type RecurringDue,
} from "@/lib/calc/events";
import type { HolidayMap } from "@/lib/calc/holidays";
import { addDays, monthOf, monthRange, type DateString, type MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import type { HouseholdMember } from "@/lib/household";
import type { RecurringItem } from "@/lib/recurring";
import { DayAgenda } from "./DayAgenda";
import { EventPanel } from "./EventPanel";
import { OccurrenceRow } from "./OccurrenceRow";
import { ScheduleCalendar } from "./ScheduleCalendar";

type Props = {
  month: MonthString;
  today: DateString;
  events: CalendarEvent[];
  recurring: RecurringItem[];
  names: MemberNames;
  members: HouseholdMember[];
  /** 이 달 공휴일 (F-55) */
  holidays: HolidayMap;
};

/** 창에 띄운 일정: id와 회차 시작일로 들고, 그릴 때마다 최신 일정에서 다시 만든다 (저장 뒤 새 내용) */
type PanelState = { open: false } | { open: true; eventId: string | null; start: DateString; key: number };

function toOccurrence(event: CalendarEvent, start: DateString): Occurrence {
  // 반복 없는 일정은 고쳐서 날짜가 바뀌었을 수 있으니 일정의 날짜를 따른다
  const from = event.repeat === "none" ? event.startDate : start;
  return { event, start: from, end: addDays(from, daysBetween(event.startDate, event.endDate)), key: `${event.id}:${from}` };
}

/** 일정 화면 (F-19): 월 달력 + 고른 날 목록 + 다가오는 일정. ?event=id(알림·홈)면 그 일정을, ?new=1(홈)이면 추가 창을 연다 */
export function ScheduleBoard({ month, today, events, recurring, names, members, holidays }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range = monthRange(month);
  const [selected, setSelected] = useState<DateString>(monthOf(today) === month ? today : range.start);
  const [panel, setPanel] = useState<PanelState>({ open: false });

  // 두 사람 일정이라 개수가 적어 그릴 때마다 계산해도 가볍다
  const byDay = occurrencesByDay(occurrencesBetween(events, range), range);
  const dues = new Map<DateString, RecurringDue[]>();
  for (const due of recurringDuesInMonth(recurring, month)) dues.set(due.date, [...(dues.get(due.date) ?? []), due]);
  const upcoming = upcomingOccurrences(events, today, 5);

  const openOccurrence = (occ: Occurrence) => setPanel({ open: true, eventId: occ.event.id, start: occ.start, key: Date.now() });
  const openNew = (date: DateString) => setPanel({ open: true, eventId: null, start: date, key: Date.now() });

  // 주소로 연 창 (알림에서 옴): 닫으면 주소에서 지운다
  const eventParam = params.get("event");
  const fromQuery = eventParam ? events.find((e) => e.id === eventParam) : undefined;
  const closeQuery = () => router.replace(month === monthOf(today) ? pathname : `${pathname}?month=${month}`, { scroll: false });

  const panelEvent = panel.open && panel.eventId ? events.find((e) => e.id === panel.eventId) : undefined;
  let panelNode = null;
  if (panel.open && (panel.eventId === null || panelEvent)) {
    panelNode = (
      <EventPanel
        key={panel.key}
        occurrence={panelEvent ? toOccurrence(panelEvent, panel.start) : null}
        defaultDate={panel.start}
        names={names}
        members={members}
        onClose={() => setPanel({ open: false })}
      />
    );
  } else if (!fromQuery && params.get("new") === "1") {
    // 홈 카드의 "일정 추가"에서 옴
    panelNode = (
      <EventPanel key="query-new" occurrence={null} defaultDate={selected} names={names} members={members} onClose={closeQuery} />
    );
  } else if (fromQuery) {
    const first = occurrencesBetween([fromQuery], range)[0];
    panelNode = (
      <EventPanel
        key={`query-${fromQuery.id}`}
        occurrence={first ?? toOccurrence(fromQuery, fromQuery.startDate)}
        defaultDate={fromQuery.startDate}
        names={names}
        members={members}
        onClose={closeQuery}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Button onClick={() => openNew(selected)} className="h-11 self-end px-4">
          <Plus size={20} strokeWidth={1.75} aria-hidden />
          일정 추가
        </Button>
        <ScheduleCalendar
          month={month}
          today={today}
          selected={selected}
          byDay={byDay}
          dues={dues}
          holidays={holidays}
          onSelect={setSelected}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <DayAgenda
          date={selected}
          occurrences={byDay.get(selected) ?? []}
          dues={dues.get(selected) ?? []}
          holidayNames={holidays[selected] ?? []}
          names={names}
          onOpen={openOccurrence}
          onAdd={openNew}
        />
        <section aria-labelledby="upcoming" className="rounded-md bg-surface-raised p-5">
          <h2 id="upcoming" className="text-heading text-ink">
            다가오는 일정
          </h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-body text-ink-muted">앞으로 60일 동안 일정이 없어요.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {upcoming.map((occ) => (
                <li key={occ.key}>
                  <OccurrenceRow occurrence={occ} names={names} showDate onOpen={openOccurrence} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {panelNode}
    </div>
  );
}
