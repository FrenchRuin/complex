import { moodOf, type TodayMood } from "@/lib/calc/mood";

/** 아바타 모서리에 붙는 기분 이모지. 이름 글자가 옆에 있으므로 스크린리더에는 sr-only로 이름을 준다 */
export function MoodBadge({ mood, className = "" }: { mood: TodayMood | undefined; className?: string }) {
  if (!mood) return null;
  const m = moodOf(mood.mood);
  return (
    <span className={`absolute inline-flex size-5 items-center justify-center rounded-full bg-surface-raised text-[13px] leading-none ring-2 ring-surface-raised ${className}`}>
      <span aria-hidden>{m.emoji}</span>
      <span className="sr-only">기분 {m.label}</span>
    </span>
  );
}
