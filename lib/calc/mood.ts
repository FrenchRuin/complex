/** 오늘 기분 (F-04). 키는 DB moods.mood check와 같다 */
import { z } from "zod";
import type { DateString } from "@/lib/date";

export const MOODS = [
  { key: "good", emoji: "😊", label: "좋아요" },
  { key: "happy", emoji: "🥰", label: "행복해요" },
  { key: "excited", emoji: "😆", label: "신나요" },
  { key: "calm", emoji: "😌", label: "평온해요" },
  { key: "meh", emoji: "😐", label: "그저 그래요" },
  { key: "tired", emoji: "😴", label: "피곤해요" },
  { key: "busy", emoji: "😵", label: "바빠요" },
  { key: "annoyed", emoji: "😤", label: "짜증나요" },
  { key: "sad", emoji: "😢", label: "슬퍼요" },
  { key: "sick", emoji: "🤒", label: "아파요" },
  { key: "hungry", emoji: "🍚", label: "배고파요" },
  { key: "celebrate", emoji: "🥳", label: "축하해요" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];
export type TodayMood = { mood: MoodKey; note: string | null };

export const MOOD_NOTE_MAX = 20;

export function isMoodKey(value: string): value is MoodKey {
  return MOODS.some((m) => m.key === value);
}

export function moodOf(key: MoodKey) {
  return MOODS.find((m) => m.key === key)!;
}

/** "😴 피곤해요 · 야근 중" */
export function moodText({ mood, note }: TodayMood): string {
  const m = moodOf(mood);
  return note ? `${m.emoji} ${m.label} · ${note}` : `${m.emoji} ${m.label}`;
}

export const moodInputSchema = z.object({
  mood: z.string().refine(isMoodKey, "기분을 골라 주세요").transform((v) => v as MoodKey),
  note: z
    .string()
    .nullable()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= MOOD_NOTE_MAX, `한 줄은 ${MOOD_NOTE_MAX}자까지 쓸 수 있어요`)
    .transform((v) => (v === "" ? null : v)),
});

type MoodRow = { member_id: string; mood_date: string; mood: string; note: string | null; deleted_at: string | null };

/** 오늘 날짜·안 지운 기분만 사람별로 */
export function pickToday(rows: readonly MoodRow[], today: DateString): Record<string, TodayMood> {
  const out: Record<string, TodayMood> = {};
  for (const r of rows) {
    if (r.mood_date !== today || r.deleted_at !== null || !isMoodKey(r.mood)) continue;
    out[r.member_id] = { mood: r.mood, note: r.note };
  }
  return out;
}
