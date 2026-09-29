import { describe, expect, it } from "vitest";
import { samePeriodLastMonth } from "@/lib/date";
import {
  CALENDAR_MONTH,
  formatPeriodRange,
  isCalendarRange,
  overrideError,
  periodOf,
  periodRange,
  samePeriodLastPeriod,
  type PeriodConfig,
} from "./period";

// 2026년: 9/24~26 추석, 10/3 개천절(토), 10/5 대체공휴일
const holidays = {
  "2026-09-24": ["추석 전날"],
  "2026-09-25": ["추석"],
  "2026-09-26": ["추석 다음 날"],
  "2026-10-03": ["개천절"],
  "2026-10-05": ["대체공휴일(개천절)"],
};
const payday25: PeriodConfig = { startDay: 25, label: "end", shift: true, overrides: {}, holidays };

describe("1일 기준 (기본값) = 달력의 한 달, 지금과 같다", () => {
  it("범위와 지난달 같은 기간", () => {
    expect(periodRange("2026-02", CALENDAR_MONTH)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(periodOf("2026-09-30", CALENDAR_MONTH)).toBe("2026-09");
    for (const today of ["2026-03-31", "2026-09-29", "2026-01-15"]) {
      expect(samePeriodLastPeriod(today, CALENDAR_MONTH)).toEqual(samePeriodLastMonth(today));
    }
    expect(isCalendarRange(periodRange("2026-09", CALENDAR_MONTH))).toBe(true);
  });
});

describe("월급날 25일, 끝나는 달 이름, 주말·공휴일이면 앞 평일", () => {
  it("10월 = 9월 25일 시작인데 추석이라 9/23(수)로 당김, 끝은 11월 시작 전날", () => {
    // 11월 기간 시작 = 10/25(일) → 10/23(금)
    expect(periodRange("2026-10", payday25)).toEqual({ start: "2026-09-23", end: "2026-10-22" });
    expect(formatPeriodRange(periodRange("2026-10", payday25))).toBe("9월 23일 ~ 10월 22일");
    expect(isCalendarRange(periodRange("2026-10", payday25))).toBe(false);
  });

  it("날짜가 속한 기간", () => {
    expect(periodOf("2026-09-22", payday25)).toBe("2026-09");
    expect(periodOf("2026-09-23", payday25)).toBe("2026-10");
    expect(periodOf("2026-10-22", payday25)).toBe("2026-10");
    expect(periodOf("2026-10-23", payday25)).toBe("2026-11");
  });

  it("당기지 않으면 딱 25일", () => {
    const noShift = { ...payday25, shift: false };
    expect(periodRange("2026-10", noShift)).toEqual({ start: "2026-09-25", end: "2026-10-24" });
  });

  it("시작하는 달 이름이면 9/25 기간이 9월", () => {
    const startLabel = { ...payday25, label: "start" as const, shift: false };
    expect(periodRange("2026-09", startLabel)).toEqual({ start: "2026-09-25", end: "2026-10-24" });
    expect(periodOf("2026-10-01", startLabel)).toBe("2026-09");
  });

  it("지난 기간 같은 날까지: 시작부터 지난 날수만큼", () => {
    // 10월 기간 9/23 시작, 오늘 9/29 → 6일째. 9월 기간 시작 = 8/25(화) → 8/31
    expect(samePeriodLastPeriod("2026-09-29", payday25)).toEqual({ start: "2026-08-25", end: "2026-08-31" });
  });
});

describe("달마다 시작일 직접 고치기", () => {
  const cfg = { ...payday25, overrides: { "2026-10": "2026-09-22" } };

  it("고친 날이 시작, 앞 기간은 그 전날까지", () => {
    expect(periodRange("2026-10", cfg).start).toBe("2026-09-22");
    expect(periodRange("2026-09", cfg).end).toBe("2026-09-21");
    expect(periodOf("2026-09-22", cfg)).toBe("2026-10");
  });

  it("앞 달 시작일보다 뒤, 다음 달 시작일보다 앞이어야 한다", () => {
    expect(overrideError("2026-10", "2026-09-20", payday25)).toBeNull();
    expect(overrideError("2026-10", "2026-08-25", payday25)).toBe("앞 달 시작일보다 뒤 날짜로 골라 주세요");
    expect(overrideError("2026-10", "2026-10-23", payday25)).toBe("다음 달 시작일보다 앞 날짜로 골라 주세요");
  });
});
