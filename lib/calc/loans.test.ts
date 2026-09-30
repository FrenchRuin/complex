import { describe, expect, it } from "vitest";
import { DEFAULT_RULES as R } from "./loan-rules";
import {
  bestProductIndex,
  debtAnnualRepayment,
  evaluateScenario,
  existingAnnualInterest,
  floorToManwon,
  formatRateBp,
  maxPrincipal,
  monthlyPayment,
  needsDebtInfo,
  parseRateBp,
  type LoanDebt,
  type LoanProfile,
  type LoanScenarioInput,
} from "./loans";

const profile = (o: Partial<LoanProfile> = {}): LoanProfile => ({
  incomeA: 0,
  incomeB: 0,
  homeStatus: "none",
  firstTime: false,
  netWorth: 0,
  ...o,
});
const buy = (o: Partial<LoanScenarioInput> = {}): LoanScenarioInput => ({
  deal: "buy",
  price: 0,
  region: "local",
  rateBp: 400,
  termYears: 30,
  extraCosts: 0,
  ...o,
});
const jeonse = (o: Partial<LoanScenarioInput> = {}): LoanScenarioInput => ({
  deal: "jeonse",
  price: 0,
  region: "metro",
  rateBp: 380,
  termYears: null,
  extraCosts: 0,
  ...o,
});
const debt = (o: Partial<LoanDebt> & Pick<LoanDebt, "kind">): LoanDebt => ({
  balance: 0,
  rateBp: 0,
  monthsLeft: null,
  monthlyPayment: null,
  ...o,
});

describe("금리 입력·표시", () => {
  it("parseRateBp: % 글자 → 0.01% 단위 정수", () => {
    expect(parseRateBp("4.25")).toBe(425);
    expect(parseRateBp("4")).toBe(400);
    expect(parseRateBp(" 3.5 ")).toBe(350);
    expect(parseRateBp("3.5%")).toBe(350);
    expect(parseRateBp("4.255")).toBe(426);
    expect(parseRateBp("4,5")).toBe(450);
    expect(parseRateBp("")).toBeNull();
    expect(parseRateBp("abc")).toBeNull();
    expect(parseRateBp("1.2.3")).toBeNull();
  });
  it("formatRateBp: 끝의 0은 뺀다", () => {
    expect(formatRateBp(425)).toBe("4.25%");
    expect(formatRateBp(400)).toBe("4%");
    expect(formatRateBp(350)).toBe("3.5%");
  });
});

describe("원리금 계산", () => {
  it("floorToManwon", () => {
    expect(floorToManwon(250_519_999.9)).toBe(250_510_000);
  });
  it("원리금균등 한 달 상환액, 금리 0이면 원금 ÷ 개월", () => {
    expect(monthlyPayment(100_000_000, 600, 360)).toBeCloseTo(599_550.525, 2);
    expect(monthlyPayment(120_000_000, 0, 120)).toBe(1_000_000);
  });
  it("maxPrincipal은 monthlyPayment의 역산", () => {
    expect(maxPrincipal(monthlyPayment(100_000_000, 600, 360) * 12, 600, 360)).toBeCloseTo(100_000_000, 0);
    expect(maxPrincipal(0, 600, 360)).toBe(0);
  });
});

describe("기존 대출 1년 상환액 (DSR)", () => {
  it("신용대출: 잔액 ÷ 5 + 이자", () => {
    expect(debtAnnualRepayment(debt({ kind: "credit", balance: 50_000_000, rateBp: 500 }), "none", R)).toBe(12_500_000);
  });
  it("마이너스통장: 한도 전체를 신용대출처럼", () => {
    expect(debtAnnualRepayment(debt({ kind: "overdraft", balance: 30_000_000, rateBp: 600 }), "none", R)).toBe(7_800_000);
  });
  it("전세대출: 무주택은 빼고 1주택은 이자만", () => {
    const d = debt({ kind: "jeonse", balance: 200_000_000, rateBp: 400 });
    expect(debtAnnualRepayment(d, "none", R)).toBe(0);
    expect(debtAnnualRepayment(d, "one", R)).toBe(8_000_000);
  });
  it("주담대 등: 매달 내는 금액이 먼저, 없으면 남은 기간으로 원리금균등", () => {
    expect(
      debtAnnualRepayment(debt({ kind: "mortgage", balance: 100_000_000, rateBp: 400, monthsLeft: 120, monthlyPayment: 1_000_000 }), "none", R),
    ).toBe(12_000_000);
    expect(debtAnnualRepayment(debt({ kind: "car", balance: 12_000_000, monthsLeft: 120 }), "none", R)).toBe(1_200_000);
  });
  it("자산에서 불러와 기간·매달 금액이 비면 0 (정보를 채워 주세요)", () => {
    const d = debt({ kind: "other", balance: 12_000_000 });
    expect(debtAnnualRepayment(d, "none", R)).toBe(0);
    expect(needsDebtInfo(d)).toBe(true);
    expect(needsDebtInfo(debt({ kind: "credit", balance: 1 }))).toBe(false);
  });
  it("DTI용 이자: 무주택이면 전세대출 이자 제외", () => {
    const debts = [debt({ kind: "credit", balance: 20_000_000, rateBp: 500 }), debt({ kind: "jeonse", balance: 100_000_000, rateBp: 400 })];
    expect(existingAnnualInterest(debts, "none")).toBe(1_000_000);
    expect(existingAnnualInterest(debts, "one")).toBe(5_000_000);
  });
});

describe("매매: 은행 주담대", () => {
  it("LTV가 막는 경우 (지방 70%)", () => {
    const [bank] = evaluateScenario(profile({ incomeA: 100_000_000 }), [], buy({ price: 300_000_000, extraCosts: 10_000_000 }), R);
    expect(bank).toMatchObject({
      eligible: true,
      amount: 210_000_000,
      limitedBy: "LTV 70%에서 막혀요",
      monthly: 1_002_572,
      cashNeeded: 100_000_000,
      dsrAfter: 12,
    });
  });
  it("금액 상한이 막는 경우 (규제지역 15억 초과 → 4억)", () => {
    const [bank] = evaluateScenario(profile({ incomeA: 300_000_000 }), [], buy({ price: 1_600_000_000, region: "regulated" }), R);
    expect(bank).toMatchObject({ amount: 400_000_000, limitedBy: "금액 상한 4억 원에서 막혀요" });
  });
  it("금액 상한 경계: 15억·25억", () => {
    const amount = (price: number) =>
      evaluateScenario(profile({ incomeA: 500_000_000 }), [], buy({ price, region: "regulated" }), R)[0].amount;
    expect(amount(1_500_000_000)).toBe(600_000_000);
    expect(amount(1_500_000_001)).toBe(400_000_000);
    expect(amount(2_500_000_000)).toBe(400_000_000);
    expect(amount(2_500_000_001)).toBe(200_000_000);
  });
  it("LTV와 상한이 같으면 LTV를 이유로", () => {
    const [bank] = evaluateScenario(profile({ incomeA: 500_000_000 }), [], buy({ price: 1_500_000_000, region: "regulated" }), R);
    expect(bank.limitedBy).toBe("LTV 40%에서 막혀요");
  });
  it("DSR이 막는 경우, 스트레스 금리는 수도권 3%p·지방 0.75%p", () => {
    const metro = evaluateScenario(profile({ incomeA: 50_000_000 }), [], buy({ price: 500_000_000, region: "metro" }), R)[0];
    const local = evaluateScenario(profile({ incomeA: 50_000_000 }), [], buy({ price: 500_000_000, region: "local" }), R)[0];
    expect(metro).toMatchObject({ amount: 250_510_000, limitedBy: "DSR 40%에서 막혀요", monthly: 1_195_973, dsrAfter: 28.7 });
    expect(local).toMatchObject({ amount: 319_500_000, limitedBy: "DSR 40%에서 막혀요" });
  });
  it("기존 대출로 DSR이 이미 넘으면 불가", () => {
    const debts = [debt({ kind: "credit", balance: 200_000_000, rateBp: 500 })];
    const [bank] = evaluateScenario(profile({ incomeA: 50_000_000 }), debts, buy({ price: 500_000_000 }), R);
    expect(bank).toMatchObject({ eligible: false, reason: "기존 대출로 DSR이 이미 넘어요", amount: 0, cashNeeded: 500_000_000 });
  });
  it("생애최초 LTV (규제지역도 70%)", () => {
    const [bank] = evaluateScenario(
      profile({ incomeA: 300_000_000, firstTime: true }),
      [],
      buy({ price: 800_000_000, region: "regulated" }),
      R,
    );
    expect(bank).toMatchObject({ amount: 560_000_000, limitedBy: "LTV 70%에서 막혀요" });
  });
  it("두 사람 소득을 합하고, 금리·만기를 비우면 기본값", () => {
    const [bank] = evaluateScenario(
      profile({ incomeA: 50_000_000, incomeB: 30_000_000 }),
      [],
      buy({ price: 500_000_000, region: "metro", rateBp: null, termYears: null }),
      R,
    );
    expect(bank).toMatchObject({ amount: 350_000_000, monthly: 1_670_954, dsrAfter: 25.1 });
  });
  it("만기가 최대 만기보다 길면 최대 만기로", () => {
    const at = (termYears: number) =>
      evaluateScenario(profile({ incomeA: 100_000_000 }), [], buy({ price: 300_000_000, termYears }), R)[0].monthly;
    expect(at(40)).toBe(at(30));
  });
  it("1주택 + 수도권은 처분 조건 안내, 소득 0이면 불가", () => {
    const [bank] = evaluateScenario(profile({ incomeA: 100_000_000, homeStatus: "one" }), [], buy({ price: 500_000_000, region: "metro" }), R);
    expect(bank.notes).toContain("기존 집을 6개월 안에 팔아야 해요");
    const [zero] = evaluateScenario(profile(), [], buy({ price: 500_000_000 }), R);
    expect(zero).toMatchObject({ eligible: false, reason: "소득을 입력해 주세요", dsrAfter: null });
  });
});

describe("매매: 디딤돌", () => {
  it("신혼부부: 상품 한도 3.2억", () => {
    const [, newlywed] = evaluateScenario(profile({ incomeA: 60_000_000 }), [], buy({ price: 500_000_000 }), R);
    expect(newlywed).toMatchObject({ eligible: true, amount: 320_000_000, limitedBy: "상품 한도예요", monthly: 1_349_133 });
  });
  it("신혼부부: DTI 60%가 막는 경우 (기존 대출 이자 포함)", () => {
    const [, a] = evaluateScenario(profile({ incomeA: 20_000_000 }), [], buy({ price: 500_000_000 }), R);
    expect(a).toMatchObject({ amount: 237_180_000, limitedBy: "DTI 60%에서 막혀요" });
    const debts = [debt({ kind: "credit", balance: 20_000_000, rateBp: 500 })];
    const [, b] = evaluateScenario(profile({ incomeA: 20_000_000 }), debts, buy({ price: 500_000_000 }), R);
    expect(b.amount).toBe(217_420_000);
  });
  it("경계: 소득 8,500만·집값 6억·순자산 5.11억까지 가능", () => {
    const reason = (p: Partial<LoanProfile>, price = 400_000_000) =>
      evaluateScenario(profile({ incomeA: 60_000_000, ...p }), [], buy({ price }), R)[1].reason;
    expect(reason({ incomeA: 85_000_000 })).toBeNull();
    expect(reason({ incomeA: 85_000_001 })).toBe("소득 8,500만 원 초과");
    expect(reason({}, 600_000_000)).toBeNull();
    expect(reason({}, 600_000_001)).toBe("집값 6억 원 초과");
    expect(reason({ netWorth: 511_000_000 })).toBeNull();
    expect(reason({ netWorth: 511_000_001 })).toBe("순자산 5.11억 원 초과");
  });
  it("생애최초: 체크해야 가능, 지방 LTV 80%·한도 2.4억", () => {
    const [, , no] = evaluateScenario(profile({ incomeA: 60_000_000 }), [], buy({ price: 500_000_000 }), R);
    expect(no.reason).toBe("생애최초일 때만 받을 수 있어요");
    const [, , yes] = evaluateScenario(profile({ incomeA: 60_000_000, firstTime: true }), [], buy({ price: 500_000_000 }), R);
    expect(yes).toMatchObject({ eligible: true, amount: 240_000_000, limitedBy: "상품 한도예요" });
  });
  it("1주택이면 둘 다 불가", () => {
    const [, a, b] = evaluateScenario(profile({ incomeA: 60_000_000, homeStatus: "one" }), [], buy({ price: 400_000_000 }), R);
    expect(a.reason).toBe("무주택일 때만 받을 수 있어요");
    expect(b.reason).toBe("무주택일 때만 받을 수 있어요");
  });
});

describe("전세", () => {
  it("은행 전세: 보증금의 80%, 한도 5억, 이자만", () => {
    const [bank, butimok] = evaluateScenario(profile({ incomeA: 60_000_000 }), [], jeonse({ price: 300_000_000, extraCosts: 1_000_000 }), R);
    expect(bank).toMatchObject({ amount: 240_000_000, limitedBy: "보증금의 80%예요", monthly: 760_000, cashNeeded: 61_000_000 });
    expect(butimok).toMatchObject({ amount: 240_000_000, monthly: 400_000 });
    expect(evaluateScenario(profile({ incomeA: 60_000_000 }), [], jeonse({ price: 700_000_000 }), R)[0].amount).toBe(500_000_000);
  });
  it("버팀목: 지방 한도 2억, 보증금 한도 넘으면 불가", () => {
    const at = (price: number, region: LoanScenarioInput["region"]) =>
      evaluateScenario(profile({ incomeA: 60_000_000 }), [], jeonse({ price, region }), R)[1];
    expect(at(300_000_000, "local")).toMatchObject({ amount: 200_000_000, limitedBy: "상품 한도예요", monthly: 333_333 });
    expect(at(300_000_001, "local").reason).toBe("보증금 3억 원 초과");
    expect(at(400_000_001, "metro").reason).toBe("보증금 4억 원 초과");
    expect(evaluateScenario(profile({ incomeA: 75_000_001 }), [], jeonse({ price: 300_000_000 }), R)[1].reason).toBe("소득 7,500만 원 초과");
  });
});

describe("bestProductIndex", () => {
  it("가능한 것 중 가장 큰 금액, 없으면 null", () => {
    const results = evaluateScenario(profile({ incomeA: 60_000_000 }), [], buy({ price: 500_000_000 }), R);
    expect(bestProductIndex(results)).toBe(0);
    expect(bestProductIndex(evaluateScenario(profile(), [], buy({ price: 500_000_000 }), R))).toBeNull();
  });
});
