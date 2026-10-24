import { describe, expect, it } from "vitest";
import { dailyTotals, groupByDay, sumTotals } from "./group";

const rows = [
  { id: "1", type: "expense", amount: 12000, occurredOn: "2026-09-26" },
  { id: "2", type: "expense", amount: 4500, occurredOn: "2026-09-27" },
  { id: "3", type: "income", amount: 3100000, occurredOn: "2026-09-25" },
  { id: "4", type: "expense", amount: 8000, occurredOn: "2026-09-26" },
] as const;

describe("sumTotals", () => {
  it("지출과 수입을 따로 더한다", () => {
    expect(sumTotals(rows)).toEqual({ expense: 24500, income: 3100000 });
    expect(sumTotals([])).toEqual({ expense: 0, income: 0 });
  });
});

describe("dailyTotals", () => {
  it("날짜별 합계", () => {
    expect(dailyTotals(rows)).toEqual({
      "2026-09-25": { expense: 0, income: 3100000 },
      "2026-09-26": { expense: 20000, income: 0 },
      "2026-09-27": { expense: 4500, income: 0 },
    });
  });
});

describe("groupByDay", () => {
  it("최근 날짜부터, 같은 날은 넘긴 순서대로", () => {
    const groups = groupByDay(rows);
    expect(groups.map((g) => g.date)).toEqual(["2026-09-27", "2026-09-26", "2026-09-25"]);
    expect(groups[1].items.map((r) => r.id)).toEqual(["1", "4"]);
    expect(groups[1].total).toEqual({ expense: 20000, income: 0 });
  });
});

describe("이체", () => {
  const rows = [
    { type: "expense", amount: 10_000, occurredOn: "2026-10-25" },
    { type: "income", amount: 50_000, occurredOn: "2026-10-25" },
    { type: "transfer", amount: 500_000, occurredOn: "2026-10-25" },
  ] as const;
  it("합계·날짜별 합계에는 들어가지 않는다", () => {
    expect(sumTotals(rows)).toEqual({ expense: 10_000, income: 50_000 });
    expect(dailyTotals(rows)["2026-10-25"]).toEqual({ expense: 10_000, income: 50_000 });
  });
  it("날짜별 목록에는 남고 그날 합계에서만 빠진다", () => {
    const [group] = groupByDay(rows);
    expect(group.items).toHaveLength(3);
    expect(group.total).toEqual({ expense: 10_000, income: 50_000 });
  });
});
