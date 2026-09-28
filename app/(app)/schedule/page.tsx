import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { currentMonthKST, shiftMonth, todayKST, type MonthString } from "@/lib/date";
import { getEvents } from "@/lib/events";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getRecurringOverview } from "@/lib/recurring";

export const metadata: Metadata = { title: "일정 · 우리 둘 가계부" };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function MonthNav({ month, current, direction }: { month: MonthString; current: MonthString; direction: "prev" | "next" }) {
  const target = shiftMonth(month, direction === "prev" ? -1 : 1);
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={target === current ? "/schedule" : `/schedule?month=${target}`}
      aria-label={direction === "prev" ? "이전 달" : "다음 달"}
      scroll={false}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
    >
      <Icon size={22} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

/** 공유 일정 (F-19): 월 달력, 고른 날 목록, 다가오는 일정. 정기지출 결제일도 함께 (읽기만) */
export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  await requireMember();
  const current = currentMonthKST();
  const raw = (await searchParams).month;
  const month = typeof raw === "string" && MONTH.test(raw) ? raw : current;
  const [events, recurring, members] = await Promise.all([getEvents(), getRecurringOverview(), getHouseholdMembers()]);

  return (
    <>
      <PageHeader
        title={<MonthPicker month={month} currentMonth={current} path="/schedule" query="" />}
        titleStart={<MonthNav month={month} current={current} direction="prev" />}
        titleEnd={<MonthNav month={month} current={current} direction="next" />}
      />
      <div className="px-5 py-4 lg:px-8 lg:py-6">
        {/* 달이 바뀌면 고른 날·창을 새로 시작 */}
        <ScheduleBoard
          key={month}
          month={month}
          today={todayKST()}
          events={events}
          recurring={recurring.items}
          names={toMemberNames(members)}
          members={members}
        />
      </div>
    </>
  );
}
