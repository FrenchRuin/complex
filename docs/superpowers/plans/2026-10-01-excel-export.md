# 엑셀 내보내기(백업) (F-52) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 → `데이터 내보내기`에서 버튼 하나로 가구 데이터 전체(내역·정기지출·예산·자산·목표·대출)를 시트 11장짜리 엑셀 파일 `감자밭-백업-YYYY-MM-DD.xlsx`로 받는다.

**Architecture:** 읽기(`lib/export/read.ts`, RLS 그대로, 1000줄씩 끝까지) → 시트 만들기(`lib/calc/export-sheets.ts`, 라이브러리와 무관한 순수 함수) → 파일 만들기(`lib/export/xlsx.ts`, `write-excel-file/node`) → 내려주기(`app/api/export/route.ts`, GET, 저장 안 함). 화면은 설정 하위 화면 `/settings/export`의 일반 다운로드 링크.

**Tech Stack:** Next.js 16 route handler, Supabase(`@supabase/ssr`, 읽기만), `write-excel-file` 4.1.1(새 라이브러리, 사용자 승인 2026-10-01), Vitest, Playwright.

**Spec:** `spec/settings.md` F-52, `spec/rules.md` §8.3 (목차 `SPEC.md`, 라우트 `spec/layout.md`)

## Global Constraints

- 문구는 한국어 해요체, 짧게, 이모지·느낌표 없음. 버튼은 동작 그대로(`엑셀로 내보내기`).
- 금액은 원 단위 정수. 엑셀에서는 숫자 칸 + `#,##0` 서식. 날짜는 엑셀 날짜 칸 `yyyy-mm-dd`, 달은 글자 `2026-09`. 금리는 `rate_bp / 100`.
- 지운 항목(`deleted_at`)은 뺀다. 사람은 표시 이름(`ownerLabel`), 공동은 "공동", 없는 값은 빈칸, 예/아니요는 "예"/"아니요".
- 시트 이름·순서·열·정렬은 `spec/rules.md` §8.3 표 그대로.
- 오늘은 `todayKST()`. `new Date()`로 날짜 계산하지 않는다.
- DB 변경 없음. 읽기는 서버(route handler·서버 컴포넌트)에서만, 사용자 세션 + RLS. 서비스 키 쓰지 않는다.
- 새 라이브러리는 `write-excel-file` 4.1.1 하나, `package.json`에 버전 고정(`--save-exact`).
- 색은 토큰 클래스만, 아이콘 `lucide-react`(stroke 1.75). 컴포넌트 200줄 이하, `any` 금지.
- E2E 전에는 3000번 dev 서버를 멈추고 끝나면 다시 켠다(`run_in_background`, timeout 7200000). 실제 계정으로는 내려받기만(저장 동작 없음).
- 파일 편집은 Edit 도구(CRLF 파일 많음). 커밋 메시지 한국어 한 줄 + `(F-52)`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 한 커밋에 한 가지 일.

## Review Focus

1. **1000줄 넘는 표** — Supabase는 한 번에 1000줄까지만 준다. 몇 년 쓰면 내역이 1000건을 넘으므로 끝까지 이어 읽어야 백업에서 빠지는 내역이 없다 (Task 1 `fetchAll` 테스트: 2005줄, 딱 1000줄).
2. **엑셀 날짜가 하루 밀림** — 날짜를 그 지역 0시 `Date`로 넣으면 시간대에 따라 엑셀에서 전날로 보인다. UTC 0시로 넣어야 한다 (Task 3 `toLibraryCell` 테스트, Task 6 실제 파일의 일련번호 확인).
3. **한글 파일 이름 헤더** — `Content-Disposition`에 한글을 그대로 넣으면 응답이 실패할 수 있다. ASCII 대체 이름 + `filename*=UTF-8''…` (Task 4, Task 5 E2E `suggestedFilename`).
4. **로그인 안 한 요청·남의 가구** — `/api/export`는 로그인 검사(proxy)를 거쳐 로그인 화면으로 가고, 로그인해도 RLS로 내 가구만 읽힌다 (Task 5 E2E 비로그인 요청).
5. **지운·없는 참조** — 결제수단 없는 내역, 이름 없는 사람(초대 전), 지운 자산의 금액 기록, 지운 목표의 적립, 지운 통장·카드 예산의 금액이 오류 없이 빈칸·제외된다 (Task 2 테스트).

---

## File Structure

| 파일 | 할 일 |
| --- | --- |
| `lib/export/fetch-all.ts` (새) + 테스트 | 1000줄씩 끝까지 읽기 |
| `lib/calc/export-sheets.ts` (새) + 테스트 | `ExportData` → 시트 11장 (제목·열 너비·행), 파일 이름, 시트 이름 목록 |
| `lib/export/xlsx.ts` (새) + 테스트 | 시트 → `write-excel-file` 형식 → `.xlsx` Buffer |
| `package.json`, `pnpm-lock.yaml` (수정) | `write-excel-file` 4.1.1 |
| `lib/export/read.ts` (새) | DB → `ExportData` |
| `app/api/export/route.ts` (새) | GET: 로그인 확인 → 읽기 → 파일 → 내려주기 |
| `app/(app)/settings/export/page.tsx`, `loading.tsx` (새) | 데이터 내보내기 화면 |
| `app/(app)/settings/(menu)/page.tsx` (수정) | 메뉴 `데이터 내보내기` |
| `e2e/export.spec.ts` (새) | 받기·파일 형식·비로그인 |
| `docs/history/2026-10-01.md`, `docs/phone-checklist.md`, `docs/progress.md` (수정) | 기록 |

---

### Task 1: 1000줄씩 끝까지 읽기 `fetchAll`

**Files:**
- Create: `lib/export/fetch-all.ts`
- Test: `lib/export/fetch-all.test.ts`

**Interfaces:**
- Produces: `PAGE_SIZE = 1000`, `fetchAll<T>(what: string, page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]>`

- [ ] **Step 1: 실패하는 테스트** — `lib/export/fetch-all.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { fetchAll, PAGE_SIZE } from "./fetch-all";

const pager = (rows: number[], calls: [number, number][]) => async (from: number, to: number) => {
  calls.push([from, to]);
  return { data: rows.slice(from, to + 1), error: null };
};

describe("fetchAll", () => {
  it("1000줄 제한을 넘어도 끝까지 이어서 읽는다", async () => {
    const rows = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) => i);
    const calls: [number, number][] = [];
    expect(await fetchAll("내역", pager(rows, calls))).toEqual(rows);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });
  it("딱 1000줄이면 빈 쪽을 한 번 더 읽고 끝낸다", async () => {
    const rows = Array.from({ length: PAGE_SIZE }, (_, i) => i);
    const calls: [number, number][] = [];
    expect(await fetchAll("내역", pager(rows, calls))).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });
  it("오류면 무엇을 못 읽었는지와 원인을 담아 던진다", async () => {
    await expect(fetchAll("자산", async () => ({ data: null, error: { message: "권한 없음" } }))).rejects.toThrow(
      "자산을(를) 불러오지 못했어요: 권한 없음",
    );
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test lib/export/fetch-all.test.ts` · Expected: FAIL (`Cannot find module './fetch-all'`)

- [ ] **Step 3: 구현** — `lib/export/fetch-all.ts`

```ts
/** Supabase는 한 번에 최대 1000줄까지 준다. 내보내기(F-52)는 전체가 필요해 1000줄씩 이어서 읽는다 */
export const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/** page(from, to)는 `.order(…).range(from, to)`를 붙인 쿼리. 순서가 고정돼야 쪽이 겹치거나 빠지지 않는다 */
export async function fetchAll<T>(what: string, page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test lib/export/fetch-all.test.ts` · Expected: PASS (3)

- [ ] **Step 5: 커밋**

```bash
git add lib/export/fetch-all.ts lib/export/fetch-all.test.ts
git commit -m "내보내기용 1000줄씩 끝까지 읽기 (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 시트 만들기 `lib/calc/export-sheets.ts`

**Files:**
- Create: `lib/calc/export-sheets.ts`
- Test: `lib/calc/export-sheets.test.ts`

**Interfaces:**
- Consumes: `ownerLabel`, `SCOPE_LABEL`, `CATEGORY_TYPE_LABEL`, 타입 `CategoryType`/`MemberNames`/`Owner`/`Scope`/`Slot` (`lib/domain.ts`), `ASSET_KIND_LABEL`, `goalProgress`, `AssetKind` (`lib/calc/assets.ts`), `DEAL_LABEL`, `DEBT_KIND_LABEL`, `HOME_STATUS_LABEL`, `REGION_LABEL`, `Deal`/`DebtKind`/`HomeStatus`/`Region` (`lib/calc/loans.ts`), `DateString` (`lib/date.ts`).
- Produces:
  - `type ExportCell = { kind: "text"; value: string } | { kind: "money"; value: number } | { kind: "number"; value: number } | { kind: "date"; value: DateString } | null`
  - `type ExportColumn = { title: string; width: number }`, `type ExportSheet = { name: string; columns: ExportColumn[]; rows: ExportCell[][] }`
  - `type ExportData` (아래 코드 그대로 — Task 4 `readExportData`가 이 모양을 만든다)
  - `EXPORT_SHEET_NAMES` (11개, 순서 고정), `exportFileName(today: DateString): string`, `buildExportSheets(d: ExportData): ExportSheet[]`

- [ ] **Step 1: 실패하는 테스트** — `lib/calc/export-sheets.test.ts`

```ts
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
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test lib/calc/export-sheets.test.ts` · Expected: FAIL (`Cannot find module './export-sheets'`)

- [ ] **Step 3: 구현** — `lib/calc/export-sheets.ts`

```ts
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
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test lib/calc/export-sheets.test.ts` · Expected: PASS (9)

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/export-sheets.ts lib/calc/export-sheets.test.ts
git commit -m "엑셀 내보내기 시트 만들기와 테스트 (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 엑셀 파일 만들기 `lib/export/xlsx.ts` (+ 라이브러리 설치)

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add write-excel-file@4.1.1 --save-exact`)
- Create: `lib/export/xlsx.ts`
- Test: `lib/export/xlsx.test.ts`

**Interfaces:**
- Consumes: `ExportCell`, `ExportSheet` (Task 2).
- Produces: `toLibraryCell(cell: ExportCell): Cell`, `toLibrarySheets(sheets: readonly ExportSheet[])` (반환: `{ sheet, columns: { width }[], stickyRowsCount: 1, data }[]`), `buildXlsx(sheets: readonly ExportSheet[]): Promise<Buffer>`.
- 라이브러리 사실(4.1.1, `write-excel-file/node`): 여러 시트는 `writeXlsxFile([{ data, sheet, columns, stickyRowsCount }])`, 결과의 `.toBuffer(): Promise<Buffer>`. 셀은 `{ value, type: String|Number|Date, format, fontWeight: "bold" }`. 날짜는 `date.getTime() / 하루 + 25569`로 일련번호가 되므로 UTC 0시 `Date`를 넣어야 그날이 된다.

- [ ] **Step 1: 라이브러리 설치**

Run: `pnpm add write-excel-file@4.1.1 --save-exact`
Expected: `package.json` dependencies에 `"write-excel-file": "4.1.1"` (캐럿 없이)

- [ ] **Step 2: 실패하는 테스트** — `lib/export/xlsx.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildXlsx, toLibraryCell, toLibrarySheets } from "./xlsx";

describe("toLibraryCell", () => {
  it("글자·금액·숫자·빈칸", () => {
    expect(toLibraryCell({ kind: "text", value: "식비" })).toEqual({ value: "식비", type: String });
    expect(toLibraryCell({ kind: "money", value: 12000 })).toEqual({ value: 12000, type: Number, format: "#,##0" });
    expect(toLibraryCell({ kind: "number", value: 4.25 })).toEqual({ value: 4.25, type: Number });
    expect(toLibraryCell(null)).toBeNull();
  });
  it("날짜는 그날 UTC 0시라 엑셀에서 하루 밀리지 않는다", () => {
    expect(toLibraryCell({ kind: "date", value: "2026-09-02" })).toEqual({
      value: new Date(Date.UTC(2026, 8, 2)),
      type: Date,
      format: "yyyy-mm-dd",
    });
  });
});

describe("toLibrarySheets", () => {
  it("첫 줄은 굵은 제목이고 고정, 열 너비를 넘긴다", () => {
    const [s] = toLibrarySheets([
      { name: "내역", columns: [{ title: "날짜", width: 12 }, { title: "금액", width: 14 }], rows: [[null, { kind: "money", value: 5 }]] },
    ]);
    expect(s).toEqual({
      sheet: "내역",
      columns: [{ width: 12 }, { width: 14 }],
      stickyRowsCount: 1,
      data: [
        [
          { value: "날짜", fontWeight: "bold" },
          { value: "금액", fontWeight: "bold" },
        ],
        [null, { value: 5, type: Number, format: "#,##0" }],
      ],
    });
  });
});

describe("buildXlsx", () => {
  it("엑셀(zip) 파일을 만든다", async () => {
    const file = await buildXlsx([
      { name: "내역", columns: [{ title: "날짜", width: 12 }], rows: [] },
      { name: "자산", columns: [{ title: "이름", width: 12 }], rows: [[{ kind: "text", value: "통장" }]] },
    ]);
    expect(file.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(file.toString("latin1")).toContain("xl/worksheets/sheet2.xml");
  });
});
```

- [ ] **Step 3: 실패 확인** — Run: `pnpm test lib/export/xlsx.test.ts` · Expected: FAIL (`Cannot find module './xlsx'`)

- [ ] **Step 4: 구현** — `lib/export/xlsx.ts`

```ts
/**
 * 엑셀 파일 만들기 (F-52). 시트(lib/calc/export-sheets.ts) → write-excel-file 형식 → .xlsx Buffer. 서버에서만 쓴다.
 */
import writeXlsxFile, { type Cell } from "write-excel-file/node";
import type { ExportCell, ExportSheet } from "@/lib/calc/export-sheets";

/** 엑셀에서 12,000 */
const MONEY_FORMAT = "#,##0";
const DATE_FORMAT = "yyyy-mm-dd";

export function toLibraryCell(cell: ExportCell): Cell {
  if (cell === null) return null;
  switch (cell.kind) {
    case "text":
      return { value: cell.value, type: String };
    case "money":
      return { value: cell.value, type: Number, format: MONEY_FORMAT };
    case "number":
      return { value: cell.value, type: Number };
    case "date": {
      // 라이브러리는 getTime()으로 일련번호를 만든다. UTC 0시여야 시간대와 관계없이 그날이 된다
      const [y, m, d] = cell.value.split("-").map(Number);
      return { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: DATE_FORMAT };
    }
  }
}

/** 시트마다 첫 줄은 굵은 제목, 스크롤해도 보이게 고정 */
export function toLibrarySheets(sheets: readonly ExportSheet[]) {
  return sheets.map((s) => ({
    sheet: s.name,
    columns: s.columns.map((c) => ({ width: c.width })),
    stickyRowsCount: 1,
    data: [s.columns.map((c): Cell => ({ value: c.title, fontWeight: "bold" })), ...s.rows.map((row) => row.map(toLibraryCell))],
  }));
}

export function buildXlsx(sheets: readonly ExportSheet[]): Promise<Buffer> {
  return writeXlsxFile(toLibrarySheets(sheets)).toBuffer();
}
```

- [ ] **Step 5: 통과 확인** — Run: `pnpm test lib/export/xlsx.test.ts && pnpm typecheck && pnpm lint` · Expected: PASS (4), 타입·린트 오류 0. (`writeXlsxFile` 오버로드가 배열 리터럴 타입을 못 고르면 `toLibrarySheets`의 반환 타입을 `Sheet<…>`로 맞추는 대신 `data` 셀 배열 타입을 `Cell[][]`로 명시해 해결하고 ledger에 Ruling으로 남긴다.)

- [ ] **Step 6: 커밋**

```bash
git add package.json pnpm-lock.yaml lib/export/xlsx.ts lib/export/xlsx.test.ts
git commit -m "엑셀 파일 만들기 (write-excel-file 추가) (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 읽기·내려주기·화면

**Files:**
- Create: `lib/export/read.ts`
- Create: `app/api/export/route.ts`
- Create: `app/(app)/settings/export/page.tsx`, `app/(app)/settings/export/loading.tsx`
- Modify: `app/(app)/settings/(menu)/page.tsx` (lucide import에 `Download`, `items`의 `서비스 사용량` 앞에 한 줄)

**Interfaces:**
- Consumes: `fetchAll` (Task 1), `ExportData`, `buildExportSheets`, `exportFileName`, `EXPORT_SHEET_NAMES` (Task 2), `buildXlsx` (Task 3), `getCurrentMember`, `getHouseholdMembers`, `toMemberNames` (`lib/household.ts`), `createClient` (`lib/supabase/server.ts`), `toCategoryType`/`toOwner`/`toScope`/`toSlot` (`lib/domain.ts`), `toAssetKind` (`lib/calc/assets.ts`), `toDeal`/`toDebtKind`/`toHomeStatus`/`toRegion` (`lib/calc/loans.ts`), `todayKST` (`lib/date.ts`).
- Produces: `readExportData(): Promise<ExportData>`, `GET /api/export`, 화면 `/settings/export`(링크 이름 `엑셀로 내보내기`), 메뉴 링크 `데이터 내보내기`.

- [ ] **Step 1: 읽기** — `lib/export/read.ts`

```ts
import { toAssetKind } from "@/lib/calc/assets";
import type { ExportData } from "@/lib/calc/export-sheets";
import { toDeal, toDebtKind, toHomeStatus, toRegion } from "@/lib/calc/loans";
import { todayKST } from "@/lib/date";
import { toCategoryType, toOwner, toScope, toSlot } from "@/lib/domain";
import { getHouseholdMembers, toMemberNames } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";

/**
 * 엑셀 내보내기(F-52)에 담을 가구 데이터 전체. RLS로 내 가구만 읽히고, 지운 항목은 뺀다.
 * 목록은 1000줄 제한이 있어 fetchAll로 끝까지 읽는다 (order("id")는 쪽 나누기용, 시트 순서는 export-sheets가 정한다).
 */
export async function readExportData(): Promise<ExportData> {
  const supabase = await createClient();
  const [
    members,
    categories,
    methods,
    transactions,
    recurring,
    budgets,
    spendBudgets,
    spendLinks,
    spendAmounts,
    assets,
    assetValues,
    goals,
    contributions,
    debts,
    scenarios,
    profileRes,
  ] = await Promise.all([
    getHouseholdMembers(),
    fetchAll("카테고리", (f, t) => supabase.from("categories").select("id, name, sort_order").order("id").range(f, t)),
    fetchAll("계좌·카드", (f, t) => supabase.from("payment_methods").select("id, name").order("id").range(f, t)),
    fetchAll("내역", (f, t) =>
      supabase
        .from("transactions")
        .select("type, amount, occurred_on, occurred_time, category_id, merchant, memo, payment_method_id, scope, member_slot, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("정기지출", (f, t) =>
      supabase
        .from("recurring_items")
        .select("name, amount, day_of_month, category_id, scope, member_slot, payment_method_id, is_variable, has_variable_date, start_month, end_month")
        .order("id")
        .range(f, t),
    ),
    fetchAll("카테고리 예산", (f, t) => supabase.from("budgets").select("month, category_id, amount").order("id").range(f, t)),
    fetchAll("통장·카드 예산", (f, t) =>
      supabase.from("spend_budgets").select("id, name, sort_order").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("통장·카드 예산의 계좌·카드", (f, t) =>
      supabase.from("spend_budget_methods").select("budget_id, payment_method_id").order("id").range(f, t),
    ),
    fetchAll("통장·카드 예산 금액", (f, t) =>
      supabase.from("spend_budget_amounts").select("budget_id, month, amount").order("id").range(f, t),
    ),
    fetchAll("자산", (f, t) =>
      supabase
        .from("assets")
        .select("id, name, kind, owner, amount, value_as_of, is_liability, memo")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("자산 금액 기록", (f, t) =>
      supabase.from("asset_values").select("asset_id, as_of, amount").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("저축 목표", (f, t) =>
      supabase.from("goals").select("id, name, target_amount, due_date, is_done, created_at").is("deleted_at", null).order("id").range(f, t),
    ),
    fetchAll("목표 적립", (f, t) =>
      supabase
        .from("goal_contributions")
        .select("goal_id, amount, contributed_on, member_slot, memo")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("기존 대출", (f, t) =>
      supabase
        .from("loan_debts")
        .select("name, kind, owner, balance, rate_bp, months_left, monthly_payment, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    fetchAll("집 후보", (f, t) =>
      supabase
        .from("loan_scenarios")
        .select("name, deal, price, region, rate_bp, term_years, extra_costs, memo, created_at")
        .is("deleted_at", null)
        .order("id")
        .range(f, t),
    ),
    supabase.from("loan_profiles").select("income_a, income_b, home_status, first_time").maybeSingle(),
  ]);
  if (profileRes.error) throw new Error(`대출 우리 정보를 불러오지 못했어요: ${profileRes.error.message}`);

  const budgetById = new Map(spendBudgets.map((b) => [b.id, b]));
  const profile = profileRes.data;

  return {
    today: todayKST(),
    names: toMemberNames(members),
    categories: Object.fromEntries(categories.map((c) => [c.id, { name: c.name, sortOrder: c.sort_order }])),
    paymentMethods: Object.fromEntries(methods.map((m) => [m.id, m.name])),
    transactions: transactions.map((r) => ({
      occurredOn: r.occurred_on,
      occurredTime: r.occurred_time,
      type: toCategoryType(r.type),
      categoryId: r.category_id,
      merchant: r.merchant,
      memo: r.memo,
      amount: r.amount,
      paymentMethodId: r.payment_method_id,
      scope: toScope(r.scope),
      memberSlot: toSlot(r.member_slot),
      createdAt: r.created_at,
    })),
    recurring: recurring.map((r) => ({
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
    })),
    budgets: budgets.map((b) => ({ month: b.month, categoryId: b.category_id, amount: b.amount })),
    // 지운 통장·카드 예산의 금액은 뺀다
    spendBudgets: spendAmounts.flatMap((a) => {
      const b = budgetById.get(a.budget_id);
      if (!b) return [];
      const methodIds = spendLinks.filter((l) => l.budget_id === b.id).map((l) => l.payment_method_id);
      return [{ month: a.month, name: b.name, sortOrder: b.sort_order, amount: a.amount, methodIds }];
    }),
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      kind: toAssetKind(a.kind),
      owner: toOwner(a.owner),
      amount: a.amount,
      valueAsOf: a.value_as_of,
      isLiability: a.is_liability,
      memo: a.memo,
    })),
    assetValues: assetValues.map((v) => ({ assetId: v.asset_id, asOf: v.as_of, amount: v.amount })),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      dueDate: g.due_date,
      isDone: g.is_done,
      createdAt: g.created_at,
    })),
    contributions: contributions.map((c) => ({
      goalId: c.goal_id,
      amount: c.amount,
      contributedOn: c.contributed_on,
      memberSlot: toSlot(c.member_slot),
      memo: c.memo,
    })),
    loanProfile: profile
      ? { incomeA: profile.income_a, incomeB: profile.income_b, homeStatus: toHomeStatus(profile.home_status), firstTime: profile.first_time }
      : null,
    loanDebts: debts.map((l) => ({
      name: l.name,
      kind: toDebtKind(l.kind),
      owner: toOwner(l.owner),
      balance: l.balance,
      rateBp: l.rate_bp,
      monthsLeft: l.months_left,
      monthlyPayment: l.monthly_payment,
      createdAt: l.created_at,
    })),
    loanScenarios: scenarios.map((s) => ({
      name: s.name,
      deal: toDeal(s.deal),
      price: s.price,
      region: toRegion(s.region),
      rateBp: s.rate_bp,
      termYears: s.term_years,
      extraCosts: s.extra_costs,
      memo: s.memo,
      createdAt: s.created_at,
    })),
  };
}
```

(`fetchAll`의 `T` 추론이 Supabase 응답 타입과 맞지 않으면 각 호출에 행 타입을 명시하거나 `Page<T>`를 Supabase 응답 모양에 맞게 넓히고, Ruling으로 남긴다.)

- [ ] **Step 2: 내려주기** — `app/api/export/route.ts`

```ts
import { buildExportSheets, exportFileName } from "@/lib/calc/export-sheets";
import { readExportData } from "@/lib/export/read";
import { buildXlsx } from "@/lib/export/xlsx";
import { getCurrentMember } from "@/lib/household";

const TEXT = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

/**
 * 엑셀 내보내기(F-52): 로그인한 사람의 가구 데이터 전체를 .xlsx로 내려준다. 파일은 어디에도 저장하지 않는다.
 * 로그인 안 한 요청은 proxy가 먼저 로그인 화면으로 보낸다. 한글 파일 이름은 filename*로(헤더는 ASCII만 안전).
 */
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return new Response("로그인이 필요해요.", { status: 401, headers: TEXT });
  try {
    const data = await readExportData();
    const file = await buildXlsx(buildExportSheets(data));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gamjabat-backup-${data.today}.xlsx"; filename*=UTF-8''${encodeURIComponent(exportFileName(data.today))}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("내보내기 실패", error);
    return new Response("내보내기에 실패했어요. 잠시 뒤 다시 해 주세요.", { status: 500, headers: TEXT });
  }
}
```

- [ ] **Step 3: 화면** — `app/(app)/settings/export/page.tsx`

```tsx
import { Download } from "lucide-react";
import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { EXPORT_SHEET_NAMES } from "@/lib/calc/export-sheets";
import { requireMember } from "@/lib/household";

export const metadata: Metadata = { title: "데이터 내보내기 · 설정 · 감자밭" };

/** 데이터 내보내기 (F-52): 가구 데이터 전체를 엑셀 파일 하나로 받는다. 다운로드는 일반 링크(아이폰 홈 화면 앱 포함) */
export default async function ExportSettingsPage() {
  await requireMember();
  return (
    <SettingsSubpage title="데이터 내보내기">
      <SettingsSection
        title="엑셀 백업"
        description="처음부터 지금까지의 데이터를 엑셀 파일 하나로 받아요. 앱에 문제가 생겨도 기록이 남도록 가끔 받아 두세요."
      >
        <p className="text-body text-ink">시트 {EXPORT_SHEET_NAMES.length}장</p>
        <p className="mt-1 text-caption text-ink-muted">{EXPORT_SHEET_NAMES.join(" · ")}</p>
        <p className="mt-3 text-caption text-ink-muted">지운 항목, 메모·일정, 알림, 설정값은 담지 않아요.</p>
        <a
          href="/api/export"
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-body font-semibold text-on-primary hover:bg-primary/90"
        >
          <Download size={20} strokeWidth={1.75} aria-hidden />
          엑셀로 내보내기
        </a>
        <p className="mt-3 text-caption text-ink-muted">아이폰에서 미리보기가 열리면 공유 → &quot;파일에 저장&quot;을 눌러요.</p>
      </SettingsSection>
    </SettingsSubpage>
  );
}
```

`app/(app)/settings/export/loading.tsx`:

```tsx
import { SettingsSubpageSkeleton } from "@/components/skeletons/pages";

export default function Loading() {
  return <SettingsSubpageSkeleton title="데이터 내보내기" />;
}
```

- [ ] **Step 4: 메뉴** — `app/(app)/settings/(menu)/page.tsx`
  - lucide import 목록에 `Download,` 추가 (알파벳 순: `CreditCard,` 다음).
  - `items`에서 `href: "/settings/usage"` 항목 바로 앞에:

```tsx
    { href: "/settings/export", label: "데이터 내보내기", icon: Download, summary: "엑셀 백업" },
```

- [ ] **Step 5: 확인**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 오류 0, 단위 테스트 모두 통과

- [ ] **Step 6: 커밋**

```bash
git add lib/export/read.ts app/api/export/route.ts "app/(app)/settings/export" "app/(app)/settings/(menu)/page.tsx"
git commit -m "데이터 내보내기 화면과 엑셀 받기 (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: E2E `e2e/export.spec.ts`

**Files:**
- Create: `e2e/export.spec.ts`

**Interfaces:**
- Consumes: `login` (`e2e/support/login.ts`), 링크 이름 `데이터 내보내기`, `엑셀로 내보내기`, 경로 `/api/export`.

- [ ] **Step 1: 테스트 쓰기**

```ts
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("로그인 안 하면 내보내기 주소는 로그인 화면으로 보낸다 (F-52)", async ({ request }) => {
  const res = await request.get("/api/export", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers()["location"]).toContain("/login");
});

test("설정 → 데이터 내보내기: 시트 11장짜리 엑셀 백업을 받는다 (F-52)", async ({ page }) => {
  await login(page, "a", "/settings");
  await page.getByRole("link", { name: /데이터 내보내기/ }).click();
  await expect(page).toHaveURL(/\/settings\/export$/);
  await expect(page.getByText("시트 11장")).toBeVisible();

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "엑셀로 내보내기" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^감자밭-백업-\d{4}-\d{2}-\d{2}\.xlsx$/);

  // xlsx는 zip이고, 압축 안 된 파일 목록에 시트 파일 이름이 그대로 들어 있다
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  const listing = bytes.toString("latin1");
  for (let i = 1; i <= 11; i++) expect(listing).toContain(`xl/worksheets/sheet${i}.xml`);
  expect(listing).not.toContain("xl/worksheets/sheet12.xml");
});
```

- [ ] **Step 2: 실행** (3000번 dev 서버를 먼저 멈춘다)

Run: `pnpm test:e2e e2e/export.spec.ts`
Expected: 2 passed. (비로그인 요청이 `/login`이 아닌 다른 곳으로 가면 proxy 규칙을 확인하고 Ruling으로 남긴다.)

- [ ] **Step 3: 커밋**

```bash
git add e2e/export.spec.ts
git commit -m "엑셀 내보내기 E2E (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 실제 파일 확인, 기록, PR

**Files:**
- Modify: `docs/history/2026-10-01.md`, `docs/phone-checklist.md`, `docs/progress.md`

- [ ] **Step 1: 전체 검사** — Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` · Expected: 모두 통과 (단, `search-pickers` 날짜 키보드 테스트는 매달 1일 기존 실패 — 그 하나만 실패면 그대로 기록)

- [ ] **Step 2: 실제 파일 확인** (dev 서버 다시 켜기, `run_in_background` + timeout 7200000)
  - Aside 브라우저에서 실제 계정으로 `/settings/export` 화면을 보고(웹·폰 폭) `엑셀로 내보내기`로 파일을 받는다(읽기만이라 저장 동작 없음). 받기가 Aside에서 어렵다면 E2E 테스트 계정으로 받은 파일을 쓴다.
  - 받은 파일을 scratchpad에 풀어(PowerShell `Expand-Archive`, 확장자를 .zip으로 복사) 확인:
    - `xl/workbook.xml`의 시트 이름 11개가 §8.3 순서인지
    - `xl/worksheets/sheet1.xml` 첫 줄 제목, 고정 줄(`<pane … state="frozen"`), 날짜 칸 값이 일련번호(예: 2026-09-02 → 46267)로 하루 밀리지 않았는지, 금액 칸이 숫자인지
    - `xl/sharedStrings.xml`에 한글이 깨지지 않았는지

- [ ] **Step 3: 기록**
  - `docs/history/2026-10-01.md` 맨 위에 `## 개선 — 엑셀 내보내기(백업) F-52` (한 일: 설정 → 데이터 내보내기, 시트 11장, 1000줄씩 끝까지 읽기, `write-excel-file` 4.1.1 추가 / 결정: CSV → 엑셀, 기간 없이 전체, 메모·일정 제외, 지운 항목 제외 / 확인: 검사·단위·E2E·실제 파일 열어 본 결과)
  - `docs/phone-checklist.md`에 `## 개선 — 엑셀 내보내기 F-52 (2026-10-01)`:
    - `- [ ] 갤럭시: 설정 → 데이터 내보내기 → 엑셀로 내보내기 → 파일이 받아지고 엑셀(또는 구글 시트)에서 시트 11장이 열리는지`
    - `- [ ] 아이폰 홈 화면 앱: 미리보기가 열리고 공유 → "파일에 저장"이 되는지`
    - `- [ ] PC 엑셀에서 금액이 12,000처럼 보이고 합계가 되는지, 날짜가 맞는지`
  - `docs/progress.md`: "지금 상태"에서 "M6 CSV 내보내기 F-52는 아직 없음" 문구를 지우고 F-52(엑셀)를 마지막 작업으로, 남은 개선 후보의 CSV 줄을 지운다.

- [ ] **Step 4: 커밋**

```bash
git add docs/history/2026-10-01.md docs/phone-checklist.md docs/progress.md
git commit -m "엑셀 내보내기를 기록에 반영 (F-52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: 마지막 전체 검토 → 고칠 것 고치기 → PR·합치기** (`gh`는 `"/c/Program Files/GitHub CLI/gh.exe"`, rebase 합치기 + 브랜치 삭제, 배포 상태는 보고하지 않는다)
