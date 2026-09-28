import { describe, expect, it } from "vitest";
import {
  dateRangeLabel,
  occurrencesBetween,
  occurrencesByDay,
  recurringDuesInMonth,
  repeatLabel,
  timeLabel,
  upcomingOccurrences,
  type CalendarEvent,
} from "./events";

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e",
  title: "일정",
  memo: "",
  owner: "joint",
  startDate: "2026-09-10",
  endDate: "2026-09-10",
  allDay: true,
  startTime: null,
  endTime: null,
  repeat: "none",
  repeatUntil: null,
  createdBy: "m",
  updatedBy: "m",
  updatedAt: "2026-09-01T00:00:00Z",
  ...over,
});

const SEPT = { start: "2026-09-01", end: "2026-09-30" };
const starts = (events: CalendarEvent[], range = SEPT) => occurrencesBetween(events, range).map((o) => o.start);

describe("occurrencesBetween", () => {
  it("반복 없음: 기간 안이면 한 번", () => {
    expect(starts([ev({})])).toEqual(["2026-09-10"]);
    expect(starts([ev({ startDate: "2026-10-01", endDate: "2026-10-01" })])).toEqual([]);
  });

  it("여러 날 일정은 기간 앞에서 시작해도 걸치면 포함", () => {
    expect(starts([ev({ startDate: "2026-08-30", endDate: "2026-09-02" })])).toEqual(["2026-08-30"]);
  });

  it("매주: 기간 안의 같은 요일마다", () => {
    expect(starts([ev({ startDate: "2025-01-06", endDate: "2025-01-06", repeat: "weekly" })])).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
  });

  it("매달 31일은 없는 달엔 말일", () => {
    const e = ev({ startDate: "2026-01-31", endDate: "2026-01-31", repeat: "monthly" });
    expect(starts([e], { start: "2026-02-01", end: "2026-04-30" })).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("매년: 2월 29일은 평년엔 28일", () => {
    const e = ev({ startDate: "2024-02-29", endDate: "2024-02-29", repeat: "yearly" });
    expect(starts([e], { start: "2025-01-01", end: "2028-12-31" })).toEqual(["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });

  it("반복 끝 날짜 뒤로는 없음, 시작 전도 없음", () => {
    const e = ev({ startDate: "2026-09-15", endDate: "2026-09-15", repeat: "weekly", repeatUntil: "2026-09-22" });
    expect(starts([e])).toEqual(["2026-09-15", "2026-09-22"]);
  });

  it("같은 날은 하루 종일 먼저, 그다음 시각 순", () => {
    const list = occurrencesBetween(
      [
        ev({ id: "b", title: "저녁", allDay: false, startTime: "19:00" }),
        ev({ id: "a", title: "점심", allDay: false, startTime: "12:00" }),
        ev({ id: "c", title: "휴가" }),
      ],
      SEPT,
    );
    expect(list.map((o) => o.event.title)).toEqual(["휴가", "점심", "저녁"]);
  });
});

describe("occurrencesByDay", () => {
  it("여러 날 일정은 걸친 날마다, 기간 밖은 자른다", () => {
    const occ = occurrencesBetween([ev({ startDate: "2026-09-29", endDate: "2026-10-02" })], SEPT);
    expect([...occurrencesByDay(occ, SEPT).keys()]).toEqual(["2026-09-29", "2026-09-30"]);
  });
});

describe("upcomingOccurrences", () => {
  it("오늘부터 가까운 순으로 최대 개수", () => {
    const events = [
      ev({ id: "w", title: "운동", startDate: "2026-09-01", endDate: "2026-09-01", repeat: "weekly" }),
      ev({ id: "b", title: "생일", startDate: "2020-09-30", endDate: "2020-09-30", repeat: "yearly" }),
    ];
    expect(upcomingOccurrences(events, "2026-09-28", 3).map((o) => `${o.event.title} ${o.start}`)).toEqual([
      "운동 2026-09-29",
      "생일 2026-09-30",
      "운동 2026-10-06",
    ]);
  });
});

describe("표시 글자", () => {
  it("시각", () => {
    expect(timeLabel({ allDay: true, startTime: null, endTime: null })).toBe("하루 종일");
    expect(timeLabel({ allDay: false, startTime: "14:00", endTime: null })).toBe("14:00");
    expect(timeLabel({ allDay: false, startTime: "14:00", endTime: "16:30" })).toBe("14:00~16:30");
  });

  it("날짜", () => {
    expect(dateRangeLabel("2026-09-28", "2026-09-28")).toBe("9월 28일 (월)");
    expect(dateRangeLabel("2026-09-28", "2026-09-30")).toBe("9월 28일 (월) ~ 9월 30일 (수)");
  });

  it("반복", () => {
    expect(repeatLabel({ repeat: "weekly", startDate: "2026-09-28", repeatUntil: null })).toBe("매주 월요일");
    expect(repeatLabel({ repeat: "monthly", startDate: "2026-09-28", repeatUntil: null })).toBe("매달 28일");
    expect(repeatLabel({ repeat: "yearly", startDate: "2026-09-28", repeatUntil: "2030-12-31" })).toBe(
      "매년 9월 28일, 2030년 12월 31일까지",
    );
    expect(repeatLabel({ repeat: "none", startDate: "2026-09-28", repeatUntil: null })).toBeNull();
  });
});

describe("recurringDuesInMonth", () => {
  it("그 달에 보이는 정기지출만, 없는 날은 말일", () => {
    const items = [
      { id: "1", name: "월세", amount: 700000, dayOfMonth: 31, startMonth: "2026-01-01", endMonth: null },
      { id: "2", name: "끝남", amount: 1000, dayOfMonth: 5, startMonth: "2026-01-01", endMonth: "2026-08-01" },
    ];
    expect(recurringDuesInMonth(items, "2026-09")).toEqual([{ itemId: "1", date: "2026-09-30", name: "월세", amount: 700000 }]);
  });
});
