import { describe, expect, it } from "vitest";
import { buildExportSheets, EXPORT_SHEET_NAMES, exportFileName, type ExportData, type ExportSheet } from "./export-sheets";

const base: ExportData = {
  today: "2026-10-01",
  names: { a: "지훈", b: null },
  categories: {
    food: { name: "식비", sortOrder: 2 },
    house: { name: "주거·관리비", sortOrder: 1 },
  },
  paymentMethods: { card: "공동카드", acc: "생활비통장" },
  transactions: [],
  recurring: [],
  budgets: [],
  spendBudgets: [],
  assets: [],
  assetValues: [],
  goals: [],
  contributions: [],
  loanProfile: null,
  loanDebts: [],
  loanScenarios: [],
};

function sheet(d: Partial<ExportData>, name: string): ExportSheet {
  const found = buildExportSheets({ ...base, ...d }).find((s) => s.name === name);
  if (!found) throw new Error(`시트 없음: ${name}`);
  return found;
}
const t = (value: string) => ({ kind: "text" as const, value });
const m = (value: number) => ({ kind: "money" as const, value });
const n = (value: number) => ({ kind: "number" as const, value });
const dt = (value: string) => ({ kind: "date" as const, value });

type Tx = ExportData["transactions"][number];
type Recurring = ExportData["recurring"][number];

describe("exportFileName", () => {
  it("오늘 날짜를 붙인다", () => {
    expect(exportFileName("2026-10-01")).toBe("감자밭-백업-2026-10-01.xlsx");
  });
});

describe("buildExportSheets", () => {
  it("시트 11장을 정한 순서로, 데이터가 없으면 제목 줄만", () => {
    const sheets = buildExportSheets(base);
    expect(sheets.map((s) => s.name)).toEqual([...EXPORT_SHEET_NAMES]);
    for (const s of sheets) {
      expect(s.rows).toEqual([]);
      expect(s.columns.length).toBeGreaterThan(0);
    }
    expect(sheets[0].columns.map((c) => c.title)).toEqual([
      "날짜", "시간", "유형", "카테고리", "가맹점·내용", "메모", "금액", "결제수단", "구분", "사람",
    ]);
  });

  it("내역: 날짜 오래된 순(같은 날은 기록 순), 글자·금액 변환, 없는 값은 빈칸", () => {
    const tx = (over: Partial<Tx>): Tx => ({
      occurredOn: "2026-09-02",
      occurredTime: null,
      type: "expense",
      categoryId: "food",
      merchant: null,
      memo: null,
      amount: 1000,
      paymentMethodId: null,
      scope: "joint",
      memberSlot: "a",
      createdAt: "2026-09-02T01:00:00Z",
      ...over,
    });
    const s = sheet(
      {
        transactions: [
          tx({ occurredOn: "2026-09-05", merchant: "늦은 날" }),
          tx({ createdAt: "2026-09-02T09:00:00Z", merchant: "같은 날 나중" }),
          tx({ occurredTime: "12:34:00", merchant: "이마트", memo: "장보기", amount: 54000, paymentMethodId: "card", scope: "personal", memberSlot: "b" }),
        ],
      },
      "내역",
    );
    expect(s.rows.map((r) => r[4])).toEqual([t("이마트"), t("같은 날 나중"), t("늦은 날")]);
    expect(s.rows[0]).toEqual([dt("2026-09-02"), t("12:34"), t("지출"), t("식비"), t("이마트"), t("장보기"), m(54000), t("공동카드"), t("개인"), t("B")]);
    expect(s.rows[1][1]).toBeNull();
    expect(s.rows[1][7]).toBeNull();
    expect(s.rows[1][8]).toEqual(t("공동"));
    expect(s.rows[1][9]).toEqual(t("지훈"));
  });

  it("정기지출: 결제일 순, 달은 글자, 예/아니요, 중지 안 했으면 빈칸", () => {
    const item = (over: Partial<Recurring>): Recurring => ({
      name: "월세",
      amount: 700000,
      dayOfMonth: 25,
      categoryId: "house",
      scope: "joint",
      memberSlot: "a",
      paymentMethodId: "acc",
      isVariable: false,
      hasVariableDate: false,
      startMonth: "2026-09-01",
      endMonth: null,
      ...over,
    });
    const s = sheet({ recurring: [item({}), item({ name: "관리비", dayOfMonth: 5, isVariable: true, endMonth: "2026-12-01" })] }, "정기지출");
    expect(s.rows.map((r) => r[0])).toEqual([t("관리비"), t("월세")]);
    expect(s.rows[0]).toEqual([t("관리비"), m(700000), n(5), t("주거·관리비"), t("공동"), t("지훈"), t("생활비통장"), t("예"), t("아니요"), t("2026-09"), t("2026-12")]);
    expect(s.rows[1][10]).toBeNull();
  });

  it("카테고리 예산: 달 오래된 순, 같은 달은 카테고리 순서", () => {
    const s = sheet(
      {
        budgets: [
          { month: "2026-10-01", categoryId: "house", amount: 1 },
          { month: "2026-09-01", categoryId: "food", amount: 2 },
          { month: "2026-09-01", categoryId: "house", amount: 3 },
        ],
      },
      "카테고리 예산",
    );
    expect(s.rows).toEqual([
      [t("2026-09"), t("주거·관리비"), m(3)],
      [t("2026-09"), t("식비"), m(2)],
      [t("2026-10"), t("주거·관리비"), m(1)],
    ]);
  });

  it("통장·카드 예산: 예산 순서, 묶인 계좌·카드 이름을 쉼표로 (모르는 카드는 뺀다)", () => {
    const s = sheet(
      {
        spendBudgets: [
          { month: "2026-09-01", name: "용돈", sortOrder: 2, amount: 400000, methodIds: ["card"] },
          { month: "2026-09-01", name: "생활비", sortOrder: 1, amount: 900000, methodIds: ["acc", "card", "없는카드"] },
        ],
      },
      "통장·카드 예산",
    );
    expect(s.rows).toEqual([
      [t("2026-09"), t("생활비"), m(900000), t("생활비통장, 공동카드")],
      [t("2026-09"), t("용돈"), m(400000), t("공동카드")],
    ]);
  });

  it("자산: 자산 먼저 금액 큰 순, 금액 기록은 같은 항목 순서로 기준일 오래된 순 (지운 항목 기록은 뺀다)", () => {
    const asset = (id: string, amount: number, isLiability = false) => ({
      id,
      name: id,
      kind: "deposit" as const,
      owner: "joint" as const,
      amount,
      valueAsOf: "2026-09-27",
      isLiability,
      memo: null,
    });
    const d: Partial<ExportData> = {
      assets: [asset("대출", 9_000_000, true), asset("통장", 1_000_000), asset("적금", 3_000_000)],
      assetValues: [
        { assetId: "통장", asOf: "2026-09-27", amount: 1_000_000 },
        { assetId: "통장", asOf: "2026-08-01", amount: 500_000 },
        { assetId: "적금", asOf: "2026-09-01", amount: 3_000_000 },
        { assetId: "지운 항목", asOf: "2026-09-01", amount: 1 },
      ],
    };
    expect(sheet(d, "자산").rows.map((r) => r[0])).toEqual([t("적금"), t("통장"), t("대출")]);
    expect(sheet(d, "자산").rows[2]).toEqual([t("대출"), t("예금"), t("공동"), t("부채"), m(9_000_000), dt("2026-09-27"), null]);
    expect(sheet(d, "자산 금액 기록").rows).toEqual([
      [t("적금"), dt("2026-09-01"), m(3_000_000)],
      [t("통장"), dt("2026-08-01"), m(500_000)],
      [t("통장"), dt("2026-09-27"), m(1_000_000)],
    ]);
  });

  it("저축 목표: 만든 순, 모은 금액·진행률·끝남. 적립은 날짜 순으로 목표 이름·사람 (지운 목표 적립은 뺀다)", () => {
    const d: Partial<ExportData> = {
      goals: [
        { id: "g2", name: "차", targetAmount: 1_000_000, dueDate: null, isDone: true, createdAt: "2026-09-20T00:00:00Z" },
        { id: "g1", name: "여행", targetAmount: 2_000_000, dueDate: "2027-03-01", isDone: false, createdAt: "2026-09-10T00:00:00Z" },
      ],
      contributions: [
        { goalId: "g1", amount: 300_000, contributedOn: "2026-09-15", memberSlot: "b", memo: "보너스" },
        { goalId: "g1", amount: 200_000, contributedOn: "2026-09-11", memberSlot: "a", memo: null },
        { goalId: "지운 목표", amount: 1, contributedOn: "2026-09-01", memberSlot: "a", memo: null },
      ],
    };
    expect(sheet(d, "저축 목표").rows).toEqual([
      [t("여행"), m(2_000_000), dt("2027-03-01"), m(500_000), n(25), t("아니요")],
      [t("차"), m(1_000_000), null, m(0), n(0), t("예")],
    ]);
    expect(sheet(d, "목표 적립").rows).toEqual([
      [t("여행"), dt("2026-09-11"), m(200_000), t("지훈"), null],
      [t("여행"), dt("2026-09-15"), m(300_000), t("B"), t("보너스")],
    ]);
  });

  it("대출: 우리 정보는 항목·값 줄, 금리는 % 숫자(425 → 4.25), 없는 값은 빈칸", () => {
    const d: Partial<ExportData> = {
      loanProfile: { incomeA: 50_000_000, incomeB: 40_000_000, homeStatus: "none", firstTime: true },
      loanDebts: [
        { name: "신용대출", kind: "credit", owner: "a", balance: 10_000_000, rateBp: 425, monthsLeft: null, monthlyPayment: null, createdAt: "2026-09-30T00:00:00Z" },
      ],
      loanScenarios: [
        { name: "○○아파트", deal: "jeonse", price: 300_000_000, region: "metro", rateBp: null, termYears: 2, extraCosts: 0, memo: null, createdAt: "2026-09-30T00:00:00Z" },
      ],
    };
    expect(sheet(d, "대출 우리 정보").rows).toEqual([
      [t("지훈 연소득"), m(50_000_000)],
      [t("B 연소득"), m(40_000_000)],
      [t("주택 보유"), t("무주택")],
      [t("생애최초"), t("예")],
    ]);
    expect(sheet(d, "기존 대출").rows).toEqual([[t("신용대출"), t("신용대출"), t("지훈"), m(10_000_000), n(4.25), null, null]]);
    expect(sheet(d, "집 후보").rows).toEqual([[t("○○아파트"), t("전세"), m(300_000_000), t("수도권 비규제"), null, n(2), m(0), null]]);
  });
});
