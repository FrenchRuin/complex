import type { Metadata } from "next";
import { PeriodMonthList, type PeriodMonthRow } from "@/components/settings/PeriodMonthList";
import { PeriodSettingsForm } from "@/components/settings/PeriodSettingsForm";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { periodOf, periodRange } from "@/lib/calc/period";
import { formatFullDate, shiftMonth, todayKST, type DateString } from "@/lib/date";
import { requireMember } from "@/lib/household";
import { getPeriodConfig } from "@/lib/period";

export const metadata: Metadata = { title: "한 달 기준 · 설정 · 우리 둘 가계부" };

/** "9월 23일 (수)" */
const short = (date: DateString) => formatFullDate(date).replace(/^\d+년 /, "");

/** 설정 → 한 달 기준 (F-56): 월급날부터 다음 월급날 전날까지를 한 달로 */
export default async function PeriodSettingsPage() {
  await requireMember();
  const cfg = await getPeriodConfig();
  const today = todayKST();
  const current = periodOf(today, cfg);
  const thisYear = today.slice(0, 4);

  // 지난달 ~ 석 달 뒤: 미리보기 겸 그 달만 시작일 고치기
  const rows: PeriodMonthRow[] = [-1, 0, 1, 2, 3].map((delta) => {
    const month = shiftMonth(current, delta);
    const range = periodRange(month, cfg);
    const m = Number(month.slice(5, 7));
    return {
      month,
      name: month.startsWith(thisYear) ? `${m}월` : `${month.slice(0, 4)}년 ${m}월`,
      rangeText: `${short(range.start)} ~ ${short(range.end)}`,
      start: range.start,
      overridden: month in cfg.overrides,
      current: delta === 0,
    };
  });

  return (
    <SettingsSubpage title="한 달 기준">
      <SettingsSection
        title="한 달 기준"
        description="월급날부터 다음 월급날 전날까지를 한 달로 봐요. 홈·예산·통계·내역·정기지출이 이 기준을 따라요. 일정 달력은 실제 달력 그대로예요."
      >
        <PeriodSettingsForm settings={{ startDay: cfg.startDay, label: cfg.label, shift: cfg.shift }} />
      </SettingsSection>

      <SettingsSection
        title="달마다 기간"
        description="월급이 다른 날 들어온 달은 그 달만 시작일을 바꿀 수 있어요. 끝나는 날은 다음 달 시작일 전날로 자동으로 맞춰져요."
      >
        <PeriodMonthList rows={rows} />
      </SettingsSection>
    </SettingsSubpage>
  );
}
