/**
 * 엑셀 내보내기(백업, F-52)의 시트 만들기 (spec/rules.md §8.3).
 * 읽어 온 데이터 → 시트별 제목·열 너비·행. 라이브러리와 무관한 순수 함수이고, 파일은 lib/export/xlsx.ts가 만든다.
 */
import type { DateString } from "@/lib/date";
import {
  CATEGORY_TYPE_LABEL,
  ownerLabel,
  SCOPE_LABEL,
  type CategoryType,
  type MemberNames,
  type Owner,
  type Scope,
  type Slot,
} from "@/lib/domain";
import { ASSET_KIND_LABEL, goalProgress, type AssetKind } from "./assets";
import {
  DEAL_LABEL,
  DEBT_KIND_LABEL,
  HOME_STATUS_LABEL,
  REGION_LABEL,
  type Deal,
  type DebtKind,
  type HomeStatus,
  type Region,
} from "./loans";

export type ExportCell =
  | { kind: "text"; value: string }
  | { kind: "money"; value: number }
  | { kind: "number"; value: number }
  | { kind: "date"; value: DateString }
  | null;

export type ExportColumn = { title: string; width: number };
export type ExportSheet = { name: string; columns: ExportColumn[]; rows: ExportCell[][] };

/** 내보낼 가구 데이터 (지운 항목은 이미 뺀 것). 달 칸(month, startMonth 등)은 그 달 1일 */
export type ExportData = {
  today: DateString;
  names: MemberNames;
  /** 숨긴 것 포함 */
  categories: Record<string, { name: string; sortOrder: number }>;
  paymentMethods: Record<string, string>;
  transactions: {
    occurredOn: DateString;
    /** "HH:MM:SS" (문자로 넣은 것만) */
    occurredTime: string | null;
    type: CategoryType;
    categoryId: string;
    merchant: string | null;
    memo: string | null;
    amount: number;
    paymentMethodId: string | null;
    scope: Scope;
    memberSlot: Slot;
    createdAt: string;
  }[];
  recurring: {
    name: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string;
    scope: Scope;
    memberSlot: Slot;
    paymentMethodId: string | null;
    isVariable: boolean;
    hasVariableDate: boolean;
    startMonth: DateString;
    endMonth: DateString | null;
  }[];
  budgets: { month: DateString; categoryId: string; amount: number }[];
  spendBudgets: { month: DateString; name: string; sortOrder: number; amount: number; methodIds: string[] }[];
  assets: {
    id: string;
    name: string;
    kind: AssetKind;
    owner: Owner;
    amount: number;
    valueAsOf: DateString | null;
    isLiability: boolean;
    memo: string | null;
  }[];
  assetValues: { assetId: string; asOf: DateString; amount: number }[];
  goals: { id: string; name: string; targetAmount: number; dueDate: DateString | null; isDone: boolean; createdAt: string }[];
  contributions: { goalId: string; amount: number; contributedOn: DateString; memberSlot: Slot; memo: string | null }[];
  loanProfile: { incomeA: number; incomeB: number; homeStatus: HomeStatus; firstTime: boolean } | null;
  loanDebts: {
    name: string;
    kind: DebtKind;
    owner: Owner;
    balance: number;
    rateBp: number;
    monthsLeft: number | null;
    monthlyPayment: number | null;
    createdAt: string;
  }[];
  loanScenarios: {
    name: string;
    deal: Deal;
    price: number;
    region: Region;
    rateBp: number | null;
    termYears: number | null;
    extraCosts: number;
    memo: string | null;
    createdAt: string;
  }[];
};

export const EXPORT_SHEET_NAMES = [
  "내역",
  "정기지출",
  "카테고리 예산",
  "통장·카드 예산",
  "자산",
  "자산 금액 기록",
  "저축 목표",
  "목표 적립",
  "대출 우리 정보",
  "기존 대출",
  "집 후보",
] as const;

/** "감자밭-백업-2026-10-01.xlsx" */
export function exportFileName(today: DateString): string {
  return `감자밭-백업-${today}.xlsx`;
}

const text = (value: string | null | undefined): ExportCell => (value ? { kind: "text", value } : null);
const money = (value: number | null): ExportCell => (value === null ? null : { kind: "money", value });
const num = (value: number | null): ExportCell => (value === null ? null : { kind: "number", value });
const date = (value: DateString | null): ExportCell => (value ? { kind: "date", value } : null);
const yesNo = (value: boolean): ExportCell => text(value ? "예" : "아니요");
/** 그 달 1일 → "2026-09" */
const month = (first: DateString | null): ExportCell => text(first ? first.slice(0, 7) : null);
/** 0.01% 단위 정수 → % 숫자 (425 → 4.25) */
const rate = (bp: number | null): ExportCell => num(bp === null ? null : bp / 100);
const cols = (...list: [title: string, width: number][]): ExportColumn[] => list.map(([title, width]) => ({ title, width }));
const compare = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);
const byCreated = <T extends { createdAt: string }>(list: readonly T[]) => [...list].sort((a, b) => compare(a.createdAt, b.createdAt));

/** 시트 11장 (EXPORT_SHEET_NAMES 순서) */
export function buildExportSheets(d: ExportData): ExportSheet[] {
  const category = (id: string) => d.categories[id]?.name ?? null;
  const categoryOrder = (id: string) => d.categories[id]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const method = (id: string | null) => (id ? (d.paymentMethods[id] ?? null) : null);
  const person = (owner: Owner) => ownerLabel(owner, d.names);

  const assets = [...d.assets].sort((a, b) => compare(Number(a.isLiability), Number(b.isLiability)) || b.amount - a.amount);
  const assetIndex = new Map(assets.map((a, i) => [a.id, i]));
  const assetName = new Map(assets.map((a) => [a.id, a.name]));
  const goalName = new Map(d.goals.map((g) => [g.id, g.name]));
  const saved = (goalId: string) => d.contributions.filter((c) => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
  const p = d.loanProfile;

  return [
    {
      name: "내역",
      columns: cols(["날짜", 12], ["시간", 8], ["유형", 8], ["카테고리", 14], ["가맹점·내용", 24], ["메모", 30], ["금액", 14], ["결제수단", 16], ["구분", 8], ["사람", 12]),
      rows: [...d.transactions]
        .sort((a, b) => compare(a.occurredOn, b.occurredOn) || compare(a.createdAt, b.createdAt))
        .map((r) => [
          date(r.occurredOn),
          text(r.occurredTime?.slice(0, 5)),
          text(CATEGORY_TYPE_LABEL[r.type]),
          text(category(r.categoryId)),
          text(r.merchant),
          text(r.memo),
          money(r.amount),
          text(method(r.paymentMethodId)),
          text(SCOPE_LABEL[r.scope]),
          text(person(r.memberSlot)),
        ]),
    },
    {
      name: "정기지출",
      columns: cols(["이름", 20], ["금액", 14], ["결제일", 8], ["카테고리", 14], ["구분", 8], ["사람", 12], ["결제수단", 16], ["매달 금액 다름", 14], ["매달 결제일 다름", 16], ["시작 달", 10], ["중지한 달", 10]),
      rows: [...d.recurring]
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth || compare(a.name, b.name))
        .map((r) => [
          text(r.name),
          money(r.amount),
          num(r.dayOfMonth),
          text(category(r.categoryId)),
          text(SCOPE_LABEL[r.scope]),
          text(person(r.memberSlot)),
          text(method(r.paymentMethodId)),
          yesNo(r.isVariable),
          yesNo(r.hasVariableDate),
          month(r.startMonth),
          month(r.endMonth),
        ]),
    },
    {
      name: "카테고리 예산",
      columns: cols(["달", 10], ["카테고리", 14], ["금액", 14]),
      rows: [...d.budgets]
        .sort((a, b) => compare(a.month, b.month) || categoryOrder(a.categoryId) - categoryOrder(b.categoryId))
        .map((r) => [month(r.month), text(category(r.categoryId)), money(r.amount)]),
    },
    {
      name: "통장·카드 예산",
      columns: cols(["달", 10], ["예산 이름", 20], ["금액", 14], ["묶인 계좌·카드", 30]),
      rows: [...d.spendBudgets]
        .sort((a, b) => compare(a.month, b.month) || a.sortOrder - b.sortOrder)
        .map((r) => [
          month(r.month),
          text(r.name),
          money(r.amount),
          text(r.methodIds.flatMap((id) => method(id) ?? []).join(", ")),
        ]),
    },
    {
      name: "자산",
      columns: cols(["이름", 20], ["종류", 10], ["소유", 12], ["자산/부채", 10], ["지금 금액", 16], ["기준일", 12], ["메모", 30]),
      rows: assets.map((a) => [
        text(a.name),
        text(ASSET_KIND_LABEL[a.kind]),
        text(person(a.owner)),
        text(a.isLiability ? "부채" : "자산"),
        money(a.amount),
        date(a.valueAsOf),
        text(a.memo),
      ]),
    },
    {
      name: "자산 금액 기록",
      columns: cols(["항목 이름", 20], ["기준일", 12], ["금액", 16]),
      rows: d.assetValues
        .filter((v) => assetIndex.has(v.assetId))
        .sort((a, b) => (assetIndex.get(a.assetId) ?? 0) - (assetIndex.get(b.assetId) ?? 0) || compare(a.asOf, b.asOf))
        .map((v) => [text(assetName.get(v.assetId)), date(v.asOf), money(v.amount)]),
    },
    {
      name: "저축 목표",
      columns: cols(["이름", 20], ["목표액", 14], ["기한", 12], ["모은 금액", 14], ["진행률(%)", 10], ["끝남", 8]),
      rows: byCreated(d.goals).map((g) => [
        text(g.name),
        money(g.targetAmount),
        date(g.dueDate),
        money(saved(g.id)),
        num(goalProgress(g.targetAmount, saved(g.id), null, d.today).percent),
        yesNo(g.isDone),
      ]),
    },
    {
      name: "목표 적립",
      columns: cols(["목표 이름", 20], ["날짜", 12], ["금액", 14], ["사람", 12], ["메모", 30]),
      rows: d.contributions
        .filter((c) => goalName.has(c.goalId))
        .sort((a, b) => compare(a.contributedOn, b.contributedOn))
        .map((c) => [text(goalName.get(c.goalId)), date(c.contributedOn), money(c.amount), text(person(c.memberSlot)), text(c.memo)]),
    },
    {
      name: "대출 우리 정보",
      columns: cols(["항목", 16], ["값", 16]),
      rows: p
        ? [
            [text(`${person("a")} 연소득`), money(p.incomeA)],
            [text(`${person("b")} 연소득`), money(p.incomeB)],
            [text("주택 보유"), text(HOME_STATUS_LABEL[p.homeStatus])],
            [text("생애최초"), yesNo(p.firstTime)],
          ]
        : [],
    },
    {
      name: "기존 대출",
      columns: cols(["이름", 20], ["종류", 12], ["소유", 12], ["잔액", 16], ["금리(%)", 10], ["남은 기간(개월)", 14], ["매달 상환액", 14]),
      rows: byCreated(d.loanDebts).map((l) => [
        text(l.name),
        text(DEBT_KIND_LABEL[l.kind]),
        text(person(l.owner)),
        money(l.balance),
        rate(l.rateBp),
        num(l.monthsLeft),
        money(l.monthlyPayment),
      ]),
    },
    {
      name: "집 후보",
      columns: cols(["이름", 20], ["매매/전세", 10], ["가격", 16], ["지역", 14], ["금리(%)", 10], ["기간(년)", 10], ["추가 비용", 14], ["메모", 30]),
      rows: byCreated(d.loanScenarios).map((s) => [
        text(s.name),
        text(DEAL_LABEL[s.deal]),
        money(s.price),
        text(REGION_LABEL[s.region]),
        rate(s.rateBp),
        num(s.termYears),
        money(s.extraCosts),
        text(s.memo),
      ]),
    },
  ];
}
