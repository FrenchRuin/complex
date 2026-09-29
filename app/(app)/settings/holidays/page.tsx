import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HolidayAddForm } from "@/components/settings/HolidayAddForm";
import { HolidayList } from "@/components/settings/HolidayList";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { holidayEntries } from "@/lib/calc/holidays";
import { todayKST } from "@/lib/date";
import { requireMember } from "@/lib/household";
import { getCustomHolidays, getPresetHolidays, hasPresetYear } from "@/lib/holidays";

export const metadata: Metadata = { title: "공휴일 · 설정 · 우리 둘 가계부" };

const YEAR_LINK =
  "inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken";

/** 설정 → 공휴일 (F-55): 그 해 공휴일 목록, 직접 추가·빼기. 월급날 계산과 일정 달력에 쓴다 */
export default async function HolidaySettingsPage({ searchParams }: PageProps<"/settings/holidays">) {
  await requireMember();
  const today = todayKST();
  const raw = Number((await searchParams).year);
  const year = Number.isInteger(raw) && raw >= 2000 && raw <= 2100 ? raw : Number(today.slice(0, 4));
  const [preset, custom, hasData] = await Promise.all([getPresetHolidays(year), getCustomHolidays(), hasPresetYear(year)]);
  const entries = holidayEntries(
    preset,
    custom.filter((c) => c.date.startsWith(`${year}-`)),
  );
  const defaultDate = today.startsWith(`${year}-`) ? today : `${year}-01-01`;

  return (
    <SettingsSubpage title="공휴일">
      <SettingsSection
        title="공휴일 목록"
        description="기본 공휴일은 정부 발표(월력요항) 기준이에요. 월급날이 쉬는 날이면 앞 평일로 당겨 계산하고, 일정 달력에도 표시돼요."
      >
        <nav aria-label="연도" className="mb-2 flex items-center justify-center gap-2">
          <Link href={`/settings/holidays?year=${year - 1}`} aria-label="이전 해" className={YEAR_LINK}>
            <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
          </Link>
          <span className="text-heading text-ink tabular-nums">{year}년</span>
          <Link href={`/settings/holidays?year=${year + 1}`} aria-label="다음 해" className={YEAR_LINK}>
            <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        </nav>
        {hasData ? null : (
          <p className="mb-2 rounded-sm bg-primary-soft px-4 py-3 text-caption text-ink">
            {year}년 기본 공휴일 데이터가 아직 없어요. 앱이 업데이트되면 채워져요. 그전까지는 직접 추가한 날만 쉬는 날로 봐요.
          </p>
        )}
        <HolidayList entries={entries} />
      </SettingsSection>

      <SettingsSection title="공휴일 추가" description="임시공휴일이나 회사 휴무처럼 목록에 없는 쉬는 날을 넣어요.">
        <HolidayAddForm key={year} defaultDate={defaultDate} />
      </SettingsSection>
    </SettingsSubpage>
  );
}
