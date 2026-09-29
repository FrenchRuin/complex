import { describe, expect, it } from "vitest";
import { calendarWeeks, dayCellLabel, rangeWeeks } from "./calendar";

describe("calendarWeeks", () => {
  it("2026년 9월은 화요일 시작, 5주", () => {
    const weeks = calendarWeeks("2026-09");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"]);
    expect(weeks[4]).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", null, null, null]);
  });

  it("일요일에 시작하는 2월은 4주 (2026년 2월)", () => {
    const weeks = calendarWeeks("2026-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2026-02-01");
    expect(weeks[3][6]).toBe("2026-02-28");
  });

  it("6주가 필요한 달 (2026년 8월)", () => {
    const weeks = calendarWeeks("2026-08");
    expect(weeks).toHaveLength(6);
    expect(weeks[0][6]).toBe("2026-08-01");
    expect(weeks[5][1]).toBe("2026-08-31");
  });

  it("모든 주는 7칸", () => {
    for (const month of ["2026-01", "2026-05", "2026-12"]) {
      expect(calendarWeeks(month).every((w) => w.length === 7)).toBe(true);
    }
  });
});

describe("rangeWeeks · dayCellLabel (한 달 기준 F-56)", () => {
  const range = { start: "2026-09-23", end: "2026-10-22" };

  it("기간만 칸으로, 요일에 맞춰 앞뒤 null", () => {
    const weeks = rangeWeeks(range);
    expect(weeks[0]).toEqual([null, null, null, "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"]);
    expect(weeks.at(-1)).toEqual(["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", null, null]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("첫날과 달이 바뀌는 날은 월/일", () => {
    expect(dayCellLabel("2026-09-23", range, false)).toBe("9/23");
    expect(dayCellLabel("2026-09-30", range, false)).toBe("30");
    expect(dayCellLabel("2026-10-01", range, false)).toBe("10/1");
    expect(dayCellLabel("2026-09-01", { start: "2026-09-01", end: "2026-09-30" }, true)).toBe("1");
  });
});
