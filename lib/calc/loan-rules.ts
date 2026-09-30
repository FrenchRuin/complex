/**
 * 대출 계산 기준값 (F-43, spec/loans.md §2.4). 코드의 기본값이 2026-09 조사값이다.
 * DB(loan_profiles.rules)에는 사용자가 고친 묶음만 저장하고, 읽을 때 묶음마다 검사해 잘못되면 기본값을 쓴다.
 * 비율은 % 숫자(40 = 40%), 금리는 0.01% 단위 정수(bp), 금액은 원.
 */
import { z } from "zod";

const checked = { checkedOn: z.iso.date(), source: z.string().trim().min(1).max(100) };
const pct = z.number().min(0).max(100);
const won = z.number().int().min(0).max(100_000_000_000_000);
const bp = z.number().int().min(0).max(3000);
const years = z.number().int().min(1).max(50);

export const ruleSchemas = {
  bankBuy: z.object({
    ...checked,
    ltvRegulated: pct,
    ltvOther: pct,
    ltvFirstMetro: pct,
    ltvFirstLocal: pct,
    capPrice1: won,
    capPrice2: won,
    cap1: won,
    cap2: won,
    cap3: won,
    dsr: pct,
    maxTermYears: years,
  }),
  stress: z.object({ ...checked, metroBp: bp, localBp: bp, creditYears: years }),
  didimdol: z.object({
    ...checked,
    newlywedIncome: won,
    newlywedPrice: won,
    newlywedLimit: won,
    newlywedLtv: pct,
    firstIncome: won,
    firstPrice: won,
    firstLimit: won,
    firstLtvMetro: pct,
    firstLtvLocal: pct,
    dti: pct,
    netWorth: won,
    rateBp: bp,
  }),
  bankJeonse: z.object({ ...checked, ratio: pct, limit: won }),
  butimok: z.object({
    ...checked,
    income: won,
    netWorth: won,
    depositMetro: won,
    depositLocal: won,
    limitMetro: won,
    limitLocal: won,
    ratio: pct,
    rateBp: bp,
  }),
  regulatedAreas: z.object({ ...checked, list: z.string().trim().min(1).max(500) }),
  defaults: z.object({ ...checked, buyRateBp: bp, jeonseRateBp: bp, termYears: years }),
};

export type RuleGroup = keyof typeof ruleSchemas;
export type LoanRules = { [K in RuleGroup]: z.infer<(typeof ruleSchemas)[K]> };
export const RULE_GROUPS = Object.keys(ruleSchemas) as RuleGroup[];

export const RULE_GROUP_LABEL: Record<RuleGroup, string> = {
  bankBuy: "은행 주담대",
  stress: "스트레스 금리",
  didimdol: "디딤돌",
  bankJeonse: "은행 전세대출",
  butimok: "버팀목 신혼부부",
  regulatedAreas: "규제지역",
  defaults: "기본 금리·만기",
};

const SURVEYED = "2026-09-30";

export const DEFAULT_RULES: LoanRules = {
  bankBuy: {
    checkedOn: SURVEYED,
    source: "금융위원회 가계부채 관리 방안 (2025-06-27, 2025-10-15)",
    ltvRegulated: 40,
    ltvOther: 70,
    ltvFirstMetro: 70,
    ltvFirstLocal: 80,
    capPrice1: 1_500_000_000,
    capPrice2: 2_500_000_000,
    cap1: 600_000_000,
    cap2: 400_000_000,
    cap3: 200_000_000,
    dsr: 40,
    maxTermYears: 30,
  },
  stress: { checkedOn: SURVEYED, source: "금융위원회 스트레스 DSR 3단계, 10·15 대책", metroBp: 300, localBp: 75, creditYears: 5 },
  didimdol: {
    checkedOn: SURVEYED,
    source: "주택도시기금 (nhuf.molit.go.kr)",
    newlywedIncome: 85_000_000,
    newlywedPrice: 600_000_000,
    newlywedLimit: 320_000_000,
    newlywedLtv: 70,
    firstIncome: 70_000_000,
    firstPrice: 500_000_000,
    firstLimit: 240_000_000,
    firstLtvMetro: 70,
    firstLtvLocal: 80,
    dti: 60,
    netWorth: 511_000_000,
    rateBp: 300,
  },
  bankJeonse: { checkedOn: SURVEYED, source: "보증기관(HUG·HF·SGI) 전세자금보증", ratio: 80, limit: 500_000_000 },
  butimok: {
    checkedOn: SURVEYED,
    source: "주택도시기금 (nhuf.molit.go.kr)",
    income: 75_000_000,
    netWorth: 345_000_000,
    depositMetro: 400_000_000,
    depositLocal: 300_000_000,
    limitMetro: 300_000_000,
    limitLocal: 200_000_000,
    ratio: 80,
    rateBp: 200,
  },
  regulatedAreas: {
    checkedOn: SURVEYED,
    source: "국토교통부",
    list: "서울 전체, 경기 과천·광명·성남(분당·수정·중원)·수원(영통·장안·팔달)·안양 동안·용인 수지·의왕·하남, 구리·용인 기흥·화성 동탄(2026-07-10 추가)",
  },
  defaults: { checkedOn: SURVEYED, source: "참고값", buyRateBp: 400, jeonseRateBp: 380, termYears: 30 },
};

/** DB의 rules(jsonb) → 기준값. 묶음마다 검사해 없거나 잘못된 묶음은 기본값 */
export function parseRules(raw: unknown): LoanRules {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...DEFAULT_RULES };
  for (const group of RULE_GROUPS) {
    const parsed = ruleSchemas[group].safeParse(obj[group]);
    if (parsed.success) out[group] = parsed.data;
  }
  return out as LoanRules;
}

/** 확인한 날이 오늘보다 6개월 넘게 지났는지 (YYYY-MM-DD 문자열 비교) */
export function isRuleStale(checkedOn: string, today: string): boolean {
  const [y, m, d] = today.split("-").map(Number);
  const total = y * 12 + (m - 1) - 6;
  const limit = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return checkedOn < limit;
}

/** 기준값 수정 화면의 입력 칸. pct: %, won: 원, bp: 금리 %, years: 년, text: 글 */
export type RuleFieldUnit = "pct" | "won" | "bp" | "years" | "text";
export type RuleField = { key: string; label: string; unit: RuleFieldUnit };

export const RULE_FIELDS: Record<RuleGroup, RuleField[]> = {
  bankBuy: [
    { key: "ltvRegulated", label: "LTV 규제지역", unit: "pct" },
    { key: "ltvOther", label: "LTV 비규제", unit: "pct" },
    { key: "ltvFirstMetro", label: "생애최초 LTV 수도권·규제", unit: "pct" },
    { key: "ltvFirstLocal", label: "생애최초 LTV 지방", unit: "pct" },
    { key: "capPrice1", label: "금액 상한 1구간 집값 (이하)", unit: "won" },
    { key: "cap1", label: "1구간 상한", unit: "won" },
    { key: "capPrice2", label: "금액 상한 2구간 집값 (이하)", unit: "won" },
    { key: "cap2", label: "2구간 상한", unit: "won" },
    { key: "cap3", label: "그 위 상한", unit: "won" },
    { key: "dsr", label: "DSR", unit: "pct" },
    { key: "maxTermYears", label: "최대 만기", unit: "years" },
  ],
  stress: [
    { key: "metroBp", label: "수도권·규제지역 가산", unit: "bp" },
    { key: "localBp", label: "지방 가산", unit: "bp" },
    { key: "creditYears", label: "신용대출 나눠 갚는 기간", unit: "years" },
  ],
  didimdol: [
    { key: "newlywedIncome", label: "신혼 소득 (이하)", unit: "won" },
    { key: "newlywedPrice", label: "신혼 집값 (이하)", unit: "won" },
    { key: "newlywedLimit", label: "신혼 한도", unit: "won" },
    { key: "newlywedLtv", label: "신혼 LTV", unit: "pct" },
    { key: "firstIncome", label: "생애최초 소득 (이하)", unit: "won" },
    { key: "firstPrice", label: "생애최초 집값 (이하)", unit: "won" },
    { key: "firstLimit", label: "생애최초 한도", unit: "won" },
    { key: "firstLtvMetro", label: "생애최초 LTV 수도권·규제", unit: "pct" },
    { key: "firstLtvLocal", label: "생애최초 LTV 지방", unit: "pct" },
    { key: "dti", label: "DTI", unit: "pct" },
    { key: "netWorth", label: "순자산 (이하)", unit: "won" },
    { key: "rateBp", label: "금리", unit: "bp" },
  ],
  bankJeonse: [
    { key: "ratio", label: "보증금 대비", unit: "pct" },
    { key: "limit", label: "한도", unit: "won" },
  ],
  butimok: [
    { key: "income", label: "소득 (이하)", unit: "won" },
    { key: "netWorth", label: "순자산 (이하)", unit: "won" },
    { key: "depositMetro", label: "보증금 수도권 (이하)", unit: "won" },
    { key: "depositLocal", label: "보증금 지방 (이하)", unit: "won" },
    { key: "limitMetro", label: "한도 수도권", unit: "won" },
    { key: "limitLocal", label: "한도 지방", unit: "won" },
    { key: "ratio", label: "보증금 대비", unit: "pct" },
    { key: "rateBp", label: "금리", unit: "bp" },
  ],
  regulatedAreas: [{ key: "list", label: "규제지역 목록", unit: "text" }],
  defaults: [
    { key: "buyRateBp", label: "매매 기본 금리", unit: "bp" },
    { key: "jeonseRateBp", label: "전세 기본 금리", unit: "bp" },
    { key: "termYears", label: "기본 만기", unit: "years" },
  ],
};
