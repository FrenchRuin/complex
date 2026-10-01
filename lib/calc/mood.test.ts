import { describe, expect, it } from "vitest";
import { MOODS, isMoodKey, moodInputSchema, moodText, pickToday } from "./mood";

describe("MOODS", () => {
  it("12개, 스펙 순서", () => {
    expect(MOODS.map((m) => `${m.emoji} ${m.label}`)).toEqual([
      "😊 좋아요", "🥰 행복해요", "😆 신나요", "😌 평온해요", "😐 그저 그래요", "😴 피곤해요",
      "😵 바빠요", "😤 짜증나요", "😢 슬퍼요", "🤒 아파요", "🍚 배고파요", "🥳 축하해요",
    ]);
    expect(isMoodKey("tired")).toBe(true);
    expect(isMoodKey("nope")).toBe(false);
  });
});

describe("moodText", () => {
  it("메모가 있으면 가운뎃점 뒤에", () => {
    expect(moodText({ mood: "tired", note: "야근 중" })).toBe("😴 피곤해요 · 야근 중");
    expect(moodText({ mood: "happy", note: null })).toBe("🥰 행복해요");
  });
});

describe("moodInputSchema", () => {
  it("공백을 지우고 빈 글은 null", () => {
    expect(moodInputSchema.parse({ mood: "good", note: "  밥 먹자 " })).toEqual({ mood: "good", note: "밥 먹자" });
    expect(moodInputSchema.parse({ mood: "good", note: "   " })).toEqual({ mood: "good", note: null });
    expect(moodInputSchema.parse({ mood: "good", note: null })).toEqual({ mood: "good", note: null });
  });
  it("20자 넘음, 없는 기분은 거절", () => {
    expect(moodInputSchema.safeParse({ mood: "good", note: "가".repeat(20) }).success).toBe(true);
    const long = moodInputSchema.safeParse({ mood: "good", note: "가".repeat(21) });
    expect(long.success ? null : long.error.issues[0].message).toBe("한 줄은 20자까지 쓸 수 있어요");
    const bad = moodInputSchema.safeParse({ mood: "nope", note: null });
    expect(bad.success ? null : bad.error.issues[0].message).toBe("기분을 골라 주세요");
  });
});

describe("pickToday", () => {
  it("오늘 날짜·안 지운 것만, 사람별로", () => {
    const rows = [
      { member_id: "a", mood_date: "2026-10-01", mood: "tired", note: "야근", deleted_at: null },
      { member_id: "b", mood_date: "2026-09-30", mood: "sad", note: null, deleted_at: null },
      { member_id: "b", mood_date: "2026-10-01", mood: "good", note: null, deleted_at: "2026-10-01T01:00:00Z" },
      { member_id: "c", mood_date: "2026-10-01", mood: "nope", note: null, deleted_at: null },
    ];
    expect(pickToday(rows, "2026-10-01")).toEqual({ a: { mood: "tired", note: "야근" } });
  });
});
