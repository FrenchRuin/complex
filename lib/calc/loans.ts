/**
 * 대출 계산 (F-43, spec/loans.md §2). 화면·DB 없이 순수 계산만.
 * 금액은 원 단위 정수, 금리는 0.01% 단위 정수(bp, 4.25% → 425), 비율은 % 숫자(40 = 40%).
 */
import { formatEok } from "../money";
import type { LoanRules } from "./loan-rules";

export const REGIONS = ["regulated", "metro", "local"] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABEL: Record<Region, string> = { regulated: "규제지역", metro: "수도권 비규제", local: "지방" };

export const HOME_STATUSES = ["none", "one"] as const;
export type HomeStatus = (typeof HOME_STATUSES)[number];
export const HOME_STATUS_LABEL: Record<HomeStatus, string> = { none: "무주택", one: "1주택" };

export const DEBT_KINDS = ["mortgage", "credit", "overdraft", "car", "jeonse", "other"] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];
export const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  mortgage: "주담대",
  credit: "신용대출",
  overdraft: "마이너스통장",
  car: "자동차 할부",
  jeonse: "전세대출",
  other: "기타",
};
/** 남은 기간이나 매달 내는 금액 중 하나가 있어야 계산되는 종류 */
export const AMORTIZING_KINDS: readonly DebtKind[] = ["mortgage", "car", "other"];

export const DEALS = ["buy", "jeonse"] as const;
export type Deal = (typeof DEALS)[number];
export const DEAL_LABEL: Record<Deal, string> = { buy: "매매", jeonse: "전세" };

function narrow<T extends string>(list: readonly T[], value: string, fallback: T): T {
  return (list as readonly string[]).includes(value) ? (value as T) : fallback;
}
export const toRegion = (v: string): Region => narrow(REGIONS, v, "local");
export const toHomeStatus = (v: string): HomeStatus => narrow(HOME_STATUSES, v, "none");
export const toDebtKind = (v: string): DebtKind => narrow(DEBT_KINDS, v, "other");
export const toDeal = (v: string): Deal => narrow(DEALS, v, "buy");

/** "4.25" → 425, "4,5" → 450, 빈 칸·글자는 null. 소수 셋째 자리부터는 반올림 */
export function parseRateBp(input: string): number | null {
  const text = input.trim().replace(/%$/, "").replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

/** 425 → "4.25%", 400 → "4%" */
export function formatRateBp(bp: number): string {
  return `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export type LoanProfile = {
  incomeA: number;
  incomeB: number;
  homeStatus: HomeStatus;
  firstTime: boolean;
  /** 자산 메뉴의 순자산 */
  netWorth: number;
};

export type LoanDebt = {
  kind: DebtKind;
  /** 마이너스통장은 한도 */
  balance: number;
  rateBp: number;
  monthsLeft: number | null;
  monthlyPayment: number | null;
};

export type LoanScenarioInput = {
  deal: Deal;
  /** 집값 또는 보증금 */
  price: number;
  region: Region;
  rateBp: number | null;
  termYears: number | null;
  extraCosts: number;
};

export type ProductId = "bank_buy" | "didimdol_newlywed" | "didimdol_first" | "bank_jeonse" | "butimok_newlywed";

export const PRODUCT_LABEL: Record<ProductId, string> = {
  bank_buy: "은행 주담대",
  didimdol_newlywed: "디딤돌 신혼부부",
  didimdol_first: "디딤돌 생애최초",
  bank_jeonse: "은행 전세대출",
  butimok_newlywed: "버팀목 신혼부부",
};

export type ProductResult = {
  product: ProductId;
  eligible: boolean;
  /** 불가 이유 (가능하면 null) */
  reason: string | null;
  /** 최대 대출 (만원 단위 버림, 불가면 0) */
  amount: number;
  /** 금액을 정한 기준, 예: "LTV 40%에서 막혀요" */
  limitedBy: string | null;
  /** 한 달 상환액 (전세는 이자) */
  monthly: number;
  /** 가격 + 기타 비용 − 대출 */
  cashNeeded: number;
  /** 대출 뒤 DSR (%, 소수 첫째 자리), 소득이 0이면 null */
  dsrAfter: number | null;
  notes: string[];
};

const bpRate = (bp: number) => bp / 10_000;

/** 만원 단위로 버림 */
export function floorToManwon(amount: number): number {
  return Math.floor(amount / 10_000) * 10_000;
}

/** 원리금균등 한 달 상환액 (소수 그대로) */
export function monthlyPayment(principal: number, rateBp: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = bpRate(rateBp) / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}

/** 1년 상환 가능액 → 원리금균등으로 빌릴 수 있는 최대 원금 (소수 그대로) */
export function maxPrincipal(annualBudget: number, rateBp: number, months: number): number {
  if (annualBudget <= 0 || months <= 0) return 0;
  const r = bpRate(rateBp) / 12;
  const perMonth = annualBudget / 12;
  if (r === 0) return perMonth * months;
  return (perMonth * (1 - (1 + r) ** -months)) / r;
}

/** 남은 기간·매달 금액이 둘 다 비어 계산에서 0으로 보는 대출 (자산에서 불러온 항목 등) */
export function needsDebtInfo(debt: LoanDebt): boolean {
  return AMORTIZING_KINDS.includes(debt.kind) && debt.monthsLeft === null && debt.monthlyPayment === null;
}

/** 기존 대출 하나의 1년 상환액 (DSR용, §2.1) */
export function debtAnnualRepayment(debt: LoanDebt, homeStatus: HomeStatus, rules: LoanRules): number {
  const interest = debt.balance * bpRate(debt.rateBp);
  switch (debt.kind) {
    case "credit":
    case "overdraft":
      return debt.balance / rules.stress.creditYears + interest;
    case "jeonse":
      return homeStatus === "none" ? 0 : interest;
    default:
      if (debt.monthlyPayment !== null) return debt.monthlyPayment * 12;
      if (debt.monthsLeft !== null) return monthlyPayment(debt.balance, debt.rateBp, debt.monthsLeft) * 12;
      return 0;
  }
}

export function existingAnnualRepayment(debts: readonly LoanDebt[], homeStatus: HomeStatus, rules: LoanRules): number {
  return debts.reduce((sum, d) => sum + debtAnnualRepayment(d, homeStatus, rules), 0);
}

/** DTI용 기존 대출 1년 이자 (무주택이면 전세대출 제외) */
export function existingAnnualInterest(debts: readonly LoanDebt[], homeStatus: HomeStatus): number {
  return debts
    .filter((d) => !(d.kind === "jeonse" && homeStatus === "none"))
    .reduce((sum, d) => sum + d.balance * bpRate(d.rateBp), 0);
}

type Ctx = {
  profile: LoanProfile;
  debts: readonly LoanDebt[];
  scenario: LoanScenarioInput;
  rules: LoanRules;
  income: number;
  existing: number;
  metro: boolean;
};

type Limit = { amount: number; label: string };

/** 가장 작은 제한. 같으면 앞의 것 (LTV → 상한 → DSR 순서) */
function pickLimit(limits: Limit[]): Limit {
  return limits.reduce((min, l) => (l.amount < min.amount ? l : min));
}

function dsrAfter(ctx: Ctx, newAnnual: number): number | null {
  if (ctx.income <= 0) return null;
  return Math.round(((ctx.existing + newAnnual) / ctx.income) * 1000) / 10;
}

function blocked(ctx: Ctx, product: ProductId, reason: string, notes: string[] = []): ProductResult {
  const { price, extraCosts } = ctx.scenario;
  return {
    product,
    eligible: false,
    reason,
    amount: 0,
    limitedBy: null,
    monthly: 0,
    cashNeeded: price + extraCosts,
    dsrAfter: dsrAfter(ctx, 0),
    notes,
  };
}

function result(ctx: Ctx, product: ProductId, limit: Limit, monthly: number, newAnnual: number, notes: string[]): ProductResult {
  const amount = floorToManwon(Math.max(0, limit.amount));
  const { price, extraCosts } = ctx.scenario;
  return {
    product,
    eligible: true,
    reason: null,
    amount,
    limitedBy: limit.label,
    monthly: Math.round(monthly),
    cashNeeded: price + extraCosts - amount,
    dsrAfter: dsrAfter(ctx, newAnnual),
    notes,
  };
}

function termMonths(ctx: Ctx): number {
  const years = Math.min(ctx.scenario.termYears ?? ctx.rules.defaults.termYears, ctx.rules.bankBuy.maxTermYears);
  return years * 12;
}

/** 은행 주담대 = min(LTV, 금액 상한, DSR) (§2.2) */
function bankBuy(ctx: Ctx): ProductResult {
  const { scenario, rules, profile } = ctx;
  const b = rules.bankBuy;
  const notes: string[] = [];
  if (profile.homeStatus === "one" && ctx.metro) notes.push("기존 집을 6개월 안에 팔아야 해요");
  if (ctx.income <= 0) return blocked(ctx, "bank_buy", "소득을 입력해 주세요", notes);

  const first = profile.homeStatus === "none" && profile.firstTime;
  const ltv = first
    ? ctx.metro
      ? b.ltvFirstMetro
      : b.ltvFirstLocal
    : scenario.region === "regulated"
      ? b.ltvRegulated
      : b.ltvOther;
  const limits: Limit[] = [{ amount: (scenario.price * ltv) / 100, label: `LTV ${ltv}%에서 막혀요` }];
  if (ctx.metro) {
    const cap = scenario.price <= b.capPrice1 ? b.cap1 : scenario.price <= b.capPrice2 ? b.cap2 : b.cap3;
    limits.push({ amount: cap, label: `금액 상한 ${formatEok(cap)}에서 막혀요` });
  }
  const budget = (ctx.income * b.dsr) / 100 - ctx.existing;
  if (budget <= 0) return blocked(ctx, "bank_buy", "기존 대출로 DSR이 이미 넘어요", notes);
  const months = termMonths(ctx);
  const rateBp = scenario.rateBp ?? rules.defaults.buyRateBp;
  const stressBp = ctx.metro ? rules.stress.metroBp : rules.stress.localBp;
  limits.push({ amount: maxPrincipal(budget, rateBp + stressBp, months), label: `DSR ${b.dsr}%에서 막혀요` });

  const limit = pickLimit(limits);
  const monthly = monthlyPayment(floorToManwon(limit.amount), rateBp, months);
  return result(ctx, "bank_buy", limit, monthly, monthly * 12, notes);
}

/** 디딤돌 = min(LTV, 상품 한도, DTI) (§2.2) */
function didimdol(ctx: Ctx, kind: "newlywed" | "first"): ProductResult {
  const { scenario, rules, profile } = ctx;
  const d = rules.didimdol;
  const product: ProductId = kind === "newlywed" ? "didimdol_newlywed" : "didimdol_first";
  const notes = ["전용 85㎡ 이하(수도권 밖 읍·면 100㎡) 조건과 방공제는 직접 확인해 주세요"];
  const maxIncome = kind === "newlywed" ? d.newlywedIncome : d.firstIncome;
  const maxPrice = kind === "newlywed" ? d.newlywedPrice : d.firstPrice;

  if (profile.homeStatus !== "none") return blocked(ctx, product, "무주택일 때만 받을 수 있어요", notes);
  if (kind === "first" && !profile.firstTime) return blocked(ctx, product, "생애최초일 때만 받을 수 있어요", notes);
  if (ctx.income <= 0) return blocked(ctx, product, "소득을 입력해 주세요", notes);
  if (ctx.income > maxIncome) return blocked(ctx, product, `소득 ${formatEok(maxIncome)} 초과`, notes);
  if (scenario.price > maxPrice) return blocked(ctx, product, `집값 ${formatEok(maxPrice)} 초과`, notes);
  if (profile.netWorth > d.netWorth) return blocked(ctx, product, `순자산 ${formatEok(d.netWorth)} 초과`, notes);

  const ltv = kind === "newlywed" ? d.newlywedLtv : ctx.metro ? d.firstLtvMetro : d.firstLtvLocal;
  const cap = kind === "newlywed" ? d.newlywedLimit : d.firstLimit;
  const budget = (ctx.income * d.dti) / 100 - existingAnnualInterest(ctx.debts, profile.homeStatus);
  if (budget <= 0) return blocked(ctx, product, "기존 대출로 DTI가 이미 넘어요", notes);
  const months = termMonths(ctx);
  const limit = pickLimit([
    { amount: (scenario.price * ltv) / 100, label: `LTV ${ltv}%에서 막혀요` },
    { amount: cap, label: "상품 한도예요" },
    { amount: maxPrincipal(budget, d.rateBp, months), label: `DTI ${d.dti}%에서 막혀요` },
  ]);
  const monthly = monthlyPayment(floorToManwon(limit.amount), d.rateBp, months);
  return result(ctx, product, limit, monthly, monthly * 12, notes);
}

/** 은행 전세대출 = min(보증금 × 80%, 한도), 이자만 (§2.3) */
function bankJeonse(ctx: Ctx): ProductResult {
  const { scenario, rules, profile } = ctx;
  const j = rules.bankJeonse;
  const notes = profile.homeStatus === "one" ? ["1주택이면 보증기관 한도가 줄거나 안 될 수 있어요"] : [];
  const limit = pickLimit([
    { amount: (scenario.price * j.ratio) / 100, label: `보증금의 ${j.ratio}%예요` },
    { amount: j.limit, label: "상품 한도예요" },
  ]);
  const interest = floorToManwon(limit.amount) * bpRate(scenario.rateBp ?? rules.defaults.jeonseRateBp);
  // 무주택이면 전세대출 이자는 DSR에 들어가지 않는다
  return result(ctx, "bank_jeonse", limit, interest / 12, profile.homeStatus === "one" ? interest : 0, notes);
}

/** 버팀목 신혼부부 = min(보증금 × 80%, 수도권 3억 / 지방 2억) (§2.3) */
function butimok(ctx: Ctx): ProductResult {
  const { scenario, rules, profile } = ctx;
  const t = rules.butimok;
  const maxDeposit = ctx.metro ? t.depositMetro : t.depositLocal;
  if (profile.homeStatus !== "none") return blocked(ctx, "butimok_newlywed", "무주택일 때만 받을 수 있어요");
  if (ctx.income <= 0) return blocked(ctx, "butimok_newlywed", "소득을 입력해 주세요");
  if (ctx.income > t.income) return blocked(ctx, "butimok_newlywed", `소득 ${formatEok(t.income)} 초과`);
  if (profile.netWorth > t.netWorth) return blocked(ctx, "butimok_newlywed", `순자산 ${formatEok(t.netWorth)} 초과`);
  if (scenario.price > maxDeposit) return blocked(ctx, "butimok_newlywed", `보증금 ${formatEok(maxDeposit)} 초과`);
  const limit = pickLimit([
    { amount: (scenario.price * t.ratio) / 100, label: `보증금의 ${t.ratio}%예요` },
    { amount: ctx.metro ? t.limitMetro : t.limitLocal, label: "상품 한도예요" },
  ]);
  const interest = floorToManwon(limit.amount) * bpRate(t.rateBp);
  return result(ctx, "butimok_newlywed", limit, interest / 12, 0, []);
}

/** 후보 하나 → 상품별 결과 (매매: 은행·디딤돌 신혼·디딤돌 생애최초, 전세: 은행·버팀목) */
export function evaluateScenario(
  profile: LoanProfile,
  debts: readonly LoanDebt[],
  scenario: LoanScenarioInput,
  rules: LoanRules,
): ProductResult[] {
  const ctx: Ctx = {
    profile,
    debts,
    scenario,
    rules,
    income: profile.incomeA + profile.incomeB,
    existing: existingAnnualRepayment(debts, profile.homeStatus, rules),
    metro: scenario.region !== "local",
  };
  return scenario.deal === "buy"
    ? [bankBuy(ctx), didimdol(ctx, "newlywed"), didimdol(ctx, "first")]
    : [bankJeonse(ctx), butimok(ctx)];
}

/** 가능한 상품 중 가장 많이 빌릴 수 있는 것의 위치 (없으면 null) */
export function bestProductIndex(results: readonly ProductResult[]): number | null {
  let best: number | null = null;
  results.forEach((r, i) => {
    if (r.eligible && r.amount > 0 && (best === null || r.amount > results[best].amount)) best = i;
  });
  return best;
}
