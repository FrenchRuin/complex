import { describe, expect, it } from "vitest";
import { effectiveHolidays, holidayEntries, isBusinessDay, previousBusinessDay, type CustomHoliday } from "./holidays";

// 2026년 추석 연휴(9/24~26)와 개천절(10/3, 토) 일부
const preset = {
  "2026-09-24": ["추석"],
  "2026-09-25": ["추석"],
  "2026-09-26": ["추석"],
  "2026-10-03": ["개천절"],
  "2026-10-05": ["대체공휴일(개천절)"],
} as const;

const custom: CustomHoliday[] = [
  { id: "c1", date: "2026-10-05", kind: "remove", name: "" }, // 우리 회사는 쉬지 않음
  { id: "c2", date: "2026-10-16", kind: "add", name: "창립기념일" },
];

describe("effectiveHolidays", () => {
  it("기본 + 추가 − 빼기", () => {
    const h = effectiveHolidays(preset, custom);
    expect(h["2026-10-05"]).toBeUndefined();
    expect(h["2026-10-16"]).toEqual(["창립기념일"]);
    expect(h["2026-09-25"]).toEqual(["추석"]);
  });
});

describe("holidayEntries", () => {
  it("뺀 기본 공휴일도 목록에 남고(되돌리기용), 직접 추가는 custom, 날짜순", () => {
    expect(holidayEntries(preset, custom).map((e) => [e.date, e.source, e.removed, e.customId])).toEqual([
      ["2026-09-24", "preset", false, null],
      ["2026-09-25", "preset", false, null],
      ["2026-09-26", "preset", false, null],
      ["2026-10-03", "preset", false, null],
      ["2026-10-05", "preset", true, "c1"],
      ["2026-10-16", "custom", false, "c2"],
    ]);
  });
});

describe("평일·앞 평일 (월급날 당기기)", () => {
  const h = effectiveHolidays(preset, custom);

  it("주말·공휴일은 평일이 아니다", () => {
    expect(isBusinessDay("2026-09-28", h)).toBe(true); // 월
    expect(isBusinessDay("2026-09-27", h)).toBe(false); // 일
    expect(isBusinessDay("2026-09-25", h)).toBe(false); // 추석
    expect(isBusinessDay("2026-10-05", h)).toBe(true); // 대체공휴일이지만 뺐음
  });

  it("평일이면 그날, 아니면 앞 평일", () => {
    expect(previousBusinessDay("2026-10-23", h)).toBe("2026-10-23"); // 금
    expect(previousBusinessDay("2026-10-25", h)).toBe("2026-10-23"); // 일 → 금
    expect(previousBusinessDay("2026-09-25", h)).toBe("2026-09-23"); // 추석 연휴 → 수
    expect(previousBusinessDay("2026-10-16", h)).toBe("2026-10-15"); // 직접 추가한 휴무 → 목
  });
});
