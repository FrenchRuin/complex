import { describe, expect, it } from "vitest";
import {
  dueDate,
  dueDateInRange,
  dueUnpaidCount,
  isActiveInMonth,
  recurringStatus,
  statusLabel,
  summarize,
  summaryText,
  withPaidAmount,
} from "./recurring";

describe("dueDate", () => {
  it("그 달의 결제일", () => {
    expect(dueDate("2026-09", 25)).toBe("2026-09-25");
    expect(dueDate("2026-09", 1)).toBe("2026-09-01");
  });

  it("그 달에 없는 날은 말일", () => {
    expect(dueDate("2026-09", 31)).toBe("2026-09-30");
    expect(dueDate("2026-02", 30)).toBe("2026-02-28");
    expect(dueDate("2028-02", 31)).toBe("2028-02-29");
  });
});

describe("isActiveInMonth", () => {
  const item = { startMonth: "2026-08-01", endMonth: null };

  it("시작 달부터 보인다", () => {
    expect(isActiveInMonth(item, "2026-07")).toBe(false);
    expect(isActiveInMonth(item, "2026-08")).toBe(true);
    expect(isActiveInMonth(item, "2027-01")).toBe(true);
  });

  it("중지한 달까지만 보이고 다음 달부터 안 보인다", () => {
    const stopped = { ...item, endMonth: "2026-09-01" };
    expect(isActiveInMonth(stopped, "2026-09")).toBe(true);
    expect(isActiveInMonth(stopped, "2026-10")).toBe(false);
  });
});

describe("recurringStatus / statusLabel", () => {
  it("납부했으면 날짜와 상관없이 완료", () => {
    expect(statusLabel(recurringStatus("2026-09-10", "2026-09-27", true))).toBe("납부 완료");
  });

  it("오늘, ○일 후, ○일 지남", () => {
    expect(statusLabel(recurringStatus("2026-09-27", "2026-09-27", false))).toBe("오늘");
    expect(statusLabel(recurringStatus("2026-09-30", "2026-09-27", false))).toBe("3일 후");
    expect(statusLabel(recurringStatus("2026-09-25", "2026-09-27", false))).toBe("2일 지남");
  });

  it("달이 바뀌어도 날짜 차이를 정확히 센다", () => {
    expect(recurringStatus("2026-10-01", "2026-09-30", false)).toEqual({ kind: "upcoming", days: 1 });
  });
});

describe("withPaidAmount", () => {
  const row = { due: "2026-09-25", status: { kind: "overdue", days: 2 } as const, paidAmount: null };

  it("체크하면 납부 완료", () => {
    expect(withPaidAmount(row, 180000, "2026-09-27")).toEqual({
      due: "2026-09-25",
      status: { kind: "paid" },
      paidAmount: 180000,
    });
  });

  it("해제하면 상태를 다시 계산한다", () => {
    const paid = withPaidAmount(row, 180000, "2026-09-27");
    expect(withPaidAmount(paid, null, "2026-09-27").status).toEqual({ kind: "overdue", days: 2 });
  });
});

describe("dueUnpaidCount", () => {
  it("오늘이거나 지난 미납만 센다", () => {
    expect(
      dueUnpaidCount([
        { kind: "paid" },
        { kind: "today" },
        { kind: "overdue", days: 2 },
        { kind: "upcoming", days: 3 },
      ]),
    ).toBe(2);
  });
});

describe("summarize / summaryText", () => {
  it("낸 금액은 실제 금액, 남은 금액은 예상 금액", () => {
    const s = summarize([
      { paidAmount: 55000, expectedAmount: 55000 },
      { paidAmount: 102500, expectedAmount: 100000 },
      { paidAmount: null, expectedAmount: 150000 },
      { paidAmount: null, expectedAmount: 30000 },
    ]);
    expect(s).toEqual({ paidCount: 2, total: 4, paidSum: 157500, remainingSum: 180000 });
    expect(summaryText(s)).toBe("2/4 납부 · 157,500원 냈고 180,000원 남았어요");
  });

  it("모두 냈을 때, 없을 때", () => {
    expect(summaryText(summarize([{ paidAmount: 10000, expectedAmount: 10000 }]))).toBe(
      "1/1 납부 · 10,000원 모두 냈어요",
    );
    expect(summaryText(summarize([]))).toBe("이번 달 정기지출이 없어요");
  });
});

describe("dueDateInRange (한 달 기준 F-56)", () => {
  const range = { start: "2026-09-25", end: "2026-10-24" };

  it("기간 안의 그날: 1일 → 10/1, 28일 → 9/28, 25일 → 9/25", () => {
    expect(dueDateInRange(range, 1)).toBe("2026-10-01");
    expect(dueDateInRange(range, 28)).toBe("2026-09-28");
    expect(dueDateInRange(range, 25)).toBe("2026-09-25");
    expect(dueDateInRange(range, 24)).toBe("2026-10-24");
  });

  it("31일은 그 달 말일, 달력의 한 달이면 dueDate와 같다", () => {
    expect(dueDateInRange(range, 31)).toBe("2026-09-30");
    expect(dueDateInRange({ start: "2026-02-01", end: "2026-02-28" }, 31)).toBe(dueDate("2026-02", 31));
  });
});
