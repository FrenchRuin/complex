import { describe, expect, it } from "vitest";
import {
  compareWithLastMonth,
  matchesPerson,
  relativeDayLabel,
  splitByOwner,
  splitPercents,
} from "./dashboard";

describe("matchesPerson", () => {
  const joint = { scope: "joint", memberSlot: "a" } as const;
  const aPersonal = { scope: "personal", memberSlot: "a" } as const;

  it("공동 필터는 공동 전체 (A가 결제한 공동도 포함)", () => {
    expect(matchesPerson(joint, "joint")).toBe(true);
    expect(matchesPerson(aPersonal, "joint")).toBe(false);
  });

  it("A 필터는 A의 개인만 (A가 결제한 공동은 제외)", () => {
    expect(matchesPerson(aPersonal, "a")).toBe(true);
    expect(matchesPerson(joint, "a")).toBe(false);
    expect(matchesPerson(aPersonal, "b")).toBe(false);
  });

  it("전체는 모두", () => {
    expect(matchesPerson(joint, "all")).toBe(true);
  });
});

describe("splitByOwner", () => {
  it("지출만 공동/A/B로 나눈다", () => {
    expect(
      splitByOwner([
        { type: "expense", amount: 10000, scope: "joint", memberSlot: "b" },
        { type: "expense", amount: 3000, scope: "personal", memberSlot: "a" },
        { type: "expense", amount: 2000, scope: "personal", memberSlot: "b" },
        { type: "income", amount: 99999, scope: "personal", memberSlot: "a" },
      ]),
    ).toEqual({ joint: 10000, a: 3000, b: 2000 });
  });
});

describe("splitPercents", () => {
  it("합이 100이 되도록 가장 큰 값에서 보정한다", () => {
    // 33.33 / 33.33 / 33.33 → 33+33+33 = 99 → 가장 큰 값(첫 번째)에 +1
    expect(splitPercents({ joint: 1, a: 1, b: 1 })).toEqual({ joint: 34, a: 33, b: 33 });
    // 66.67 / 16.67 / 16.67 → 67+17+17 = 101 → 가장 큰 값에서 -1
    expect(splitPercents({ joint: 4, a: 1, b: 1 })).toEqual({ joint: 66, a: 17, b: 17 });
  });

  it("정확히 나눠지면 그대로", () => {
    expect(splitPercents({ joint: 50, a: 30, b: 20 })).toEqual({ joint: 50, a: 30, b: 20 });
  });

  it("모두 0이면 0", () => {
    expect(splitPercents({ joint: 0, a: 0, b: 0 })).toEqual({ joint: 0, a: 0, b: 0 });
  });

  it("항상 합이 100", () => {
    for (const s of [
      { joint: 7, a: 13, b: 29 },
      { joint: 123457, a: 98765, b: 1 },
      { joint: 0, a: 5, b: 0 },
    ]) {
      const p = splitPercents(s);
      expect(p.joint + p.a + p.b).toBe(100);
    }
  });
});

describe("compareWithLastMonth", () => {
  it("적게, 많이, 같게", () => {
    expect(compareWithLastMonth(80000, 100000)).toBe("지난달 같은 기간보다 20,000원 적게 썼어요");
    expect(compareWithLastMonth(150000, 100000)).toBe("지난달 같은 기간보다 50,000원 많이 썼어요");
    expect(compareWithLastMonth(100, 100)).toBe("지난달 같은 기간과 똑같이 썼어요");
  });
});

describe("relativeDayLabel", () => {
  it("오늘, 어제, N일 전, 날짜", () => {
    expect(relativeDayLabel("2026-09-27", "2026-09-27")).toBe("오늘");
    expect(relativeDayLabel("2026-09-26", "2026-09-27")).toBe("어제");
    expect(relativeDayLabel("2026-09-24", "2026-09-27")).toBe("3일 전");
    expect(relativeDayLabel("2026-09-02", "2026-09-27")).toBe("9월 2일");
  });

  it("달을 넘어서도 정확히 센다", () => {
    expect(relativeDayLabel("2026-09-30", "2026-10-01")).toBe("어제");
  });
});
