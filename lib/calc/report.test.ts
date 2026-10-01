import { describe, expect, it } from "vitest";
import type { CategoryStat } from "./stats";
import type { SpendBudgetRow } from "./budget";
import {
  balanceText,
  compareWithLastPeriod,
  madeOnText,
  netWorthChange,
  netWorthDiffText,
  overBudgetTexts,
  reportGoals,
  reportMonth,
  reportTitle,
  topExpenses,
  unpaidNames,
} from "./report";

describe("reportMonth", () => {
  it("주소에 달이 없으면 지난달", () => {
    expect(reportMonth(undefined, "2026-10")).toBe("2026-09");
  });
  it("1월이면 작년 12월", () => {
    expect(reportMonth(undefined, "2026-01")).toBe("2025-12");
  });
  it("지난 달과 이번 달은 그대로", () => {
    expect(reportMonth("2026-03", "2026-10")).toBe("2026-03");
    expect(reportMonth("2026-10", "2026-10")).toBe("2026-10");
  });
  it("이번 달보다 뒤거나 형식이 틀리면 지난달", () => {
    for (const bad of ["2026-11", "2099-01", "2026-13", "2026-00", "2026-9", "abc", ""]) {
      expect(reportMonth(bad, "2026-10")).toBe("2026-09");
    }
  });
});

describe("문구", () => {
  it("제목과 만든 날", () => {
    expect(reportTitle("2026-09")).toBe("감자밭 2026년 9월 결산");
    expect(madeOnText("2026-10-01")).toBe("10월 1일에 만들었어요");
  });
  it("남은 돈", () => {
    expect(balanceText({ income: 3_000_000, expense: 2_500_000 })).toBe("500,000원 남았어요");
    expect(balanceText({ income: 100_000, expense: 130_000 })).toBe("30,000원 더 썼어요");
    expect(balanceText({ income: 50_000, expense: 50_000 })).toBe("수입과 지출이 같아요");
  });
  it("지난달 전체와 비교", () => {
    expect(compareWithLastPeriod(900_000, 1_000_000)).toBe("지난달보다 100,000원 적게 썼어요");
    expect(compareWithLastPeriod(1_200_000, 1_000_000)).toBe("지난달보다 200,000원 많이 썼어요");
    expect(compareWithLastPeriod(1_000_000, 1_000_000)).toBe("지난달과 똑같이 썼어요");
  });
  it("순자산 변화", () => {
    expect(netWorthDiffText(500_000)).toBe("지난달보다 500,000원 늘었어요");
    expect(netWorthDiffText(-20_000)).toBe("지난달보다 20,000원 줄었어요");
    expect(netWorthDiffText(0)).toBe("지난달과 같아요");
  });
});

describe("topExpenses", () => {
  const row = (amount: number, occurredOn: string, type = "expense") => ({ type, amount, occurredOn });
  it("지출만, 금액 큰 순, 같으면 날짜 빠른 순, 5건까지", () => {
    const rows = [
      row(10_000, "2026-09-03"),
      row(9_000_000, "2026-09-25", "income"),
      row(50_000, "2026-09-20"),
      row(50_000, "2026-09-02"),
      row(30_000, "2026-09-01"),
      row(70_000, "2026-09-10"),
      row(20_000, "2026-09-11"),
      row(5_000, "2026-09-12"),
    ];
    expect(topExpenses(rows)).toEqual([
      row(70_000, "2026-09-10"),
      row(50_000, "2026-09-02"),
      row(50_000, "2026-09-20"),
      row(30_000, "2026-09-01"),
      row(20_000, "2026-09-11"),
    ]);
  });
  it("받은 배열을 바꾸지 않는다", () => {
    const rows = [row(1, "2026-09-01"), row(2, "2026-09-02")];
    topExpenses(rows);
    expect(rows[0].amount).toBe(1);
  });
});

describe("overBudgetTexts", () => {
  const stat = (categoryId: string, overBy: number): CategoryStat => ({
    categoryId,
    spent: 0,
    budget: 100_000,
    percent: 0,
    overBy,
    diff: 0,
  });
  const spend = (name: string, overBy: number): SpendBudgetRow => ({
    id: name,
    name,
    limit: 500_000,
    spent: 500_000 + overBy,
    percent: 0,
    remaining: -overBy,
    over: overBy > 0,
    overBy,
  });
  it("카테고리 예산 먼저, 그다음 통장·카드 예산. 안 넘은 것은 뺀다", () => {
    const names: Record<string, string> = { food: "식비", cafe: "카페·간식" };
    expect(
      overBudgetTexts([stat("food", 32_000), stat("cafe", 0)], [spend("생활비", 20_000), spend("용돈", 0)], (id) => names[id]),
    ).toEqual(["식비 예산을 32,000원 넘었어요", "생활비 예산을 20,000원 넘었어요"]);
  });
});

describe("reportGoals", () => {
  const range = { start: "2026-09-01", end: "2026-09-30" };
  const goal = (id: string, isDone: boolean, contributions: { amount: number; contributedOn: string }[]) => ({
    id,
    name: id,
    targetAmount: 1_000_000,
    isDone,
    contributions,
  });
  it("기간 끝까지 모은 금액으로 진행률, 그 기간 적립액", () => {
    const [g] = reportGoals(
      [
        goal("여행", false, [
          { amount: 100_000, contributedOn: "2026-08-10" },
          { amount: 50_000, contributedOn: "2026-09-15" },
          { amount: 70_000, contributedOn: "2026-10-02" },
        ]),
      ],
      range,
    );
    expect(g).toEqual({ id: "여행", name: "여행", targetAmount: 1_000_000, saved: 150_000, percent: 15, addedThisPeriod: 50_000 });
  });
  it("끝난 목표는 그 기간에 적립이 있을 때만, 끝나지 않은 목표는 적립이 없어도", () => {
    const ids = reportGoals(
      [
        goal("끝남-적립없음", true, [{ amount: 10_000, contributedOn: "2026-07-01" }]),
        goal("끝남-적립있음", true, [{ amount: 30_000, contributedOn: "2026-09-03" }]),
        goal("진행-적립없음", false, []),
      ],
      range,
    ).map((g) => g.id);
    expect(ids).toEqual(["끝남-적립있음", "진행-적립없음"]);
  });
  it("월급날 기준 기간(9/25~10/24)", () => {
    const [g] = reportGoals(
      [
        goal("집", false, [
          { amount: 10_000, contributedOn: "2026-09-24" },
          { amount: 20_000, contributedOn: "2026-09-25" },
          { amount: 40_000, contributedOn: "2026-10-24" },
          { amount: 80_000, contributedOn: "2026-10-25" },
        ]),
      ],
      { start: "2026-09-25", end: "2026-10-24" },
    );
    expect(g.saved).toBe(70_000);
    expect(g.addedThisPeriod).toBe(60_000);
  });
});

describe("netWorthChange", () => {
  const history = {
    assets: [
      { id: "통장", isLiability: false, deletedOn: null },
      { id: "대출", isLiability: true, deletedOn: null },
    ],
    values: [
      { assetId: "통장", asOf: "2026-08-20", amount: 1_000_000 },
      { assetId: "통장", asOf: "2026-09-20", amount: 1_500_000 },
      { assetId: "대출", asOf: "2026-08-01", amount: 300_000 },
      { assetId: "통장", asOf: "2026-10-05", amount: 9_000_000 },
    ],
  };
  it("끝난 달: 기간 마지막 날 기준, 지난 기간 마지막 날 대비", () => {
    expect(netWorthChange(history, { start: "2026-09-01", end: "2026-09-30" }, "2026-10-10")).toEqual({
      net: 1_200_000,
      diff: 500_000,
    });
  });
  it("진행 중인 달: 오늘 기준", () => {
    expect(netWorthChange(history, { start: "2026-08-25", end: "2026-09-24" }, "2026-09-10")).toEqual({
      net: 700_000,
      diff: 0,
    });
  });
  it("금액 기록이 없으면 null", () => {
    expect(netWorthChange({ assets: [], values: [] }, { start: "2026-09-01", end: "2026-09-30" }, "2026-10-01")).toBeNull();
  });
});

describe("unpaidNames", () => {
  it("안 낸 항목 이름만", () => {
    expect(
      unpaidNames([
        { item: { name: "월세" }, paidAmount: 700_000 },
        { item: { name: "관리비" }, paidAmount: null },
      ]),
    ).toEqual(["관리비"]);
  });
});
