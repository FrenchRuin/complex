import { moodText, type TodayMood } from "@/lib/calc/mood";
import type { HouseholdMember } from "@/lib/household";
import { Avatar } from "@/components/ui/Avatar";
import { MoodPicker } from "./MoodPicker";

type Props = { meId: string; members: HouseholdMember[]; moods: Record<string, TodayMood> };

/** 홈 위쪽: 두 사람의 오늘 기분 (F-04). 내 칸은 눌러서 고른다 */
export function TodayMoods({ meId, members, moods }: Props) {
  return (
    <section aria-label="오늘 기분" className="rounded-md bg-surface-raised px-5 py-4">
      <h2 className="sr-only">오늘 기분</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        {members.map((m) => {
          const mood = moods[m.id];
          const text = mood ? moodText(mood) : "아직 안 정했어요";
          const row = (
            <>
              <Avatar slot={m.slot} name={m.displayName} avatarUrl={m.avatarUrl} />
              <span className="shrink-0 text-body font-semibold whitespace-nowrap text-ink">{m.displayName}</span>
              <span className={`min-w-0 truncate text-body ${mood ? "text-ink" : "text-ink-muted"}`}>{text}</span>
            </>
          );
          return (
            <li key={m.id} className="min-w-0">
              {m.id === meId ? (
                <MoodPicker current={mood ?? null} side="bottom">
                  <button
                    type="button"
                    aria-label={`오늘 기분 고르기, 지금 ${text}`}
                    className="-mx-2 flex min-h-11 max-w-full items-center gap-3 rounded-sm px-2 hover:bg-surface-sunken"
                  >
                    {row}
                  </button>
                </MoodPicker>
              ) : (
                <div className="flex min-h-11 items-center gap-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
