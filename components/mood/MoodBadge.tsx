import { moodOf, type TodayMood } from "@/lib/calc/mood";

/** 아바타 모서리에 붙는 기분 이모지. 아바타 옆에 이름 글자가 없을 수 있어 누구 기분인지 함께 읽어 준다 */
export function MoodBadge({ name, mood, className = "" }: { name: string; mood: TodayMood | undefined; className?: string }) {
  if (!mood) return null;
  const m = moodOf(mood.mood);
  return (
    <span className={`absolute inline-flex size-5 items-center justify-center rounded-full bg-surface-raised text-[13px] leading-none ring-2 ring-surface-raised ${className}`}>
      <span aria-hidden title={`${name} ${m.label}`}>{m.emoji}</span>
      <span className="sr-only">
        {name} 기분 {m.label}
      </span>
    </span>
  );
}
