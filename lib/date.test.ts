import { describe, expect, it } from "vitest";
import {
  addDays,
  formatFullDate,
  currentMonthKST,
  formatDayHeader,
  formatMonthDayKST,
  formatMonthLabel,
  monthRange,
  samePeriodLastMonth,
  shiftMonth,
  todayKST,
} from "./date";

describe("todayKST", () => {
  it("UTC 저녁은 한국에서 다음 날이다", () => {
    // 2026-09-27 15:30 UTC = 2026-09-28 00:30 KST
    expect(todayKST(new Date("2026-09-27T15:30:00Z"))).toBe("2026-09-28");
  });

  it("UTC 오후 3시 전은 같은 날이다", () => {
    expect(todayKST(new Date("2026-09-27T14:59:59Z"))).toBe("2026-09-27");
  });
});

describe("currentMonthKST", () => {
  it("월말 밤은 한국에서 다음 달이다", () => {
    // 2026-09-30 16:00 UTC = 2026-10-01 01:00 KST
    expect(currentMonthKST(new Date("2026-09-30T16:00:00Z"))).toBe("2026-10");
  });
});

describe("formatDayHeader / formatMonthLabel", () => {
  it("요일을 붙인다", () => {
    expect(formatDayHeader("2026-09-27")).toBe("9월 27일 일요일");
    expect(formatDayHeader("2026-09-01")).toBe("9월 1일 화요일");
  });

  it("올해가 아니면 연도를 붙인다", () => {
    expect(formatDayHeader("2025-12-31", 2026)).toBe("2025년 12월 31일 수요일");
    expect(formatDayHeader("2026-09-27", 2026)).toBe("9월 27일 일요일");
  });

  it("날짜 선택 버튼 표기", () => {
    expect(formatFullDate("2026-09-27")).toBe("2026년 9월 27일 (일)");
  });

  it("n일 앞뒤로 (달·해를 넘어)", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-09-27", 7)).toBe("2026-10-04");
  });

  it("연월", () => {
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
  });
});

describe("formatMonthDayKST", () => {
  it("한국 시간 날짜로 쓴다", () => {
    // 2026-10-03 16:00 UTC = 2026-10-04 01:00 KST
    expect(formatMonthDayKST("2026-10-03T16:00:00Z")).toBe("10월 4일");
  });
});

describe("monthRange", () => {
  it("1일부터 말일까지", () => {
    expect(monthRange("2026-09")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("윤년 2월", () => {
    expect(monthRange("2028-02").end).toBe("2028-02-29");
    expect(monthRange("2026-02").end).toBe("2026-02-28");
  });
});

describe("shiftMonth", () => {
  it("해를 넘어 이동한다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-09", -12)).toBe("2025-09");
  });
});

describe("samePeriodLastMonth", () => {
  it("지난달 1일부터 같은 날짜까지", () => {
    expect(samePeriodLastMonth("2026-09-27")).toEqual({
      start: "2026-08-01",
      end: "2026-08-27",
    });
  });

  it("지난달에 그 날짜가 없으면 말일까지", () => {
    expect(samePeriodLastMonth("2026-03-31")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("1월이면 작년 12월", () => {
    expect(samePeriodLastMonth("2027-01-15")).toEqual({
      start: "2026-12-01",
      end: "2026-12-15",
    });
  });
});
