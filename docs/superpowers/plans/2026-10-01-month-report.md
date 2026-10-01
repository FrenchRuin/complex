# 월말 결산 (F-25) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/stats/report?month=yyyy-MM`에 한 달을 둘이 같이 돌아보는 결산 화면(돈 흐름·카테고리·예산·정기지출·자산·목표)을 만들고, `PDF로 저장` 버튼으로 브라우저 인쇄 창을 열어 A4 PDF로 저장하게 한다.

**Architecture:** 새 계산은 `lib/calc/report.ts`(순수 함수 + 단위 테스트), 나머지는 기존 통계·예산·자산 계산과 부품을 그대로 쓴다. 정기지출 읽기는 "이번 달 전용"이던 `getRecurringOverview`에서 아무 달이나 읽는 `getRecurringForMonth(month)`를 떼어 낸다. 화면은 서버 컴포넌트 페이지 + `components/report/` 부품 5개. 인쇄는 Tailwind `print:` 변형으로 앱 틀(사이드바·탭바·머리)을 숨기고, 작은 클라이언트 부품이 `beforeprint`/`afterprint`에서 라이트 테마와 문서 제목을 바꿨다 되돌린다. DB 변경·새 라이브러리 없음.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase(`@supabase/ssr`, 읽기만), Tailwind 4 토큰 + `print:` 변형, Recharts(기존 그래프), Vitest, Playwright.

**Spec:** `spec/budget-stats.md`의 F-25 (목차 `SPEC.md`, 라우트 `spec/layout.md`)

## Global Constraints

- 사용자에게 보이는 문구는 한국어 해요체, 짧게, 이모지·느낌표 없음. 버튼은 동작 그대로(`PDF로 저장`).
- 금액은 원 단위 정수, 표시는 `lib/money.ts`(`formatWon`)만. 금액에는 `tabular-nums`.
- 색은 토큰 클래스만(`text-ink`, `text-ink-muted`, `text-expense`, `text-income`, `text-danger`, `bg-primary-soft` 등). 16진수 색 금지. 카드에 그림자 없음.
- 사람 색은 이름 글자와 함께(`SplitBar`가 이미 그렇게 함). 초과는 색만이 아니라 문장으로.
- 한 달은 한 달 기준(F-56): 날짜 → 달은 `periodOf(date, cfg)`, 달 → 기간은 `periodRange(month, cfg)`. `new Date()`로 월 경계를 계산하지 않는다. 오늘은 `todayKST()`.
- 읽기는 서버 컴포넌트. 이 기능에는 쓰기(서버 액션)가 없다. DB·마이그레이션 변경 없음.
- 새 라이브러리 없음. 아이콘은 `lucide-react`(`Printer`, `ChevronLeft`, `ChevronRight`), stroke 1.75.
- 컴포넌트 하나 200줄 이하, `any` 금지. 아이콘 버튼·링크에 `aria-label`.
- 인쇄 숨김·덮어쓰기 클래스는 반응형 클래스(`lg:flex`, `lg:h-dvh` 등)와 싸우지 않도록 **`!` 붙인 Tailwind 4 문법**(`print:hidden!`, `print:h-auto!`)으로 쓴다.
- E2E에서 저장은 E2E 테스트 계정으로만. E2E 전에는 3000번 dev 서버를 멈추고 끝나면 다시 켠다. 화면 확인은 Aside 브라우저로, 실제 계정으로는 저장하지 않는다.
- 이 PC: 파일 편집은 Edit 도구(CRLF 파일이 많다). 커밋 메시지는 한국어 한 줄 + `(F-25)`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 한 커밋에 한 가지 일.

## Review Focus

1. **인쇄하면 첫 페이지만 찍히는 문제** — 웹(1024px 이상) 틀은 `lg:h-dvh` + 메인 `lg:overflow-y-auto`라 인쇄 때도 화면 높이에서 잘린다. 인쇄에서는 높이 자동·넘침 보이기여야 모든 부분이 여러 장에 이어서 찍힌다 (Task 3 클래스, Task 5 E2E `overflowY === "visible"`, Task 6 인쇄 미리보기 확인).
2. **다크 모드·"라이트" 고정 사용자가 인쇄** — 시스템이 다크든 화면 모드를 다크로 골랐든 인쇄는 라이트 토큰이어야 하고, 인쇄가 끝나면 원래 모드(속성 없음 = 시스템 포함)로 돌아와야 한다. 버튼이 아니라 브라우저 메뉴(Ctrl+P)로 인쇄해도 같아야 한다 (Task 3 `PrintSetup`, Task 5 E2E `beforeprint`/`afterprint`).
3. **주소의 `month`가 이상한 값** — `2099-01`(미래), `2026-13`, `abc`, 빈 값, 배열(`?month=a&month=b`)이면 오류 없이 지난달을 보여야 한다 (Task 1 `reportMonth` 테스트, Task 4 페이지에서 배열은 `undefined`로).
4. **월급날 기준(1일이 아닌 한 달)과 진행 중인 달** — 지난달 비교·순자산 변화·목표 적립은 달력의 달이 아니라 그 기간으로 계산하고, 진행 중인 달의 순자산은 기간 끝이 아니라 오늘 기준이어야 한다 (Task 1 `netWorthChange`·`reportGoals` 비달력 기간 테스트).
5. **지난 달의 정기지출** — 지난달 결산에서는 그 달 납부 기록으로 요약해야 하고, 그 뒤에 중지한 항목도 그 달에는 보여야 한다. 이번 달 화면(홈·정기지출·사이드바 배지)은 리팩터 뒤에도 그대로여야 한다 (Task 2, 기존 E2E `recurring-home.spec.ts` 재실행).

---

## File Structure

| 파일 | 할 일 |
| --- | --- |
| `lib/calc/report.ts` (새) + `lib/calc/report.test.ts` | 결산 계산: 보여줄 달, 제목, 만든 날, 남은 돈, 지난달 전체 비교, 큰 지출 5건, 넘은 예산 문구, 목표, 순자산 변화, 안 낸 정기지출 |
| `lib/recurring.ts` (수정) | `getRecurringForMonth(month)` 떼어 내기, `getRecurringOverview`는 이를 이번 달로 부름 |
| `app/globals.css` (수정) | `@page` A4·여백, 인쇄 때 바탕색 |
| `app/(app)/layout.tsx` (수정) | 인쇄 때 틀 높이·넘침 풀기 |
| `components/layout/Sidebar.tsx`, `MobileTabBar.tsx`, `PageHeader.tsx`, `components/realtime/OfflineBanner.tsx`, `components/ui/Toast.tsx` (수정) | 인쇄 때 숨김 |
| `components/report/print.tsx` (새) | `PrintSetup`(인쇄 중 라이트·제목), `PrintButton`(`PDF로 저장`) |
| `components/report/ReportHeader.tsx` (새) | 인쇄용 큰 제목, 기간·만든 날, 진행 중 배지, 버튼 |
| `components/report/MoneyFlowSection.tsx` (새) | 돈 흐름 |
| `components/report/CategoryBudgetSection.tsx` (새) | 카테고리·예산 + 큰 지출 5건 |
| `components/report/RecurringSection.tsx` (새) | 정기지출 |
| `components/report/AssetGoalSection.tsx` (새) | 자산·목표 |
| `components/stats/MonthlyChart.tsx` (수정) | "표로 보기"는 인쇄에서 숨김 |
| `app/(app)/stats/report/page.tsx` (새) | 결산 화면 (데이터 읽기·조립) |
| `app/(app)/stats/page.tsx` (수정) | 머리에 `월말 결산` 링크 |
| `e2e/report.spec.ts` (새) | 들어가기·다섯 부분·인쇄 호출·인쇄 모양 |
| `spec/budget-stats.md`, `docs/history/2026-10-01.md`, `docs/phone-checklist.md`, `docs/progress.md` (수정/새) | 기록 |

`/stats/report`는 `/stats` 아래라 로딩 중에는 `app/(app)/stats/loading.tsx`(통계 뼈대)가 그대로 보인다. 새 뼈대는 만들지 않는다.

---

### Task 1: 결산 계산 `lib/calc/report.ts`

**Files:**
- Create: `lib/calc/report.ts`
- Test: `lib/calc/report.test.ts`

**Interfaces:**
- Consumes: `goalProgress`, `netWorthOn`, `HistoryAsset`, `HistoryValue` (`lib/calc/assets.ts`), `overText`, `SpendBudgetRow` (`lib/calc/budget.ts`), `DayTotal` (`lib/calc/group.ts`), `CategoryStat` (`lib/calc/stats.ts`), `addDays`, `formatMonthLabel`, `shiftMonth`, `DateRange`, `DateString`, `MonthString` (`lib/date.ts`), `formatWon` (`lib/money.ts`).
- Produces:
  - `reportMonth(param: string | undefined, current: MonthString): MonthString`
  - `reportTitle(month: MonthString): string` → `"감자밭 2026년 9월 결산"`
  - `madeOnText(today: DateString): string` → `"10월 1일에 만들었어요"`
  - `balanceText(totals: DayTotal): string`
  - `compareWithLastPeriod(thisExpense: number, lastExpense: number): string`
  - `topExpenses<T extends { type: string; amount: number; occurredOn: DateString }>(rows: readonly T[], count?: number): T[]`
  - `overBudgetTexts(categories: readonly CategoryStat[], spend: readonly SpendBudgetRow[], categoryName: (id: string) => string): string[]`
  - `type ReportGoal = { id: string; name: string; targetAmount: number; saved: number; percent: number; addedThisPeriod: number }`
  - `reportGoals(goals: readonly GoalInput[], range: DateRange): ReportGoal[]` (GoalInput = `{ id; name; targetAmount; isDone; contributions: readonly { amount; contributedOn }[] }`, `GoalItem`과 맞음)
  - `type NetWorthChange = { net: number; diff: number }`
  - `netWorthChange(history: { assets: readonly HistoryAsset[]; values: readonly HistoryValue[] }, range: DateRange, today: DateString): NetWorthChange | null`
  - `netWorthDiffText(diff: number): string`
  - `unpaidNames(rows: readonly { item: { name: string }; paidAmount: number | null }[]): string[]`

- [ ] **Step 1: 실패하는 테스트 쓰기** — `lib/calc/report.test.ts`

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm test lib/calc/report.test.ts`
Expected: FAIL — `Failed to resolve import "./report"`

- [ ] **Step 3: 구현** — `lib/calc/report.ts`

```ts
/**
 * 월말 결산 계산 (F-25). 한 달을 둘이 같이 돌아보는 화면용.
 * 달은 한 달 기준(F-56)의 기간이다. 부르는 쪽이 기간(range)을 넘긴다.
 */
import { addDays, formatMonthLabel, shiftMonth, type DateRange, type DateString, type MonthString } from "@/lib/date";
import { formatWon } from "@/lib/money";
import { goalProgress, netWorthOn, type HistoryAsset, type HistoryValue } from "./assets";
import { overText, type SpendBudgetRow } from "./budget";
import type { DayTotal } from "./group";
import type { CategoryStat } from "./stats";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 주소의 month → 보여줄 달. 없거나 형식이 틀리거나 이번 달보다 뒤면 지난달(가장 최근에 끝난 달) */
export function reportMonth(param: string | undefined, current: MonthString): MonthString {
  if (param && MONTH.test(param) && param <= current) return param;
  return shiftMonth(current, -1);
}

/** "감자밭 2026년 9월 결산" (인쇄할 때 파일 이름으로 제안된다) */
export function reportTitle(month: MonthString): string {
  return `감자밭 ${formatMonthLabel(month)} 결산`;
}

/** "10월 1일에 만들었어요" */
export function madeOnText(today: DateString): string {
  return `${Number(today.slice(5, 7))}월 ${Number(today.slice(8, 10))}일에 만들었어요`;
}

/** 남은 돈(수입 − 지출): "500,000원 남았어요" / "30,000원 더 썼어요" */
export function balanceText(totals: DayTotal): string {
  const diff = totals.income - totals.expense;
  if (diff === 0) return "수입과 지출이 같아요";
  return diff > 0 ? `${formatWon(diff)} 남았어요` : `${formatWon(-diff)} 더 썼어요`;
}

/** 끝난 달끼리라 "같은 기간"이 아니라 지난달 전체와 비교한다 */
export function compareWithLastPeriod(thisExpense: number, lastExpense: number): string {
  const diff = thisExpense - lastExpense;
  if (diff === 0) return "지난달과 똑같이 썼어요";
  return `지난달보다 ${formatWon(Math.abs(diff))} ${diff < 0 ? "적게" : "많이"} 썼어요`;
}

/** 가장 크게 쓴 지출 n건: 금액 큰 순, 같으면 날짜 빠른 순 */
export function topExpenses<T extends { type: string; amount: number; occurredOn: DateString }>(
  rows: readonly T[],
  count = 5,
): T[] {
  return rows
    .filter((r) => r.type === "expense")
    .sort((a, b) => b.amount - a.amount || (a.occurredOn < b.occurredOn ? -1 : a.occurredOn > b.occurredOn ? 1 : 0))
    .slice(0, count);
}

/** 넘은 예산 문구 모음 (F-22 문구): 카테고리 예산 먼저, 그다음 통장·카드 예산 */
export function overBudgetTexts(
  categories: readonly CategoryStat[],
  spend: readonly SpendBudgetRow[],
  categoryName: (id: string) => string,
): string[] {
  return [
    ...categories.filter((c) => c.overBy > 0).map((c) => overText(categoryName(c.categoryId), c.overBy)),
    ...spend.filter((s) => s.over).map((s) => overText(s.name, s.overBy)),
  ];
}

export type ReportGoal = {
  id: string;
  name: string;
  targetAmount: number;
  /** 기간 마지막 날까지 모은 금액 */
  saved: number;
  percent: number;
  /** 그 기간에 적립한 금액 */
  addedThisPeriod: number;
};

type GoalInput = {
  id: string;
  name: string;
  targetAmount: number;
  isDone: boolean;
  contributions: readonly { amount: number; contributedOn: DateString }[];
};

/** 결산에 보일 목표: 끝나지 않은 목표 + 그 기간에 적립이 있는 목표. 진행률은 기간 마지막 날까지 모은 금액 기준 */
export function reportGoals(goals: readonly GoalInput[], range: DateRange): ReportGoal[] {
  return goals.flatMap((g) => {
    const sum = (from: DateString | null) =>
      g.contributions
        .filter((c) => c.contributedOn <= range.end && (from === null || c.contributedOn >= from))
        .reduce((s, c) => s + c.amount, 0);
    const added = sum(range.start);
    if (g.isDone && added === 0) return [];
    const saved = sum(null);
    return [
      {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        saved,
        percent: goalProgress(g.targetAmount, saved, null, range.end).percent,
        addedThisPeriod: added,
      },
    ];
  });
}

export type NetWorthChange = { net: number; diff: number };

/**
 * 기간 마지막 날 기준 순자산(진행 중인 달이면 오늘 기준)과 지난 기간 마지막 날 대비 변화 (F-41과 같은 계산).
 * 금액 기록이 하나도 없으면 null.
 */
export function netWorthChange(
  history: { assets: readonly HistoryAsset[]; values: readonly HistoryValue[] },
  range: DateRange,
  today: DateString,
): NetWorthChange | null {
  if (history.values.length === 0) return null;
  const end = range.end < today ? range.end : today;
  const net = netWorthOn(end, history.assets, history.values);
  const before = netWorthOn(addDays(range.start, -1), history.assets, history.values);
  return { net, diff: net - before };
}

/** "지난달보다 500,000원 늘었어요" / "…줄었어요" / "지난달과 같아요" */
export function netWorthDiffText(diff: number): string {
  if (diff === 0) return "지난달과 같아요";
  return `지난달보다 ${formatWon(Math.abs(diff))} ${diff > 0 ? "늘었어요" : "줄었어요"}`;
}

/** 그 달에 안 낸 정기지출 이름 */
export function unpaidNames(rows: readonly { item: { name: string }; paidAmount: number | null }[]): string[] {
  return rows.filter((r) => r.paidAmount === null).map((r) => r.item.name);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test lib/calc/report.test.ts`
Expected: PASS (모든 테스트)

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/report.ts lib/calc/report.test.ts
git commit -m "월말 결산 계산 함수와 테스트 (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 아무 달이나 정기지출 현황 읽기 `getRecurringForMonth`

**Files:**
- Modify: `lib/recurring.ts` (`getRecurringOverview` 전체, 53~127행)

**Interfaces:**
- Consumes: `getPeriodConfig`, `getCurrentPeriod` (`lib/period.ts`), `periodRange` (`lib/calc/period.ts`).
- Produces: `getRecurringForMonth(month: MonthString): Promise<RecurringOverview>` (React `cache`). `getRecurringOverview()`는 이름·반환값 그대로.

- [ ] **Step 1: 리팩터** — `lib/recurring.ts`

import 줄에 추가:

```ts
import { periodRange } from "./calc/period";
import { getCurrentPeriod, getPeriodConfig } from "./period";
```

(기존 `import { getCurrentPeriod } from "./period";`는 위 줄로 바꾼다.)

`export const getRecurringOverview = cache(async (): Promise<RecurringOverview> => {` 부터 함수 끝 `});`까지를 아래로 바꾼다. 본문(조회·`rows` 계산·반환)은 그대로 두고, 맨 앞 `const { month, range } = await getCurrentPeriod();` 한 줄만 `month` 인자와 `periodRange`로 바뀐다.

```ts
/**
 * 그 달 정기지출 현황 (월말 결산 F-25는 지난달도 본다).
 * 달은 한 달 기준(F-56)의 기간이고, 결제일은 그 기간 안의 날짜다.
 * 상태(○일 지남 등)는 오늘 기준이라 지난 달의 안 낸 항목은 "○일 지남"이 된다.
 */
export const getRecurringForMonth = cache(async (month: MonthString): Promise<RecurringOverview> => {
  const range = periodRange(month, await getPeriodConfig());
  const today = todayKST();
  const monthFirst = `${month}-01`;
  const supabase = await createClient();

  // ── 여기부터 반환까지는 원래 getRecurringOverview 본문 그대로 ──
  const [itemsRes, paidRes] = await Promise.all([
    supabase
      .from("recurring_items")
      .select(
        "id, name, amount, day_of_month, category_id, scope, member_slot, payment_method_id, is_variable, has_variable_date, start_month, end_month",
      )
      .order("day_of_month")
      .order("created_at"),
    supabase
      .from("transactions")
      .select("recurring_item_id, recurring_month, amount")
      .not("recurring_item_id", "is", null)
      .is("deleted_at", null)
      .lte("recurring_month", monthFirst)
      .order("recurring_month", { ascending: false }),
  ]);
  if (itemsRes.error) throw new Error(`정기지출을 불러오지 못했어요: ${itemsRes.error.message}`);
  if (paidRes.error) throw new Error(`정기지출 납부 기록을 불러오지 못했어요: ${paidRes.error.message}`);

  const items: RecurringItem[] = itemsRes.data.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    dayOfMonth: r.day_of_month,
    categoryId: r.category_id,
    scope: toScope(r.scope),
    memberSlot: toSlot(r.member_slot),
    paymentMethodId: r.payment_method_id,
    isVariable: r.is_variable,
    hasVariableDate: r.has_variable_date,
    startMonth: r.start_month,
    endMonth: r.end_month,
  }));

  const rows = items
    .filter((item) => isActiveInMonth(item, month))
    .map((item): MonthlyRecurring => {
      const payments = paidRes.data.filter((p) => p.recurring_item_id === item.id);
      const thisMonth = payments.find((p) => p.recurring_month === monthFirst);
      const previous = payments.find((p) => p.recurring_month !== monthFirst);
      const due = dueDateInRange(range, item.dayOfMonth);
      return {
        item,
        due,
        status: recurringStatus(due, today, Boolean(thisMonth)),
        paidAmount: thisMonth?.amount ?? null,
        expectedAmount: item.isVariable ? (previous?.amount ?? item.amount) : item.amount,
      };
    })
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));

  return {
    month,
    rows,
    summary: summarize(rows),
    dueUnpaid: dueUnpaidCount(rows.map((r) => r.status)),
    items,
  };
});

/** 이번 달 정기지출 현황. 레이아웃(배지)·홈·정기지출 화면이 같이 쓴다 */
export const getRecurringOverview = cache(
  async (): Promise<RecurringOverview> => getRecurringForMonth((await getCurrentPeriod()).month),
);
```

(`// ── 여기부터 …` 주석 줄은 넣지 않는다. 계획 읽는 사람용 표시다.)

- [ ] **Step 2: 타입·린트·단위 테스트**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 모두 통과 (오류 0)

- [ ] **Step 3: 이번 달 화면이 그대로인지 E2E** (3000번 dev 서버를 먼저 멈춘다)

Run: `pnpm test:e2e e2e/recurring-home.spec.ts`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add lib/recurring.ts
git commit -m "정기지출 현황을 아무 달이나 읽게 나누기 (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 인쇄 준비 (앱 틀 숨김, A4, 인쇄 중 라이트·제목)

**Files:**
- Modify: `app/globals.css` (파일 끝에 추가)
- Modify: `app/(app)/layout.tsx` (틀 `div`와 `main`의 className)
- Modify: `components/layout/Sidebar.tsx` (`<aside className=…>`), `components/layout/MobileTabBar.tsx` (추가 `button`과 `nav`), `components/layout/PageHeader.tsx` (`<header className=…>`), `components/realtime/OfflineBanner.tsx` (`div role="status"`), `components/ui/Toast.tsx` (`fixed … z-[60]` 감싸는 `div`)
- Create: `components/report/print.tsx`

**Interfaces:**
- Produces: `PrintSetup({ title }: { title: string }): null` (클라이언트), `PrintButton(): JSX.Element` (클라이언트, 이름 `PDF로 저장`).

- [ ] **Step 1: A4·여백·바탕** — `app/globals.css` 끝에 추가

```css
/* 인쇄 (월말 결산 F-25): A4 세로, 여백 12mm. 바탕은 종이처럼 카드 색으로 (잉크 절약) */
@page {
  size: A4 portrait;
  margin: 12mm;
}

@media print {
  body {
    background-color: var(--surface-raised);
  }
}
```

- [ ] **Step 2: 틀 높이·넘침 풀기** — `app/(app)/layout.tsx`

```tsx
              <div className="lg:flex lg:h-dvh print:block! print:h-auto!">
                <Sidebar {...sidebar} initialCollapsed={sidebarCollapsed} />
                <main className="min-w-0 flex-1 pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:overflow-y-auto lg:pb-10 print:overflow-visible! print:pb-0!">
```

- [ ] **Step 3: 인쇄 때 숨김** — 각 파일 className 끝에 `print:hidden!` 추가

`components/layout/Sidebar.tsx`:
```tsx
      className={`hidden h-dvh shrink-0 flex-col border-r border-line bg-surface-raised lg:flex print:hidden! ${collapsed ? "w-16" : "w-[248px]"}`}
```

`components/layout/MobileTabBar.tsx` — 추가 버튼과 탭바 `nav` 둘 다:
```tsx
        className="fixed right-5 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float transition-colors hover:bg-primary/90 lg:hidden print:hidden!"
```
```tsx
        className="fixed inset-x-0 bottom-0 z-30 bg-surface-raised pb-[env(safe-area-inset-bottom,0px)] shadow-float lg:hidden print:hidden!"
```

`components/layout/PageHeader.tsx`:
```tsx
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:top-0 lg:px-8 print:hidden!">
```

`components/realtime/OfflineBanner.tsx`:
```tsx
      className="flex items-center gap-2 bg-primary-soft px-5 py-2 text-caption text-ink lg:px-8 print:hidden!"
```

`components/ui/Toast.tsx` — 38행 `className="pointer-events-none fixed inset-x-0 …"` 끝에 ` print:hidden!` 추가.

- [ ] **Step 4: 인쇄 부품** — `components/report/print.tsx`

```tsx
"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * 인쇄하는 동안만 (F-25): 다크 모드여도 라이트 토큰으로 찍고, 문서 제목을 파일 이름으로 쓰게 바꾼다.
 * 브라우저 메뉴(Ctrl+P)로 인쇄해도 같도록 버튼이 아니라 beforeprint/afterprint에서 한다.
 * 끝나면 원래 화면 모드(속성 없음 = 시스템 설정)와 제목으로 되돌린다.
 */
export function PrintSetup({ title }: { title: string }) {
  useEffect(() => {
    const root = document.documentElement;
    let saved: { theme: string | undefined; title: string } | null = null;
    const before = () => {
      if (saved) return;
      saved = { theme: root.dataset.theme, title: document.title };
      root.dataset.theme = "light";
      document.title = title;
    };
    const after = () => {
      if (!saved) return;
      if (saved.theme === undefined) delete root.dataset.theme;
      else root.dataset.theme = saved.theme;
      document.title = saved.title;
      saved = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      after();
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [title]);
  return null;
}

/** 인쇄 창을 연다. 인쇄 창에서 "PDF로 저장"을 고르면 파일이 된다 */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="h-10 px-4 print:hidden!">
      <Printer size={18} strokeWidth={1.75} aria-hidden />
      PDF로 저장
    </Button>
  );
}
```

- [ ] **Step 5: 확인**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 모두 통과. (화면 확인은 Task 4 뒤 결산 화면에서 한꺼번에)

- [ ] **Step 6: 커밋**

```bash
git add app/globals.css "app/(app)/layout.tsx" components/layout/Sidebar.tsx components/layout/MobileTabBar.tsx components/layout/PageHeader.tsx components/realtime/OfflineBanner.tsx components/ui/Toast.tsx components/report/print.tsx
git commit -m "인쇄할 때 앱 틀 숨기고 A4·라이트로 찍기 (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 결산 화면 `/stats/report` + 통계 화면 링크

**Files:**
- Create: `components/report/ReportHeader.tsx`, `components/report/MoneyFlowSection.tsx`, `components/report/CategoryBudgetSection.tsx`, `components/report/RecurringSection.tsx`, `components/report/AssetGoalSection.tsx`
- Create: `app/(app)/stats/report/page.tsx`
- Modify: `app/(app)/stats/page.tsx` (`PageHeader`에 `actions`)
- Modify: `components/stats/MonthlyChart.tsx` (`<details className="mt-2">`)

**Interfaces:**
- Consumes: Task 1 함수 전부, Task 2 `getRecurringForMonth`, Task 3 `PrintSetup`/`PrintButton`. 기존: `SettingsSection`, `SplitBar`, `MonthlyChart`, `CategoryStatsTable`, `SpendBudgetList`(`components/budget/BudgetParts.tsx`), `AssetCompositionChart`, `assetComposition`, `categoryStats`, `monthlyExpense`, `recentMonths`, `unbudgetedFixedTotal`, `spendBudgetRows`, `splitByOwner`, `sumTotals`, `summaryText`, `periodOf`, `periodRange`, `isCalendarRange`, `formatPeriodRange`, `getAssetsOverview`, `getMonthBudgets`, `getSpendBudgets`, `getLabelMaps`, `getTransactionsInRange`, `getHouseholdMembers`, `toMemberNames`, `requireMember`, `getPeriodConfig`.
- Produces: 화면. 부분 제목(heading)은 `돈 흐름`, `카테고리·예산`, `정기지출`, `자산·목표` (E2E가 이 이름을 쓴다). 달 이동 링크 이름 `이전 달`/`다음 달`, 통계 화면 링크 이름 `월말 결산`.

- [ ] **Step 1: 머리** — `components/report/ReportHeader.tsx`

```tsx
import { formatPeriodRange, isCalendarRange } from "@/lib/calc/period";
import { madeOnText } from "@/lib/calc/report";
import type { DateRange, DateString } from "@/lib/date";
import { PrintButton } from "./print";

type Props = { title: string; range: DateRange; inProgress: boolean; today: DateString };

/** 결산 머리 (F-25): 인쇄할 때만 큰 제목(화면은 위 머리줄에 있음), 기간·만든 날, 진행 중 배지, PDF로 저장 */
export function ReportHeader({ title, range, inProgress, today }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="hidden text-title text-ink print:block">{title}</p>
        <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted tabular-nums">
          {isCalendarRange(range) ? null : <span>{formatPeriodRange(range)}</span>}
          <span>{madeOnText(today)}</span>
          {inProgress ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-label text-primary">진행 중</span> : null}
        </p>
      </div>
      <PrintButton />
    </div>
  );
}
```

- [ ] **Step 2: 돈 흐름** — `components/report/MoneyFlowSection.tsx`

```tsx
import { SplitBar } from "@/components/dashboard/SplitBar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { MonthlyChart } from "@/components/stats/MonthlyChart";
import type { Split } from "@/lib/calc/dashboard";
import type { DayTotal } from "@/lib/calc/group";
import { balanceText } from "@/lib/calc/report";
import type { MonthString } from "@/lib/date";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";

type Props = {
  totals: DayTotal;
  compareText: string;
  split: Split;
  names: MemberNames;
  chart: { month: MonthString; expense: number }[];
  /** 진행 중인 달 (그래프에 "진행 중" 표시) */
  currentMonth: MonthString;
};

/** 돈 흐름 (F-25): 수입·지출·남은 돈, 지난달 전체 비교, 공동/각자 비율, 최근 6개월 지출 */
export function MoneyFlowSection({ totals, compareText, split, names, chart, currentMonth }: Props) {
  const empty = totals.income === 0 && totals.expense === 0;
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="돈 흐름">
        {empty ? (
          <p className="text-body text-ink-muted">이 달에는 기록이 없어요.</p>
        ) : (
          <>
            <dl className="flex flex-col gap-2 tabular-nums">
              <div className="flex items-center justify-between">
                <dt className="text-body text-ink-muted">수입</dt>
                <dd className="text-amount text-income">+{formatWon(totals.income)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-body text-ink-muted">지출</dt>
                <dd className="text-amount text-expense">
                  {totals.expense > 0 ? "−" : ""}
                  {formatWon(totals.expense)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <dt className="text-body text-ink">남은 돈</dt>
                <dd className="text-amount text-ink">{balanceText(totals)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-caption text-ink-muted tabular-nums">{compareText}</p>
            <div className="mt-5">
              <SplitBar split={split} names={names} />
            </div>
          </>
        )}
        <h3 className="mt-6 mb-2 text-label text-ink-muted">최근 6개월 지출</h3>
        <MonthlyChart data={chart} currentMonth={currentMonth} />
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 3: 카테고리·예산** — `components/report/CategoryBudgetSection.tsx`

```tsx
import { SpendBudgetList } from "@/components/budget/BudgetParts";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { CategoryStatsTable } from "@/components/stats/CategoryStatsTable";
import type { SpendBudgetRow } from "@/lib/calc/budget";
import type { CategoryStat } from "@/lib/calc/stats";
import type { MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import type { LabelMaps, TransactionRecord } from "@/lib/transactions";

type Props = {
  stats: CategoryStat[];
  categories: LabelMaps["categories"];
  spend: SpendBudgetRow[];
  overTexts: string[];
  top: TransactionRecord[];
  names: MemberNames;
};

/** "9/14" */
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 카테고리·예산 (F-25): 넘은 예산 문장, 카테고리별 표, 통장·카드 예산, 가장 크게 쓴 5건 */
export function CategoryBudgetSection({ stats, categories, spend, overTexts, top, names }: Props) {
  const who = (r: TransactionRecord) => (r.scope === "joint" ? "공동" : (names[r.memberSlot] ?? "개인"));
  return (
    <SettingsSection title="카테고리·예산">
      {overTexts.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-1 break-inside-avoid">
          {overTexts.map((text, i) => (
            <li key={i} className="text-body text-danger">
              {text}
            </li>
          ))}
        </ul>
      ) : null}
      <CategoryStatsTable stats={stats} categories={categories} />
      {spend.length > 0 ? (
        <div className="mt-6 break-inside-avoid">
          <h3 className="mb-3 text-label text-ink-muted">통장·카드 예산</h3>
          <SpendBudgetList rows={spend} />
        </div>
      ) : null}
      {top.length > 0 ? (
        <div className="mt-6 break-inside-avoid">
          <h3 className="mb-2 text-label text-ink-muted">가장 크게 쓴 내역</h3>
          <ol className="divide-y divide-line">
            {top.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-body tabular-nums">
                <span className="w-10 shrink-0 text-caption text-ink-muted">{shortDate(r.occurredOn)}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.merchant ?? categories[r.categoryId]?.name ?? "내역"}</span>
                <span className="shrink-0 text-caption text-ink-muted">{who(r)}</span>
                <span className="shrink-0 text-amount text-expense">{formatWon(r.amount)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </SettingsSection>
  );
}
```

(이 부분은 길어질 수 있어 통째로 `break-inside-avoid`를 걸지 않는다. 한 장보다 길면 브라우저가 무시하고, 짧아도 빈 반쪽이 생긴다. 작은 묶음에만 건다.)

- [ ] **Step 4: 정기지출** — `components/report/RecurringSection.tsx`

```tsx
import Link from "next/link";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { summaryText } from "@/lib/calc/recurring";
import { unpaidNames } from "@/lib/calc/report";
import { formatWon } from "@/lib/money";
import type { RecurringOverview } from "@/lib/recurring";

type Props = { overview: RecurringOverview; fixedTotal: number; inProgress: boolean };

/** 정기지출 (F-25): 그 달 납부 요약, 안 낸 항목, 예산 없는 고정지출 */
export function RecurringSection({ overview, fixedTotal, inProgress }: Props) {
  const unpaid = unpaidNames(overview.rows);
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="정기지출">
        {overview.summary.total === 0 ? (
          <p className="text-body text-ink-muted">
            이 달에는 정기지출이 없어요.{" "}
            <Link href="/recurring" className="font-semibold text-primary underline-offset-4 hover:underline print:hidden">
              정기지출 관리
            </Link>
          </p>
        ) : (
          <p className="text-body text-ink tabular-nums">{summaryText(overview.summary)}</p>
        )}
        {unpaid.length > 0 ? (
          <p className="mt-2 text-body text-ink-muted">
            {inProgress ? "아직 안 낸 항목" : "안 낸 항목"}: {unpaid.join(", ")}
          </p>
        ) : null}
        {fixedTotal > 0 ? (
          <p className="mt-2 text-body text-ink tabular-nums">예산 없는 고정지출 {formatWon(fixedTotal)}</p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 5: 자산·목표** — `components/report/AssetGoalSection.tsx`

```tsx
import Link from "next/link";
import { AssetCompositionChart } from "@/components/assets/AssetCompositionChart";
import { SettingsSection } from "@/components/settings/SettingsSection";
import type { CompositionPart } from "@/lib/calc/assets";
import { netWorthDiffText, type NetWorthChange, type ReportGoal } from "@/lib/calc/report";
import { formatWon } from "@/lib/money";

type Props = { change: NetWorthChange | null; composition: CompositionPart[]; goals: ReportGoal[] };

/** 자산·목표 (F-25): 기간 끝 순자산과 지난달 대비, 자산 구성(지금 금액), 목표 진행률·그 달 적립 */
export function AssetGoalSection({ change, composition, goals }: Props) {
  return (
    <div className="break-inside-avoid">
      <SettingsSection title="자산·목표">
        {change === null && goals.length === 0 ? (
          <p className="text-body text-ink-muted">
            자산과 목표를 아직 적지 않았어요.{" "}
            <Link href="/assets" className="font-semibold text-primary underline-offset-4 hover:underline print:hidden">
              자산·목표
            </Link>
          </p>
        ) : null}
        {change ? (
          <div>
            <p className="text-caption text-ink-muted">순자산</p>
            <p className="text-amount-hero text-ink tabular-nums">{formatWon(change.net)}</p>
            <p className="mt-1 text-caption text-ink-muted tabular-nums">{netWorthDiffText(change.diff)}</p>
          </div>
        ) : null}
        {composition.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-2 text-label text-ink-muted">지금 자산 구성</h3>
            <AssetCompositionChart parts={composition} />
          </div>
        ) : null}
        {goals.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-2 text-label text-ink-muted">저축 목표</h3>
            <ul className="flex flex-col gap-3">
              {goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex justify-between gap-2 text-body tabular-nums">
                    <span className="min-w-0 truncate text-ink">{g.name}</span>
                    <span className="shrink-0 text-caption text-ink-muted">
                      {formatWon(g.saved)} / {formatWon(g.targetAmount)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${g.name} 진행률`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={g.percent}
                    className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${g.percent}%` }} />
                  </div>
                  <p className="mt-1 text-caption text-ink-muted tabular-nums">
                    {g.percent}% · {g.addedThisPeriod > 0 ? `이 달 ${formatWon(g.addedThisPeriod)} 모았어요` : "이 달 적립 없음"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 6: 페이지** — `app/(app)/stats/report/page.tsx`

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssetGoalSection } from "@/components/report/AssetGoalSection";
import { CategoryBudgetSection } from "@/components/report/CategoryBudgetSection";
import { MoneyFlowSection } from "@/components/report/MoneyFlowSection";
import { PrintSetup } from "@/components/report/print";
import { RecurringSection } from "@/components/report/RecurringSection";
import { ReportHeader } from "@/components/report/ReportHeader";
import { getAssetsOverview } from "@/lib/assets";
import { getMonthBudgets, getSpendBudgets } from "@/lib/budget";
import { assetComposition } from "@/lib/calc/assets";
import { spendBudgetRows } from "@/lib/calc/budget";
import { splitByOwner } from "@/lib/calc/dashboard";
import { sumTotals } from "@/lib/calc/group";
import { periodOf, periodRange } from "@/lib/calc/period";
import {
  compareWithLastPeriod,
  netWorthChange,
  overBudgetTexts,
  reportGoals,
  reportMonth,
  reportTitle,
  topExpenses,
} from "@/lib/calc/report";
import { categoryStats, monthlyExpense, recentMonths, unbudgetedFixedTotal } from "@/lib/calc/stats";
import { formatMonthLabel, shiftMonth, todayKST, type MonthString } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getPeriodConfig } from "@/lib/period";
import { getRecurringForMonth } from "@/lib/recurring";
import { getLabelMaps, getTransactionsInRange } from "@/lib/transactions";

export const metadata: Metadata = { title: "월말 결산 · 감자밭" };

/**
 * 월말 결산 (F-25): 한 달을 둘이 같이 돌아보는 화면. 처음엔 지난달(가장 최근에 끝난 달).
 * 달은 한 달 기준(F-56)의 기간, 사람 필터 없이 가구 전체. `PDF로 저장`은 브라우저 인쇄 창을 연다.
 */
export default async function ReportPage({ searchParams }: PageProps<"/stats/report">) {
  await requireMember();
  const cfg = await getPeriodConfig();
  const today = todayKST();
  const current = periodOf(today, cfg);
  const param = (await searchParams).month;
  const month = reportMonth(typeof param === "string" ? param : undefined, current);
  const range = periodRange(month, cfg);
  const months = recentMonths(month, 6);
  const inPeriod = (date: string) => periodOf(date, cfg);

  const [rows, budgets, spendBudgets, recurring, assets, labels, members] = await Promise.all([
    getTransactionsInRange({ start: periodRange(months[0], cfg).start, end: range.end }),
    getMonthBudgets(month),
    getSpendBudgets(month),
    getRecurringForMonth(month),
    getAssetsOverview(),
    getLabelMaps(),
    getHouseholdMembers(),
  ]);
  const names = toMemberNames(members);
  const thisMonth = rows.filter((r) => inPeriod(r.occurredOn) === month);
  const lastMonth = rows.filter((r) => inPeriod(r.occurredOn) === shiftMonth(month, -1));
  const totals = sumTotals(thisMonth);
  const categories = categoryStats(thisMonth, lastMonth, budgets);
  const spend = spendBudgetRows(spendBudgets, thisMonth);
  const categoryName = (id: string) => labels.categories[id]?.name ?? "카테고리";
  const title = reportTitle(month);

  const nav = (target: MonthString, label: "이전 달" | "다음 달") => (
    <Link
      href={`/stats/report?month=${target}`}
      aria-label={label}
      scroll={false}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-surface-sunken"
    >
      {label === "이전 달" ? (
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
      ) : (
        <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
      )}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={`${formatMonthLabel(month)} 결산`}
        titleStart={nav(shiftMonth(month, -1), "이전 달")}
        titleEnd={month < current ? nav(shiftMonth(month, 1), "다음 달") : null}
      />
      <PrintSetup title={title} />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-5 py-6 print:p-0">
        <ReportHeader title={title} range={range} inProgress={month === current} today={today} />
        <MoneyFlowSection
          totals={totals}
          compareText={compareWithLastPeriod(totals.expense, sumTotals(lastMonth).expense)}
          split={splitByOwner(thisMonth)}
          names={names}
          chart={monthlyExpense(rows, months, inPeriod)}
          currentMonth={current}
        />
        <CategoryBudgetSection
          stats={categories}
          categories={labels.categories}
          spend={spend}
          overTexts={overBudgetTexts(categories, spend, categoryName)}
          top={topExpenses(thisMonth)}
          names={names}
        />
        <RecurringSection
          overview={recurring}
          fixedTotal={unbudgetedFixedTotal(thisMonth, budgets)}
          inProgress={month === current}
        />
        <AssetGoalSection
          change={netWorthChange(assets.history, range, today)}
          composition={assetComposition(assets.assets)}
          goals={reportGoals(assets.goals, range)}
        />
      </div>
    </>
  );
}
```

(`max-w-[680px]`: 화면과 인쇄에서 그래프 폭이 같도록 A4 본문 폭(약 703px)보다 조금 좁게 고정한다. 그래프는 인쇄 직전에 크기를 다시 재지 않으므로 이 폭이 중요하다.)

- [ ] **Step 7: 통계 화면에서 들어가는 길** — `app/(app)/stats/page.tsx`의 `<PageHeader … />`에 `actions` 추가 (`titleEnd={…}` 다음 줄)

```tsx
        actions={
          <Link
            href="/stats/report"
            className="inline-flex h-10 items-center rounded-md px-3 text-body font-semibold text-primary hover:bg-primary-soft"
          >
            월말 결산
          </Link>
        }
```

- [ ] **Step 8: "표로 보기"는 인쇄에서 숨김** — `components/stats/MonthlyChart.tsx`

```tsx
      <details className="mt-2 print:hidden">
```

- [ ] **Step 9: 확인**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 모두 통과. 각 새 컴포넌트 200줄 이하 (`wc -l components/report/*.tsx "app/(app)/stats/report/page.tsx"`).

- [ ] **Step 10: 커밋**

```bash
git add components/report "app/(app)/stats/report/page.tsx" "app/(app)/stats/page.tsx" components/stats/MonthlyChart.tsx
git commit -m "월말 결산 화면과 통계 화면 링크 (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: E2E `e2e/report.spec.ts`

**Files:**
- Create: `e2e/report.spec.ts`

**Interfaces:**
- Consumes: `login(page, slot, path)` (`e2e/support/login.ts`), Task 4의 이름들(`월말 결산`, `다음 달`, `PDF로 저장`, 부분 제목 4개, `진행 중`).

- [ ] **Step 1: 테스트 쓰기**

```ts
import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

async function addExpense(page: Page, opts: { amount: string; category: string; merchant: string }) {
  await page.getByRole("button", { name: "내역 추가" }).first().click();
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill(opts.amount);
  await panel.getByLabel("가맹점·내용 (선택)").fill(opts.merchant);
  await panel.getByRole("radio", { name: opts.category }).click();
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();
}

test("월말 결산: 통계에서 들어가 다섯 부분을 보고, PDF로 저장이 인쇄 창을 부른다 (F-25)", async ({ page }) => {
  // 실제 인쇄 창 대신 불렸는지만 표시
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printed = "1";
    };
  });
  await login(page, "a", "/");
  await addExpense(page, { amount: "987000", category: "쇼핑", merchant: "E2E 결산 큰 지출" });

  await page.goto("/stats");
  await page.getByRole("link", { name: "월말 결산" }).click();
  await expect(page).toHaveURL(/\/stats\/report$/);

  // 처음엔 지난달. 다음 달 = 이번 달(진행 중), 그보다 뒤로는 못 간다
  await page.getByRole("link", { name: "다음 달" }).click();
  await expect(page.getByText("진행 중", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "다음 달" })).toHaveCount(0);

  for (const name of ["돈 흐름", "카테고리·예산", "정기지출", "자산·목표"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("E2E 결산 큰 지출")).toBeVisible();

  await page.getByRole("button", { name: "PDF로 저장" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-printed", "1");
});

test("결산 인쇄: 다크 모드여도 라이트로, 제목은 파일 이름, 메뉴는 숨기고 메인은 잘리지 않음 (F-25)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page, "a", "/stats/report?month=2099-01"); // 미래 달 → 지난달로
  await expect(page.getByRole("heading", { name: "돈 흐름", exact: true })).toBeVisible();
  const html = page.locator("html");

  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle(/^감자밭 \d{4}년 \d{1,2}월 결산$/);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(html).not.toHaveAttribute("data-theme", "light");
  await expect(page).toHaveTitle("월말 결산 · 감자밭");

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("complementary")).toBeHidden();
  await expect(page.getByRole("button", { name: "PDF로 저장" })).toBeHidden();
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el).overflowY)).toBe("visible");
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el.parentElement!).height)).not.toBe("800px");
});
```

- [ ] **Step 2: 실행** (3000번 dev 서버를 먼저 멈춘다. 끝나면 `pnpm dev`를 다시 켠다)

Run: `pnpm test:e2e e2e/report.spec.ts`
Expected: 2 passed. 실패하면 trace(`test-results/`)로 원인을 보고 고친다. `main` 부모 높이 검사가 viewport(800px)와 같게 나오면 Task 3 Step 2의 `print:h-auto!`가 먹지 않은 것이다.

- [ ] **Step 3: 커밋**

```bash
git add e2e/report.spec.ts
git commit -m "월말 결산 E2E (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 화면 확인, 기록, PR

**Files:**
- Modify: `spec/budget-stats.md` (F-25 부분 제목 이름만 맞춤)
- Create/Modify: `docs/history/2026-10-01.md`, `docs/phone-checklist.md`, `docs/progress.md`

- [ ] **Step 1: 전체 검사**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: 모두 통과

- [ ] **Step 2: 화면 확인 (Aside 브라우저, `pnpm dev`, 실제 계정은 보기만)**
  - 웹 폭(1280)·폰 폭(390)에서 `/stats` → `월말 결산` → 지난달·이번 달·이전 달 이동, 다섯 부분, 빈 상태 문구.
  - 라이트·다크 화면 둘 다 색이 토큰대로인지.
  - 인쇄 미리보기(Ctrl+P): 사이드바·탭바·머리·버튼 없음, 라이트, A4에 여러 장으로 이어져 마지막 "자산·목표"까지 찍힘, 그래프가 잘리지 않음, 파일 이름 제안 "감자밭 2026년 9월 결산".
  - 문제가 있으면 고치고 해당 Task의 검사를 다시 돌린 뒤 따로 커밋한다.

- [ ] **Step 3: 스펙 이름 맞춤** — `spec/budget-stats.md` F-25의 `2. **이번 달 돈 흐름**`을 `2. **돈 흐름**`으로 (지난달 결산에서도 어색하지 않게 화면 제목을 "돈 흐름"으로 했다).

- [ ] **Step 4: 기록**
  - `docs/history/2026-10-01.md` 위쪽: 한 일(F-25 결산 화면·인쇄, 정기지출 아무 달 읽기), 확인한 것(검사·E2E·화면·인쇄 미리보기), 결정한 것(방법 1 브라우저 인쇄, 달 끝남 알림 뺌, 부분 제목 "돈 흐름", 자산 구성은 지금 금액 기준).
  - `docs/phone-checklist.md`에 추가:
    - `- [ ] 통계 → 월말 결산: 지난달이 먼저 열리고 다섯 부분이 보이는지`
    - `- [ ] 갤럭시 크롬: PDF로 저장 → 인쇄 창에서 "PDF로 저장" → 파일이 라이트·A4로 저장되는지`
    - `- [ ] 아이폰 홈 화면 앱: PDF로 저장을 누르면 인쇄 창이 뜨는지 (안 뜨면 사파리에서 열어 공유 → 프린트 → 확대해서 PDF 저장)`
  - `docs/progress.md`: "마지막 작업"을 F-25로, 남은 개선 후보에 "CSV 내보내기(F-52) 아직 없음 — 내역 외 데이터까지 넓힐지 사용자와 정하기"가 없으면 추가.

- [ ] **Step 5: 커밋**

```bash
git add spec/budget-stats.md docs/history/2026-10-01.md docs/phone-checklist.md docs/progress.md
git commit -m "월말 결산을 스펙·기록에 반영 (F-25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: PR과 합치기** (`gh`는 `"/c/Program Files/GitHub CLI/gh.exe"`, 합치기는 rebase + 브랜치 삭제. 배포 상태는 확인·보고하지 않는다)

```bash
git push -u origin feat/month-report
"/c/Program Files/GitHub CLI/gh.exe" pr create --title "월말 결산 화면과 PDF로 저장 (F-25)" --body "$(cat <<'EOF'
## 한 일
- 통계 → 월말 결산(`/stats/report`): 돈 흐름, 카테고리·예산, 정기지출, 자산·목표
- `PDF로 저장`: 브라우저 인쇄 창, 인쇄 중 라이트·A4·메뉴 숨김
- 정기지출 현황을 아무 달이나 읽도록 `getRecurringForMonth` 분리

## 확인
- pnpm lint / typecheck / test, e2e/report.spec.ts, e2e/recurring-home.spec.ts
- 웹·폰 폭 화면, 라이트·다크, 인쇄 미리보기

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
"/c/Program Files/GitHub CLI/gh.exe" pr merge --rebase --delete-branch
```
