# 앱 단순화 + 내역 ↔ 자산 연결 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내역·통계·자산만 남기고 나머지 기능을 빼며, 지출·수입·이체를 자산에 연결해 자산 잔액이 내역으로 바뀌게 한다.

**Architecture:** PR 1은 코드만 지운다(DB는 그대로라 운영 중인 옛 앱이 계속 동작). PR 2는 DB에 칸을 **더하는** 마이그레이션 + 자산 연결 코드. 마지막에 **지우는** 정리 마이그레이션을 적용하고 두 PR을 이어서 합쳐 한 번에 배포한다. 잔액은 DB에 저장하지 않고 `lib/calc/assets.ts`의 순수 함수가 "가장 최근 잔액 기록 + 그 뒤 내역"으로 매번 계산한다.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), TypeScript strict, Supabase(Postgres·RLS·Realtime, `@supabase/ssr`), Zod 4, Vitest, Playwright, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-10-25-simplify-assets-design.md`

> 스펙과 다른 점 하나: 스펙 §2는 "마이그레이션은 PR마다 하나"라고 했지만, 운영 중인 앱이 개발 기간 동안 깨지지 않도록 **더하는 마이그레이션(PR 2)** 과 **지우는 정리 마이그레이션(Task 22, 합치기 직전)** 으로 나눈다. Task 10에서 스펙 문서에 이 변경을 적는다.

## Global Constraints

- 금액은 원 단위 정수, 포맷은 `lib/money.ts`만 (`formatWon`). 금액 표시에 `tabular-nums`.
- 날짜 "오늘"·"이번 달"은 `lib/date.ts`(`todayKST`)와 `lib/period.ts`로만. `new Date()`로 월 경계 계산 금지.
- 계산은 `lib/calc/`의 순수 함수 + Vitest 단위 테스트.
- 읽기는 서버 컴포넌트, 쓰기는 서버 액션, 실시간 구독만 클라이언트.
- 모든 DB 변경은 `supabase/migrations/`의 SQL로만. 적용 `pnpm db:migrate`, 그 뒤 `pnpm db:types`.
- 조회는 항상 `deleted_at is null`. 삭제는 소프트 삭제.
- 문구: 해요체, 짧게, 이모지·느낌표 없음. 오류는 원인과 해결 방법.
- 색은 토큰만(16진수 금지). 지출 `text-expense`, 수입 `text-income` + `+`, 이체는 `text-ink-muted`(부호 없음).
- 사람 색은 항상 이름 글자와 함께. 아이콘 버튼엔 `aria-label`. 컴포넌트 200줄 넘으면 나눈다. `any` 금지.
- 커밋은 한국어 한 줄, 한 커밋에 한 가지 일, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 끝났다고 하기 전에 `pnpm lint`, `pnpm typecheck`, `pnpm test` 통과. E2E는 3000번 개발 서버를 끄고 `pnpm test:e2e`.
- 실제 계정으로 저장하지 않는다(상대에게 알림이 감). 저장 흐름은 E2E 계정으로.
- 이 PC: 명령 앞에 `$env:Path = "$env:APPDATA\npm;C:\Program Files\Git\cmd;$env:Path"`가 필요할 수 있다. Python 없음 → 스크립트는 Node로.

## Review Focus

1. **같은 날 잔액 맞추기 뒤 그날 넣은 내역** — 오늘 기록을 고치면(같은 날짜 → 금액만 바뀜) 그 시각 이후 내역만 반영돼야 한다. `set_asset_value`가 갱신할 때 `created_at = now()`로 바꾸고(Task 11), `assetBalances` 테스트가 같은 날 앞·뒤 내역을 확인한다(Task 14).
2. **예전 내역(자산 없음) 고치기** — 고칠 때는 자산 없이도 저장되고, 새로 넣을 때만 자산이 필수여야 한다. 스키마 테스트(Task 12)와 E2E(Task 21).
3. **정리 마이그레이션 전까지 남은 메모·일정·정기지출 알림** — 모르는 알림 종류가 "수정했어요"로 잘못 보이면 안 된다. `toNotificationKind`가 모르는 종류에 `null`을 주고 목록에서 뺀다(Task 2 테스트).
4. **지운 자산이 걸린 예전 내역** — 목록에 이름이 보이고, 편집 창의 자산 고르기에 그 자산이 남아 있어 저장이 막히지 않아야 한다. `assetSelectOptions` 테스트(Task 17).
5. **내역 1,000건이 넘을 때 잔액** — Supabase는 한 번에 1,000줄만 주므로 잔액용 내역은 `fetchAll`로 끝까지 읽는다(Task 15). `fetchAll` 테스트는 옮겨서 유지(Task 7).

---

# PR 1 — 기능 빼기 (코드만, DB는 그대로)

브랜치: 지금 브랜치 `remove-notes-schedule-loans`를 이름만 바꿔 계속 쓴다 (일정·메모·대출을 일부 지운 상태가 저장 전으로 남아 있음).

```bash
git branch -m remove-notes-schedule-loans simplify-remove-features
```

### Task 1: 지울 데이터 백업

**Files:**
- Create: `tmp/backup-simplify.cjs` (gitignore된 `tmp/`, 커밋하지 않음)
- Output: `tmp/simplify-backup-<오늘>.json`

**Interfaces:** Produces: 백업 파일 (Task 22 전에 다시 한 번 실행해 최신으로 덮어쓴다)

- [ ] **Step 1: 스크립트 작성**

```js
// tmp/backup-simplify.cjs — 정리 마이그레이션 전에 지울 표 전체를 JSON으로 저장 (읽기만)
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TABLES = [
  "notes", "events", "loan_profiles", "loan_debts", "loan_scenarios",
  "recurring_items", "budgets", "budget_months", "spend_budgets", "spend_budget_methods", "spend_budget_amounts",
  "goals", "goal_contributions", "payment_methods",
];
(async () => {
  const out = {};
  for (const t of TABLES) {
    const { data, error } = await s.from(t).select("*");
    if (error) throw new Error(`${t}: ${error.message}`);
    out[t] = data;
  }
  // 내역에서 지울 칸(결제수단·정기지출 연결)만
  const tx = await s.from("transactions").select("id, payment_method_id, recurring_item_id, recurring_month");
  if (tx.error) throw tx.error;
  out.transactions_removed_columns = tx.data;
  const n = await s.from("notifications").select("*").not("kind", "in", "(created,updated,deleted,restored,mood_set)");
  if (n.error) throw n.error;
  out.notifications_removed = n.data;
  const day = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(`tmp/simplify-backup-${day}.json`, JSON.stringify(out, null, 2));
  for (const k in out) console.log(k, out[k].length);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 실행**

Run: `node --env-file=.env.local tmp/backup-simplify.cjs`
Expected: 표 이름마다 개수 출력 (예: `notes 9`, `recurring_items 8`, `payment_methods 6`), 오류 없음. 이 단계는 커밋하지 않는다.

### Task 2: 일정·메모·대출 제거 마무리

이미 지운 것: `app/(app)/{notes,schedule,loans}`, `components/{notes,schedule,loans}`, `lib/{notes,events,loans,linkify}.ts`, `lib/calc/{notes,events,loans,loan-rules}*`, `components/ui/LinkifiedText.tsx`, `e2e/{notes,schedule,loans}.spec.ts`, `lib/nav.ts` 세 메뉴, `RealtimeProvider` 구독, 로딩 뼈대 3개, 스키마 3개, 엑셀 대출 시트(Task 7에서 엑셀 전체를 지우므로 그대로 둬도 됨), `lib/calc/notifications.ts`의 메모·일정 종류.

**Files:**
- Modify: `lib/calc/notifications.ts` (모르는 종류 → `null`)
- Modify: `lib/calc/notifications.test.ts` (메모·일정 describe 삭제, 새 테스트)
- Modify: `lib/notifications.ts` (note_id·event_id 읽기 삭제, 모르는 종류 빼기)
- Modify: `lib/calc/push.ts:20,29` (`noteId`·`eventId` 삭제)
- Modify: `lib/action-result.ts:32-34,38` (`invalid_note`, `event_not_found`, `occurrence_not_found`, `invalid_rule_group` 삭제)
- Modify: `components/settings/PushSettings.tsx:115` 문구
- Modify: `components/layout/MobileMenu.tsx:12` 주석, `e2e/mobile.spec.ts:18` 테스트
- Modify: `components/notifications/*` 중 `noteId`/`eventId`를 쓰는 곳 (typecheck가 알려줌)

**Interfaces:**
- Produces: `toNotificationKind(value: string): NotificationKind | null`

- [ ] **Step 1: 실패하는 테스트 쓰기** — `lib/calc/notifications.test.ts`에서 `describe("일정 알림 (F-19)" …)`와 `describe("메모 알림 (F-18)" …)` 블록을 통째로 지우고 아래를 추가한다.

```ts
describe("toNotificationKind", () => {
  it("아는 종류는 그대로, 지운 기능의 종류(메모·일정·정기지출)는 null", () => {
    expect(toNotificationKind("created")).toBe("created");
    expect(toNotificationKind("mood_set")).toBe("mood_set");
    expect(toNotificationKind("note_created")).toBeNull();
    expect(toNotificationKind("event_updated")).toBeNull();
    expect(toNotificationKind("recurring_paid")).toBeNull();
  });
});
```

(파일 맨 위 import에 `toNotificationKind`를 추가한다.)

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run lib/calc/notifications.test.ts`
Expected: FAIL — `note_created`가 `"updated"`로 나옴

- [ ] **Step 3: 구현** — `lib/calc/notifications.ts`

```ts
export function toNotificationKind(value: string): NotificationKind | null {
  return (KINDS as readonly string[]).includes(value) ? (value as NotificationKind) : null;
}
```

`lib/notifications.ts`: select에서 `note_id, event_id`를 빼고, 매핑을 다음처럼 바꾼다 (지운 기능의 알림은 정리 마이그레이션 전까지 DB에 남아 있으므로 건너뛴다).

```ts
  return data.flatMap((n) => {
    const kind = toNotificationKind(n.kind);
    if (!kind) return [];
    return [{
      id: n.id,
      createdAt: n.created_at,
      kind,
      actorId: n.actor_id,
      transactionId: n.transaction_id,
      occurredOn: n.occurred_on,
      mood: n.mood,
      subject: n.subject,
      amount: n.amount,
      count: n.count,
      read: n.read_at !== null,
    }];
  });
```

`lib/calc/push.ts`: Pick에서 `"noteId" | "eventId"`를 빼고 `tag`를 `item.kind === "mood_set" ? \`mood:${item.actorId}\` : (item.transactionId ?? item.id)`로. 같은 파일의 "같은 내역·메모·일정 알림" 주석은 "같은 내역 알림"으로. `toNotificationKind`를 쓰는 다른 곳(`/api/push` 등)이 null을 받으면 보내지 않게 한다 (typecheck가 위치를 알려줌).

`components/settings/PushSettings.tsx:115`: `상대가 내역·메모·일정을 바꾸면` → `상대가 내역을 바꾸거나 기분을 정하면`.

`components/layout/MobileMenu.tsx:12` 주석: `탭바에 없는 메모·자산·목표 등은` → `탭바에 없는 메뉴는`.

`e2e/mobile.spec.ts:18-37` "☰ 메뉴로 탭바에 없는 메모·자산·목표에 간다" 테스트는 Task 9에서 메뉴가 바뀐 뒤 다시 쓴다. 지금은 테스트 이름과 본문에서 메모 링크 확인 줄만 지운다.

- [ ] **Step 4: 확인**

Run: `pnpm vitest run lib/calc/notifications.test.ts lib/calc/push.test.ts` → PASS
Run: `pnpm typecheck` → 메모·일정·대출 관련 오류 0 (남은 오류가 있으면 그 줄의 메모·일정·대출 참조를 지운다)

- [ ] **Step 5: 커밋**

```bash
git add -A app components lib e2e
git commit -m "일정·메모·대출 기능 제거 (F-18, F-19, F-43)"
```

### Task 3: 정기지출 제거

**Files:**
- Delete: `app/(app)/recurring/`, `components/recurring/`, `lib/recurring.ts`, `lib/calc/recurring.ts`, `lib/calc/recurring.test.ts`, `e2e/recurring-home.spec.ts`
- Modify: `app/(app)/layout.tsx` (`getRecurringOverview`, `recurringDue` 삭제)
- Modify: `components/layout/MobileTabBar.tsx` (`recurringDue` prop·미납 배지 삭제)
- Modify: `components/layout/Sidebar.tsx`, `SidebarContent.tsx`, `SidebarRail.tsx`, `MobileMenu.tsx` (`recurringDue` 삭제)
- Modify: `app/(app)/(home)/page.tsx` (Task 4에서 최종 모양으로 다시 씀 — 여기서는 정기지출 import·카드만 삭제)
- Modify: `lib/nav.ts` (정기지출 항목 삭제, `Repeat` import 삭제)
- Modify: `lib/calc/stats.ts:104-109` `unbudgetedFixedTotal` 삭제 + 테스트 삭제
- Modify: `lib/action-result.ts` (`invalid_recurring_item`, `recurring_not_in_month`, `already_paid` 삭제)
- Modify: `lib/calc/notifications.ts` (`recurring_paid`, `recurring_unchecked` 종류·문장 삭제) + 테스트의 정기지출 기대값 삭제
- Modify: `e2e/notifications.spec.ts:57-127` (정기지출 체크 부분 삭제, 테스트 이름에서 "정기지출 체크" 삭제)

- [ ] **Step 1: 파일 삭제**

```bash
git rm -rq "app/(app)/recurring" components/recurring lib/recurring.ts lib/calc/recurring.ts lib/calc/recurring.test.ts e2e/recurring-home.spec.ts
```

- [ ] **Step 2: 남은 참조 지우기** — `pnpm typecheck`를 돌려 나오는 오류 위치마다 정기지출 참조를 지운다. `lib/calc/notifications.ts`에서는 `NotificationKind`·`KINDS`의 두 종류와 `notificationSentence`의 두 줄을 지운다.

```ts
  if (item.kind === "recurring_paid") return `${who} ${what} 납부를 체크했어요`;
  if (item.kind === "recurring_unchecked") return `${who} ${what} 납부 체크를 풀었어요`;
```

`notificationHref`의 `item.kind !== "recurring_unchecked"` 조건도 지운다. `notifications.test.ts`의 "납부를 체크했어요"·"납부 체크를 풀었어요" 기대 줄과 `toNotificationKind` 테스트의 `recurring_paid` 줄은 그대로 둔다(null 기대).

- [ ] **Step 3: 확인**

Run: `pnpm typecheck` → 오류 0
Run: `pnpm test` → PASS
Run: `pnpm lint` → 오류 0

- [ ] **Step 4: 커밋**

```bash
git add -A app components lib e2e
git commit -m "정기지출 기능 제거 (F-30, F-31)"
```

### Task 4: 예산 제거 + 홈 정리

**Files:**
- Delete: `app/(app)/budget/`, `app/(app)/settings/budget/`, `components/budget/`, `components/dashboard/BudgetBar.tsx`, `components/dashboard/BudgetCard.tsx`, `lib/budget.ts`, `lib/calc/budget.ts`, `lib/calc/budget.test.ts`
- Modify: `app/(app)/(home)/page.tsx` (아래 전체 코드)
- Modify: `lib/nav.ts` (예산 항목, `Wallet` import 삭제)
- Modify: `components/skeletons/pages.tsx` (`BudgetSkeleton` 삭제), `RecurringSkeleton` 삭제
- Modify: `components/realtime/RealtimeProvider.tsx` (`recurring_items`, `budgets`, `spend_budgets`, `spend_budget_methods`, `spend_budget_amounts` 구독 삭제)
- Modify: `e2e/period.spec.ts:25-70` (예산 확인 부분 삭제, 이름 "홈·내역이 그 기간을 따르고")
- Modify: `e2e/settings.spec.ts:24-25` (예산 링크 없음 확인 줄 삭제)

- [ ] **Step 1: 파일 삭제**

```bash
git rm -rq "app/(app)/budget" "app/(app)/settings/budget" components/budget components/dashboard/BudgetBar.tsx components/dashboard/BudgetCard.tsx lib/budget.ts lib/calc/budget.ts lib/calc/budget.test.ts
```

- [ ] **Step 2: 홈 다시 쓰기** — `app/(app)/(home)/page.tsx` 전체

```tsx
import Link from "next/link";
import { MonthSummary } from "@/components/dashboard/MonthSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { TodayMoods } from "@/components/mood/TodayMoods";
import { PersonFilterLinks } from "@/components/transactions/PersonFilterLinks";
import { TransactionList } from "@/components/transactions/TransactionList";
import { compareWithLastMonth, matchesPerson, splitByOwner } from "@/lib/calc/dashboard";
import { parseFilters, type PersonFilter } from "@/lib/calc/filters";
import { groupByDay, sumTotals } from "@/lib/calc/group";
import { formatPeriodRange, isCalendarRange, samePeriodLastPeriod } from "@/lib/calc/period";
import { todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getTodayMoods } from "@/lib/moods";
import { getCurrentPeriod, getPeriodConfig } from "@/lib/period";
import { getLabelMaps, getRecentTransactions, getTransactionsInRange } from "@/lib/transactions";

const hrefFor = (who: PersonFilter) => (who === "all" ? "/" : `/?who=${who}`);

/**
 * 홈 대시보드 (F-20): 이번 달 수입·지출, 지난달 비교, 오늘 기분, 최근 내역 (2026-10-25 단순화).
 * 사람 필터를 바꾸면 모든 숫자가 그 기준으로 바뀐다.
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  // "이번 달"은 한 달 기준(F-56)으로 오늘이 속한 기간. 1일 기준이면 달력의 한 달
  const [{ month, range }, periodConfig] = await Promise.all([getCurrentPeriod(), getPeriodConfig()]);
  const today = todayKST();
  const { who } = parseFilters(await searchParams, month);
  const members = await getHouseholdMembers();
  const partner = members.find((m) => m.id !== me.id) ?? null;

  const [thisMonthRows, lastPeriodRows, recent, labels, moods] = await Promise.all([
    getTransactionsInRange(range),
    getTransactionsInRange(samePeriodLastPeriod(today, periodConfig)),
    getRecentTransactions(who, 8),
    getLabelMaps(),
    getTodayMoods(),
  ]);

  const names = toMemberNames(members);
  const totals = sumTotals(thisMonthRows.filter((r) => matchesPerson(r, who)));
  const lastExpense = sumTotals(lastPeriodRows.filter((r) => matchesPerson(r, who))).expense;

  return (
    <>
      <PageHeader title="홈">
        <PersonFilterLinks current={who} names={names} hrefFor={hrefFor} />
      </PageHeader>

      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <TodayMoods meId={me.id} members={members} moods={moods} />
        {partner ? null : (
          <p className="rounded-md bg-primary-soft px-4 py-3 text-body text-ink">
            아직 혼자예요.{" "}
            <Link href="/settings/household" className="font-semibold text-primary underline-offset-4 hover:underline">
              설정에서 배우자를 초대해 주세요
            </Link>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <MonthSummary
            monthLabel={`${Number(month.slice(5, 7))}월`}
            rangeLabel={isCalendarRange(range) ? null : formatPeriodRange(range)}
            totals={totals}
            compareText={compareWithLastMonth(totals.expense, lastExpense)}
            split={who === "all" ? splitByOwner(thisMonthRows) : null}
            names={names}
          />

          <section aria-labelledby="home-recent">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="home-recent" className="text-heading text-ink">최근 내역</h2>
              <Link
                href={who === "all" ? "/transactions" : `/transactions?who=${who}`}
                className="text-body font-semibold text-primary underline-offset-4 hover:underline"
              >
                전체 보기
              </Link>
            </div>
            <TransactionList
              groups={groupByDay(recent)}
              labels={labels}
              names={names}
              emptyMessage="아직 내역이 없어요. 내역 추가 버튼으로 시작해 보세요."
            />
          </section>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: 통계 화면의 예산 칸** — Task 5에서 한다. 지금은 `app/(app)/stats/page.tsx`의 `getMonthBudgets` import와 호출을 지우고 `categoryStats(thisMonth, lastMonth, [])`로 임시 호출, `unbudgetedFixedTotal` 블록 삭제.

- [ ] **Step 4: 남은 참조** — `pnpm typecheck` 오류 위치의 예산 참조 삭제 (`lib/calc/stats.ts`의 `BudgetItem` import는 Task 5에서 정리하므로 여기서 오류가 나면 Task 5의 Step 3를 먼저 한다).

- [ ] **Step 5: 확인** — `pnpm typecheck`, `pnpm test`, `pnpm lint` 모두 통과

- [ ] **Step 6: 커밋**

```bash
git add -A app components lib e2e
git commit -m "예산 기능 제거, 홈을 수입·지출·최근 내역으로 정리 (F-20, F-21, F-22)"
```

### Task 5: 통계 정리 + 월말 결산 제거

**Files:**
- Delete: `app/(app)/stats/report/`, `components/report/`, `lib/calc/report.ts`, `lib/calc/report.test.ts`, `e2e/report.spec.ts`
- Modify: `lib/calc/stats.ts` (`CategoryStat`에서 예산 칸 삭제)
- Modify: `lib/calc/stats.test.ts`
- Modify: `components/stats/CategoryStatsTable.tsx`
- Modify: `app/(app)/stats/page.tsx`
- Modify: `components/layout/PageHeader.tsx`·`app/(app)/layout.tsx`의 `print:` 클래스는 그대로 둔다(해롭지 않음)

**Interfaces:**
- Produces: `categoryStats(thisMonth: readonly Row[], lastMonth: readonly Row[]): CategoryStat[]`, `CategoryStat = { categoryId: string; spent: number; diff: number }`

- [ ] **Step 1: 실패하는 테스트** — `lib/calc/stats.test.ts`의 `categoryStats` 테스트를 아래로 바꾼다 (예산 인자·기대값 삭제).

```ts
describe("categoryStats", () => {
  const row = (categoryId: string, amount: number, type: "expense" | "income" = "expense") => ({
    type, amount, categoryId, occurredOn: "2026-10-03", scope: "joint" as const, memberSlot: "a" as const, source: "manual",
  });
  it("지출만 카테고리별로 더하고 많이 쓴 순, 지난달 대비 증감", () => {
    const now = [row("food", 30_000), row("food", 5_000), row("cafe", 10_000), row("salary", 3_000_000, "income")];
    const before = [row("food", 20_000), row("taxi", 8_000)];
    expect(categoryStats(now, before)).toEqual([
      { categoryId: "food", spent: 35_000, diff: 15_000 },
      { categoryId: "cafe", spent: 10_000, diff: 10_000 },
    ]);
  });
});
```

(기존 테스트의 `Row` 모양이 다르면 그 파일의 기존 헬퍼를 쓰고 기대값만 위처럼 맞춘다. `unbudgetedFixedTotal` 테스트는 Task 3에서 지웠다.)

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/stats.test.ts` → FAIL (`budget` 칸이 남아 있음)

- [ ] **Step 3: 구현** — `lib/calc/stats.ts`

```ts
export type CategoryStat = {
  categoryId: string;
  spent: number;
  /** 지난달 대비 증감 (양수 = 더 씀) */
  diff: number;
};

/** 카테고리별: 쓴 돈 / 지난달 대비. 쓴 돈이 있는 것만, 많이 쓴 순 */
export function categoryStats(thisMonth: readonly Row[], lastMonth: readonly Row[]): CategoryStat[] {
  const sum = (rows: readonly Row[]) => {
    const map: Record<string, number> = {};
    for (const r of rows) if (r.type === "expense" && r.categoryId) map[r.categoryId] = (map[r.categoryId] ?? 0) + r.amount;
    return map;
  };
  const now = sum(thisMonth);
  const before = sum(lastMonth);
  return Object.entries(now)
    .map(([categoryId, spent]) => ({ categoryId, spent, diff: spent - (before[categoryId] ?? 0) }))
    .sort((a, b) => b.spent - a.spent);
}
```

`import type { BudgetItem } from "./budget";` 삭제. 파일 맨 위 주석에서 예산 언급 삭제.

`components/stats/CategoryStatsTable.tsx`: `BudgetBar` import, 예산 줄, 막대를 지우고 아래 줄을 오른쪽 정렬 한 줄로.

```tsx
            <div className="mt-1 flex justify-end pl-11 text-caption text-ink-muted tabular-nums">
              <span>지난달 대비 {diffText(s.diff)}</span>
            </div>
```

주석은 `/** 카테고리별: 쓴 돈 / 지난달 대비 (F-23) */`.

`app/(app)/stats/page.tsx`: `actions={…월말 결산…}` 삭제, `categoryStats(thisMonth, lastMonth)`, 카테고리 칸 `description="지난달 대비 증감이에요."`, 페이지 주석 `/** 통계 (F-23): 최근 6개월 지출, 카테고리별, 사람별. 달은 한 달 기준(F-56)의 기간 */`, `formatWon` import가 안 쓰이면 삭제.

- [ ] **Step 4: 월말 결산 파일 삭제**

```bash
git rm -rq "app/(app)/stats/report" components/report lib/calc/report.ts lib/calc/report.test.ts e2e/report.spec.ts
```

`pnpm typecheck` 오류 위치(예: 정기지출 현황을 아무 달이나 읽던 함수 등)의 결산 참조 삭제.

- [ ] **Step 5: 확인** — `pnpm vitest run lib/calc/stats.test.ts` PASS, `pnpm typecheck`·`pnpm test`·`pnpm lint` 통과

- [ ] **Step 6: 커밋**

```bash
git add -A app components lib e2e
git commit -m "통계에서 예산 칸 빼고 월말 결산 제거 (F-23, F-25)"
```

### Task 6: 문자 인식 제거

**Files:**
- Delete: `lib/sms/`, `components/transactions/sms/`, `app/(app)/transactions/sms-actions.ts`, `e2e/sms.spec.ts`, `fixtures/`, `lib/calc/duplicates.ts`
- Modify: 문자 붙여넣기를 여는 곳 (내역 화면·패널, typecheck가 알려줌)
- Modify: `lib/calc/notifications.ts` (`sms_batch` 종류·문장 삭제, `count`는 그대로 둠) + 테스트의 문자 묶음 기대값을 `toNotificationKind("sms_batch")` → `null` 기대로 옮김
- Modify: `e2e/notifications.spec.ts` (문자 여러 건 부분 삭제, 이름 "같은 내역 수정은 하나로, 삭제, 내 알림은 안 옴")

- [ ] **Step 1: 삭제**

```bash
git rm -rq lib/sms components/transactions/sms "app/(app)/transactions/sms-actions.ts" e2e/sms.spec.ts fixtures lib/calc/duplicates.ts
```

- [ ] **Step 2: 남은 참조** — `pnpm typecheck` 오류 위치에서 문자 버튼·import 삭제. `lib/household-data.ts`의 `smsAliases`는 Task 9에서 결제수단과 함께 지운다.

- [ ] **Step 3: 확인** — `pnpm typecheck`, `pnpm test`, `pnpm lint` 통과

- [ ] **Step 4: 커밋**

```bash
git add -A app components lib e2e fixtures
git commit -m "문자로 내역 추가 기능 제거 (F-15)"
```

### Task 7: 엑셀 내보내기 제거

**Files:**
- Delete: `app/(app)/settings/export/`, `app/api/export/`, `lib/export/read.ts`, `lib/export/xlsx.ts`, `lib/export/xlsx.test.ts`, `lib/calc/export-sheets.ts`, `lib/calc/export-sheets.test.ts`, `e2e/export.spec.ts`
- Move: `lib/export/fetch-all.ts` → `lib/supabase/fetch-all.ts`, `lib/export/fetch-all.test.ts` → `lib/supabase/fetch-all.test.ts` (Task 15에서 씀)
- Modify: `app/(app)/settings/(menu)/page.tsx` (데이터 내보내기 메뉴·`Download` import 삭제)
- Modify: `package.json` (`write-excel-file` 삭제 — 사용자에게 "엑셀 라이브러리를 뺀다"고 알림)

- [ ] **Step 1: 옮기고 삭제**

```bash
git mv lib/export/fetch-all.ts lib/supabase/fetch-all.ts
git mv lib/export/fetch-all.test.ts lib/supabase/fetch-all.test.ts
git rm -rq "app/(app)/settings/export" app/api/export lib/export lib/calc/export-sheets.ts lib/calc/export-sheets.test.ts e2e/export.spec.ts
pnpm remove write-excel-file
```

`lib/supabase/fetch-all.ts` 맨 위 주석: `/** Supabase는 한 번에 최대 1000줄까지 준다. 전체가 필요한 곳(자산 잔액 등)은 1000줄씩 이어서 읽는다 */`. 테스트 파일의 import 경로가 `./fetch-all`이면 그대로 동작한다.

- [ ] **Step 2: 확인** — `pnpm vitest run lib/supabase/fetch-all.test.ts` PASS, `pnpm typecheck`·`pnpm test`·`pnpm lint` 통과

- [ ] **Step 3: 커밋**

```bash
git add -A app lib e2e package.json pnpm-lock.yaml
git commit -m "엑셀 내보내기 제거, 끝까지 읽기 함수는 lib/supabase로 (F-52)"
```

### Task 8: 저축 목표·순자산 추이·자산 구성 도넛 제거

**Files:**
- Delete: `components/assets/{ContributeDialog,GoalEditor,GoalList,NetWorthChart,AssetCompositionChart}.tsx`
- Modify: `lib/calc/assets.ts` (`assetComposition`, `CompositionPart`, `COMPOSITION_KINDS`, `TrendPoint`, `HistoryAsset`, `HistoryValue`, `netWorthOn`, `netWorthTrend`, `GoalProgress`, `goalProgress`, `goalHint` 삭제) + `lib/calc/assets.test.ts`의 해당 테스트 삭제
- Modify: `lib/assets.ts` (goals·contributions·history 읽기 삭제)
- Modify: `app/(app)/assets/actions.ts` (`saveGoal`, `setGoalDone`, `addContribution` 삭제, `SoftDeletable = "assets"`)
- Modify: `lib/schemas.ts` (`goalInputSchema`, `contributionInputSchema` 삭제)
- Modify: `lib/action-result.ts` (`invalid_goal` 삭제)
- Modify: `app/(app)/assets/page.tsx` (아래 전체 코드)
- Modify: `components/realtime/RealtimeProvider.tsx` (`goals`, `goal_contributions` 구독 삭제)
- Modify: `e2e/assets-theme.spec.ts:4-67` (저축 목표 부분 삭제, 이름 "자산·부채 추가 → 순자산 (F-40)")
- Modify: 디자인 토큰 `chart-1`~`chart-7`은 남겨 둔다 (지우면 `design/tokens.json`·`globals.css`까지 바뀌어 범위가 커짐. Task 10 문서에 "현재 미사용"으로 적음)

**Interfaces:**
- Produces: `AssetsOverview = { assets: AssetItem[] }`, `getAssetsOverview(): Promise<AssetsOverview>`

- [ ] **Step 1: 삭제와 계산 정리**

```bash
git rm -q components/assets/ContributeDialog.tsx components/assets/GoalEditor.tsx components/assets/GoalList.tsx components/assets/NetWorthChart.tsx components/assets/AssetCompositionChart.tsx
```

`lib/calc/assets.ts`에서 위 목록의 타입·함수를 지우고, 안 쓰이게 된 import(`monthOf`, `monthRange`, `shiftMonth`, `MonthString`, `formatWon`)를 지운다. 맨 위 주석은 `/** 자산·순자산 계산 (F-40, F-41). */`.

- [ ] **Step 2: `lib/assets.ts`** — 목표·적립·history 읽기를 지운다.

```ts
export type AssetsOverview = { assets: AssetItem[] };

/** 자산 화면 데이터 (F-40, F-41) */
export const getAssetsOverview = cache(async (): Promise<AssetsOverview> => {
  const supabase = await createClient();
  const [assetsRes, valuesRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, kind, owner, amount, value_as_of, is_liability, memo, created_at")
      .is("deleted_at", null)
      .order("is_liability")
      .order("amount", { ascending: false }),
    supabase.from("asset_values").select("id, asset_id, as_of, amount").is("deleted_at", null).order("as_of", { ascending: false }),
  ]);
  if (assetsRes.error) throw fail("자산", assetsRes.error);
  if (valuesRes.error) throw fail("금액 기록", valuesRes.error);

  return {
    assets: assetsRes.data.map((a) => ({
      id: a.id,
      name: a.name,
      kind: toAssetKind(a.kind),
      owner: toOwner(a.owner),
      amount: a.amount,
      valueAsOf: a.value_as_of ?? todayKST(new Date(a.created_at)),
      isLiability: a.is_liability,
      memo: a.memo,
      values: valuesRes.data.filter((v) => v.asset_id === a.id).map((v) => ({ id: v.id, asOf: v.as_of, amount: v.amount })),
    })),
  };
});
```

`Contribution`, `GoalItem` 타입과 `toSlot`·`Slot`·`HistoryAsset`·`HistoryValue` import 삭제.

- [ ] **Step 3: 자산 화면** — `app/(app)/assets/page.tsx` 전체

```tsx
import type { Metadata } from "next";
import { AssetList } from "@/components/assets/AssetList";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { getAssetsOverview } from "@/lib/assets";
import { netWorth } from "@/lib/calc/assets";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { formatWon } from "@/lib/money";

export const metadata: Metadata = { title: "자산 · 감자밭" };

/** 자산 (F-40, F-41): 순자산, 자산·부채 목록 (2026-10-25 단순화) */
export default async function AssetsPage() {
  await requireMember();
  const [overview, members] = await Promise.all([getAssetsOverview(), getHouseholdMembers()]);
  const names = toMemberNames(members);
  const worth = netWorth(overview.assets);

  return (
    <>
      <PageHeader title="자산" />
      <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
        <section aria-labelledby="net-worth-title" className="rounded-md bg-surface-raised p-5">
          <h2 id="net-worth-title" className="text-heading text-ink">
            순자산
          </h2>
          <p className="mt-2 text-amount-hero text-ink tabular-nums">
            {worth.net < 0 ? "−" : ""}
            {formatWon(Math.abs(worth.net))}
          </p>
          {/* 자산은 수입처럼 파랑, 부채는 지출처럼 빨강. "자산"·"부채" 글자와 함께 */}
          <p className="mt-1 text-caption text-ink-muted tabular-nums">
            자산 <span className="text-primary">{formatWon(worth.assets)}</span> − 부채{" "}
            <span className="text-expense">{formatWon(worth.liabilities)}</span>
          </p>
        </section>
        <SettingsSection title="자산·부채" description="항목을 누르면 잔액을 맞추거나 이 자산 내역을 볼 수 있어요.">
          <AssetList assets={overview.assets} names={names} />
        </SettingsSection>
      </div>
    </>
  );
}
```

`lib/nav.ts`의 자산 라벨 `"자산·목표"` → `"자산"` (Task 9에서 메뉴 전체를 정리). `components/skeletons/pages.tsx`의 `AssetsSkeleton` 제목도 `"자산"`으로, 오른쪽 열 뼈대 삭제.

- [ ] **Step 4: 남은 참조** — `pnpm typecheck` 오류 위치 정리 (액션·스키마·action-result·Realtime).

- [ ] **Step 5: 확인** — `pnpm typecheck`, `pnpm test`, `pnpm lint` 통과

- [ ] **Step 6: 커밋**

```bash
git add -A app components lib e2e
git commit -m "저축 목표·순자산 추이·자산 구성 그래프 제거 (F-41, F-42)"
```

### Task 9: 결제수단 제거 + 메뉴 정리

**Files:**
- Delete: `app/(app)/settings/payment-methods/`, `app/(app)/settings/payment-method-actions.ts`, `components/settings/PaymentMethodEditor.tsx`, `components/settings/PaymentMethodSection.tsx`, `components/transactions/PaymentMethodSelect.tsx`, `components/layout/SidebarMethods.tsx`
- Modify: `lib/household-data.ts` (`PaymentMethodOption`, `getVisiblePaymentMethods` 삭제)
- Modify: `lib/settings-data.ts` (`getAllPaymentMethods` 삭제)
- Modify: `lib/domain.ts` (`PAYMENT_KINDS`, `PaymentKind`, `PAYMENT_KIND_LABEL`, `toPaymentKind` 삭제)
- Modify: `lib/schemas.ts` (`smsAliasesSchema`, `paymentMethodInputSchema`, `transactionInputSchema.paymentMethodId` 삭제) + `lib/schemas.test.ts`의 `paymentMethodInputSchema` describe 삭제
- Modify: `lib/transactions.ts` (`paymentMethodId`, `payment_method_id`, `LabelMaps.paymentMethods`, `q.paymentMethods` 삭제)
- Modify: `lib/calc/filters.ts` (`paymentMethods` 칸, `pm` 파라미터 삭제) + `filters.test.ts`
- Modify: `app/(app)/transactions/actions.ts` (`payment_method_id` 삭제)
- Modify: `components/transactions/{TransactionForm,TransactionList,FilterBar,types}.tsx|ts`, `app/(app)/transactions/page.tsx`, `app/(app)/layout.tsx`, `components/layout/{Sidebar,SidebarContent,SidebarRail,MobileMenu}.tsx`
- Modify: `app/(app)/settings/(menu)/page.tsx` (계좌·카드 메뉴, `CreditCard` import, `getAllPaymentMethods` 삭제)
- Modify: `lib/calc/assignment.ts` 주석 ("결제수단 소유" → "자산 소유"; 동작은 그대로, Task 17에서 자산 소유로 씀)
- Modify: `lib/nav.ts` (아래 전체 코드), `components/layout/MobileTabBar.tsx` (`grid-cols-5` 유지 — 홈·내역·통계·자산·설정 5개)
- Modify: `lib/action-result.ts` (`invalid_payment_method`는 정리 마이그레이션 전까지 DB가 낼 수 있으니 Task 22에서 삭제)
- Modify: `e2e/settings.spec.ts:5-49` (계좌·카드 메뉴 줄 삭제, 사이드바 접기 테스트는 Task 19에서 자산 목록으로 다시 씀 — 지금은 삭제), `e2e/mobile.spec.ts:18-37` (☰ 메뉴 테스트를 "자산"으로)

- [ ] **Step 1: 메뉴** — `lib/nav.ts`

```ts
import { ChartColumn, House, PiggyBank, ReceiptText, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 모바일 하단 탭바에 보일지 (5개) */
  inTabBar: boolean;
  /** 웹 사이드바 메뉴에 보일지 (설정은 사이드바 맨 아래에 따로 둔다) */
  inSidebar: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: House, inTabBar: true, inSidebar: true },
  { href: "/transactions", label: "내역", icon: ReceiptText, inTabBar: true, inSidebar: true },
  { href: "/stats", label: "통계", icon: ChartColumn, inTabBar: true, inSidebar: true },
  { href: "/assets", label: "자산", icon: PiggyBank, inTabBar: true, inSidebar: true },
  { href: "/settings", label: "설정", icon: Settings, inTabBar: true, inSidebar: false },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 2: 삭제**

```bash
git rm -rq "app/(app)/settings/payment-methods" "app/(app)/settings/payment-method-actions.ts" components/settings/PaymentMethodEditor.tsx components/settings/PaymentMethodSection.tsx components/transactions/PaymentMethodSelect.tsx components/layout/SidebarMethods.tsx
```

- [ ] **Step 3: 필터 테스트 먼저** — `lib/calc/filters.test.ts`에서 `pm`/`paymentMethods`를 쓰는 기대값을 지우고, 아래 테스트를 추가한다.

```ts
it("결제수단 파라미터(pm)는 무시한다", () => {
  const f = parseFilters({ pm: "8f9c2f43-1f7b-4bb2-9b6e-1b5d2c3a4e5f" }, "2026-10");
  expect("paymentMethods" in f).toBe(false);
  expect(filtersToHref(f, "2026-10")).toBe("/transactions");
});
```

Run: `pnpm vitest run lib/calc/filters.test.ts` → FAIL

- [ ] **Step 4: 구현** — `lib/calc/filters.ts`의 `TransactionFilters`에서 `paymentMethods: string[];` 삭제, `parseFilters`의 `paymentMethods: idList(params.pm),` 삭제, `filtersToHref`의 `pm` 줄 삭제. 그다음 `pnpm typecheck` 오류 위치마다 결제수단 참조를 지운다:
  - `TransactionForm.tsx`: `paymentMethodId` 상태, `changePaymentMethod`, `<PaymentMethodSelect …/>`, 저장 인자의 `paymentMethodId` 삭제
  - `TransactionList.tsx`: `method` 변수 삭제, 둘째 줄은 `[category?.name, tx.memo]`
  - `FilterBar.tsx`: 결제수단 체크 목록과 prop 삭제, 초기화 버튼은 `apply({ type: "all", categories: [] })`
  - `SidebarContent.tsx:133`: `<SidebarMethods …/>` 삭제 (Task 19에서 자산 목록이 들어감)
  - `layout.tsx`: `getVisiblePaymentMethods` 삭제, `sidebar`에서 `paymentMethods` 삭제, `TransactionPanelProvider data`에서 `paymentMethods` 삭제
  - `types.ts`: `PanelData.paymentMethods` 삭제

- [ ] **Step 5: 확인** — `pnpm vitest run lib/calc/filters.test.ts` PASS, `pnpm typecheck`·`pnpm test`·`pnpm lint` 통과

- [ ] **Step 6: 화면 확인** — `pnpm dev`, http://localhost:3000 을 E2E가 아닌 실제 계정으로 **보기만** 한다: 사이드바 메뉴 홈·내역·통계·자산, 폰 폭(390px)에서 탭바 5개, 설정 메뉴에 계좌·카드·데이터 내보내기가 없음, 내역 추가 창에 결제수단 칸이 없음(저장하지 않음).

- [ ] **Step 7: 커밋**

```bash
git add -A app components lib e2e
git commit -m "결제수단 제거, 메뉴를 홈·내역·통계·자산·설정으로 (F-10, F-12)"
```

### Task 10: PR 1 문서·전체 확인·PR

**Files:**
- Modify: `SPEC.md` (목차 표: F-15·F-18·F-19·F-21·F-22·F-25·F-30·F-31·F-42·F-43·F-52를 "제거됨 (2026-10-25)", 결제수단 관련 F 항목에 "자산으로 대체 예정")
- Modify: `spec/*.md` (해당 영역 맨 위에 `> 2026-10-25 제거됨 — 앱 단순화` 한 줄, 본문은 남겨 둠), `spec/layout.md` (탭바·사이드바), `spec/data-model.md` (지울 표 표시)
- Modify: `design/README.md` (탭바 5개 = 홈·내역·통계·자산·설정, 사이드바 "계좌·카드" 목록 → 자산 목록 예정, `chart-1~7` 현재 미사용)
- Modify: `docs/superpowers/specs/2026-10-25-simplify-assets-design.md` §2 "DB 마이그레이션" (더하는 것 / 정리하는 것 두 개로 나눈다는 변경)
- Create/Modify: `docs/history/2026-10-25.md` (한 일·결정한 것), `docs/phone-checklist.md` (지운 기능 항목 삭제), `docs/progress.md` ("지금 상태"·"남은 개선 후보"에서 지운 기능 삭제)
- Modify: `CLAUDE.md` 폴더 구조의 `(app)/…` 줄: `transactions, stats, assets, settings`

- [ ] **Step 1: 문서 수정** (위 목록)
- [ ] **Step 2: 전체 확인** — `pnpm lint`, `pnpm typecheck`, `pnpm test` 통과. 3000번 서버를 끄고 `pnpm test:e2e` 통과 (DB는 아직 옛 모양이라 옛 표가 있어도 E2E는 동작해야 함)
- [ ] **Step 3: 커밋**

```bash
git add -A SPEC.md spec design docs CLAUDE.md
git commit -m "기능 빼기를 스펙·디자인·기록에 반영"
```

- [ ] **Step 4: PR 1 만들기 (합치지 않음)**

```bash
git push -u origin simplify-remove-features
gh pr create --base main --title "앱 단순화 1/2: 기능 빼기" --body "<요약 + Generated with Claude Code 줄>" --draft
```

---

# PR 2 — 내역 ↔ 자산 연결

```bash
git switch -c asset-linked-transactions
```

### Task 11: 더하는 마이그레이션

**Files:**
- Create: `supabase/migrations/20261025100000_transactions_assets.sql`
- Modify: `lib/supabase/types.ts` (`pnpm db:types`로 생성)

**Interfaces:**
- Produces: `transactions.asset_id uuid null`, `transactions.to_asset_id uuid null`, `transactions.type in ('expense','income','transfer')`, `transactions.category_id` null 허용(이체만), `notifications.tx_type`에 `transfer` 허용, DB 오류 코드 `invalid_asset`, `transfer_same_asset`, `category_type_mismatch`

옛 앱(운영 중)이 그대로 동작해야 하므로 **지우는 것은 없다**. 결제수단·정기지출 확인도 함수에 남겨 둔다(Task 22에서 뺌).

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 내역 ↔ 자산 연결 (2026-10-25 앱 단순화). 더하기만 한다: 운영 중인 옛 앱이 계속 동작해야 하므로.
-- 지출·수입: asset_id = 그 자산(새 내역은 앱이 필수로 받음, 예전 내역은 null)
-- 이체: asset_id = 보내는 자산, to_asset_id = 받는 자산, 카테고리 없음

alter table public.transactions
  add column asset_id uuid references public.assets (id),
  add column to_asset_id uuid references public.assets (id),
  alter column category_id drop not null,
  drop constraint transactions_type_check,
  add constraint transactions_type_check check (type in ('expense', 'income', 'transfer')),
  add constraint transactions_shape check (
    case when type = 'transfer'
      then category_id is null and asset_id is not null and to_asset_id is not null and asset_id <> to_asset_id
      else category_id is not null and to_asset_id is null
    end
  );

create index transactions_asset_idx on public.transactions (asset_id) where deleted_at is null and asset_id is not null;
create index transactions_to_asset_idx on public.transactions (to_asset_id) where deleted_at is null and to_asset_id is not null;

alter table public.notifications
  drop constraint notifications_tx_type_check,
  add constraint notifications_tx_type_check check (tx_type in ('expense', 'income', 'transfer'));

-- 쓰기 규칙: 이체는 카테고리 확인을 건너뛰고, 자산은 같은 가구 것이어야 한다.
-- 지운 자산도 허용: 지운 자산이 걸린 예전 내역을 고쳐 저장할 수 있게 (고르기 창에는 안 보임)
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_category public.categories%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;

  if tg_op = 'INSERT' then
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.recurring_item_id := old.recurring_item_id;
    new.recurring_month := old.recurring_month;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();

  if new.type = 'transfer' then
    if new.asset_id = new.to_asset_id then
      raise exception 'transfer_same_asset';
    end if;
  else
    select * into v_category from public.categories where id = new.category_id;
    if not found or v_category.household_id <> new.household_id then
      raise exception 'invalid_category';
    end if;
    if v_category.type <> new.type then
      raise exception 'category_type_mismatch';
    end if;
  end if;

  if new.asset_id is not null and not exists (
    select 1 from public.assets where id = new.asset_id and household_id = new.household_id
  ) then
    raise exception 'invalid_asset';
  end if;
  if new.to_asset_id is not null and not exists (
    select 1 from public.assets where id = new.to_asset_id and household_id = new.household_id
  ) then
    raise exception 'invalid_asset';
  end if;

  if new.payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = new.payment_method_id and household_id = new.household_id
  ) then
    raise exception 'invalid_payment_method';
  end if;
  if new.recurring_item_id is not null and not exists (
    select 1 from public.recurring_items where id = new.recurring_item_id and household_id = new.household_id
  ) then
    raise exception 'invalid_recurring_item';
  end if;

  return new;
end;
$$;

-- 가맹점 규칙은 카테고리가 있는 내역(지출·수입)만
create or replace function public.transactions_remember_merchant()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_key text := public.normalize_merchant(new.merchant);
begin
  if new.deleted_at is null
     and new.category_id is not null
     and new.source in ('manual', 'sms')
     and v_key <> ''
     and char_length(v_key) <= 50 then
    insert into public.merchant_rules (household_id, merchant_key, category_id)
    values (new.household_id, v_key, new.category_id)
    on conflict (household_id, merchant_key)
    do update set category_id = excluded.category_id, updated_at = now();
  end if;
  return null;
end;
$$;

-- 알림 제목: 이체는 "보내는 자산 → 받는 자산", 나머지는 가맹점 또는 카테고리
create function public.transaction_subject(p_tx public.transactions)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_tx.type = 'transfer' then
      coalesce((select name from public.assets where id = p_tx.asset_id), '자산')
      || ' → ' ||
      coalesce((select name from public.assets where id = p_tx.to_asset_id), '자산')
    else coalesce(nullif(p_tx.merchant, ''), (select name from public.categories where id = p_tx.category_id))
  end;
$$;
revoke execute on function public.transaction_subject(public.transactions) from public, anon, authenticated;
```

이어서 같은 파일에 두 알림 함수를 다시 만든다. **방법**: `supabase/migrations/20260928130000_notifications.sql`의 `notify_transactions_inserted()` 본문과 `supabase/migrations/20260929100000_notification_recurring_unchecked_cleanup.sql`의 `notify_transaction_updated()` 본문을 `create or replace function`으로 복사하고 아래 세 군데만 바꾼다.

1. `notify_transactions_inserted()`의 `coalesce(nullif(n.merchant, ''), c.name)` → `public.transaction_subject(n)` 으로 바꾸고 `left join public.categories c on c.id = n.category_id` 줄을 지운다. (`new_rows`의 행 타입이 `public.transactions`라 그대로 넘길 수 있다. `from new_rows n`은 그대로.)
2. `notify_transaction_updated()`의 비교 튜플 두 개에 `old.asset_id, old.to_asset_id` / `new.asset_id, new.to_asset_id`를 끝에 더한다.
3. `notify_transaction_updated()`의 `select coalesce(nullif(new.merchant, ''), c.name) into v_subject from public.categories c where c.id = new.category_id;` → `v_subject := public.transaction_subject(new);`

그리고 잔액 맞추기의 "같은 날 기록"이 그 시각 기준이 되게 (Review Focus 1):

```sql
-- 같은 날짜 기록을 고치면 기록 시각도 지금으로: 잔액 계산이 "이 기록 뒤에 넣은 내역"만 더하도록
create or replace function public.set_asset_value(p_asset_id uuid, p_as_of date, p_amount bigint)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_amount';
  end if;
  update public.asset_values set amount = p_amount, created_at = now()
  where asset_id = p_asset_id and as_of = p_as_of and deleted_at is null;
  if not found then
    insert into public.asset_values (household_id, asset_id, as_of, amount, created_by)
    values ((select household_id from public.assets where id = p_asset_id), p_asset_id, p_as_of, p_amount,
            (select id from public.members where user_id = auth.uid()));
  end if;
end;
$$;
```

(`asset_values_before_write` 트리거가 update 때 `created_at`을 막지 않는지 확인: 그 함수는 `household_id`·`asset_id`·`created_by`만 old로 되돌린다 — 그대로 둔다.)

- [ ] **Step 2: 적용** — Run: `pnpm db:migrate` → 오류 없음. Run: `pnpm db:types` → `lib/supabase/types.ts`에 `asset_id`, `to_asset_id`가 생김

- [ ] **Step 3: DB 규칙 확인 스크립트** — `tmp/check-transfer-rules.cjs`(커밋 안 함): E2E 계정 A로 로그인한 클라이언트(`e2e/support/accounts.ts`의 `createE2EAccounts`·`userClient` 사용, 끝나면 `deleteE2EAccounts`)로
  - 이체에 같은 자산 두 번 → 오류 `transfer_same_asset` 또는 `transactions_shape`
  - 이체에 카테고리 넣기 → 오류(`transactions_shape`)
  - 다른 가구 자산으로 지출 → `invalid_asset`
  - 지출에 `to_asset_id` → 오류
  - 정상 지출·이체 → 성공, B에게 이체 알림 `subject = "A통장 → B카드"`
  
  Expected: 다섯 가지 모두 기대대로. 실패하면 마이그레이션을 고쳐 새 파일로 다시 적용한다(적용된 파일은 고치지 않는다).

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20261025100000_transactions_assets.sql lib/supabase/types.ts
git commit -m "내역에 자산·이체 칸 추가, 이체 알림 제목, 같은 날 잔액 기록 시각 갱신 (F-10, F-41)"
```

### Task 12: 내역 유형과 입력 검증

**Files:**
- Modify: `lib/domain.ts`
- Modify: `lib/schemas.ts:72-90` (`transactionInputSchema`)
- Test: `lib/schemas.test.ts`

**Interfaces:**
- Produces: `TRANSACTION_TYPES = ["expense","income","transfer"] as const`, `type TransactionType`, `TRANSACTION_TYPE_LABEL: Record<TransactionType,string>`, `toTransactionType(value: string): TransactionType`
- Produces: `transactionInputSchema` — 입력 `{ id?, type, amount, occurredOn, categoryId: string|null, merchant, memo, assetId: string|null, toAssetId: string|null, scope, memberSlot }`, 출력은 이체면 `categoryId=null, merchant=null`, 아니면 `toAssetId=null`

- [ ] **Step 1: 실패하는 테스트** — `lib/schemas.test.ts`의 `transactionInputSchema` describe 안에서 `paymentMethodId`가 들어간 입력을 `assetId`·`toAssetId`로 바꾸고 아래를 추가한다.

```ts
const ASSET_A = "11111111-1111-4111-8111-111111111111";
const ASSET_B = "22222222-2222-4222-8222-222222222222";
const CATEGORY = "33333333-3333-4333-8333-333333333333";
const TX_ID = "44444444-4444-4444-8444-444444444444";
const base = {
  amount: 12_000, occurredOn: "2026-10-25", merchant: "", memo: "", scope: "joint", memberSlot: "a",
} as const;

describe("transactionInputSchema: 자산·이체", () => {
  it("새 지출은 자산이 있어야 한다", () => {
    const r = transactionInputSchema.safeParse({ ...base, type: "expense", categoryId: CATEGORY, assetId: null, toAssetId: null });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("자산을 골라 주세요");
  });
  it("예전 내역 고치기(id 있음)는 자산 없이도 된다", () => {
    const r = transactionInputSchema.safeParse({ ...base, id: TX_ID, type: "expense", categoryId: CATEGORY, assetId: null, toAssetId: null });
    expect(r.success).toBe(true);
  });
  it("지출·수입은 카테고리가 있어야 하고, 받는 자산은 지운다", () => {
    expect(transactionInputSchema.safeParse({ ...base, type: "income", categoryId: null, assetId: ASSET_A, toAssetId: null }).error?.issues[0].message).toBe("카테고리를 골라 주세요");
    const ok = transactionInputSchema.parse({ ...base, type: "income", categoryId: CATEGORY, assetId: ASSET_A, toAssetId: ASSET_B });
    expect(ok.toAssetId).toBeNull();
  });
  it("이체는 보내는·받는 자산이 다르게 있어야 하고, 카테고리·가맹점은 지운다", () => {
    const t = { ...base, type: "transfer", categoryId: CATEGORY, merchant: "무시", assetId: ASSET_A, toAssetId: ASSET_B } as const;
    const ok = transactionInputSchema.parse(t);
    expect(ok.categoryId).toBeNull();
    expect(ok.merchant).toBeNull();
    expect(transactionInputSchema.safeParse({ ...t, assetId: null }).error?.issues[0].message).toBe("보내는 자산을 골라 주세요");
    expect(transactionInputSchema.safeParse({ ...t, toAssetId: null }).error?.issues[0].message).toBe("받는 자산을 골라 주세요");
    expect(transactionInputSchema.safeParse({ ...t, toAssetId: ASSET_A }).error?.issues[0].message).toBe(
      "보내는 자산과 받는 자산이 같아요. 다른 자산을 골라 주세요",
    );
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/schemas.test.ts` → FAIL

- [ ] **Step 3: 구현** — `lib/domain.ts`에 추가

```ts
/** 내역 유형. 카테고리 종류(CategoryType)는 지출·수입뿐이고, 이체는 카테고리가 없다 */
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  expense: "지출",
  income: "수입",
  transfer: "이체",
};

export function toTransactionType(value: string): TransactionType {
  return value === "income" || value === "transfer" ? value : "expense";
}
```

`lib/schemas.ts`의 `transactionInputSchema`를 바꾼다 (import에 `TRANSACTION_TYPES` 추가).

```ts
/** 내역 추가·수정 (F-10, F-11). 새 지출·수입은 자산 필수, 예전 내역(자산 없음)은 고칠 때 비워 둬도 된다 */
export const transactionInputSchema = z
  .object({
    id: z.uuid().optional(),
    type: z.enum(TRANSACTION_TYPES),
    amount: z
      .number("금액을 입력해 주세요")
      .int("금액은 원 단위로 입력해 주세요")
      .min(1, "금액을 입력해 주세요")
      .max(100_000_000_000, "금액이 너무 커요. 다시 확인해 주세요"),
    occurredOn: dateStringSchema,
    categoryId: z.uuid("카테고리를 골라 주세요").nullable(),
    merchant: optionalText(50, "가맹점·내용은 50자까지 쓸 수 있어요"),
    memo: optionalText(200, "메모는 200자까지 쓸 수 있어요"),
    assetId: z.uuid("자산을 골라 주세요").nullable(),
    toAssetId: z.uuid("받는 자산을 골라 주세요").nullable(),
    scope: z.enum(SCOPES),
    memberSlot: z.enum(SLOTS),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: "custom", message, path: [path] });
    if (v.type === "transfer") {
      if (!v.assetId) issue("보내는 자산을 골라 주세요", "assetId");
      else if (!v.toAssetId) issue("받는 자산을 골라 주세요", "toAssetId");
      else if (v.assetId === v.toAssetId) issue("보내는 자산과 받는 자산이 같아요. 다른 자산을 골라 주세요", "toAssetId");
      return;
    }
    if (!v.categoryId) issue("카테고리를 골라 주세요", "categoryId");
    if (!v.id && !v.assetId) issue("자산을 골라 주세요", "assetId");
  })
  .transform((v) => (v.type === "transfer" ? { ...v, categoryId: null, merchant: null } : { ...v, toAssetId: null }));
```

- [ ] **Step 4: 통과 확인** — `pnpm vitest run lib/schemas.test.ts` → PASS. (`pnpm typecheck`는 Task 13~17이 끝날 때까지 오류가 남을 수 있다 — 다음 태스크에서 해결)

- [ ] **Step 5: 커밋**

```bash
git add lib/domain.ts lib/schemas.ts lib/schemas.test.ts
git commit -m "내역 유형에 이체 추가, 자산 입력 검증 (F-10)"
```

### Task 13: 합계·통계에서 이체 빼기

**Files:**
- Modify: `lib/calc/group.ts`, `lib/calc/stats.ts` (`Row`), `lib/calc/dashboard.ts:21`
- Test: `lib/calc/group.test.ts`, `lib/calc/stats.test.ts`, `lib/calc/dashboard.test.ts`

**Interfaces:**
- Consumes: `TransactionType` (Task 12)
- Produces: `Summable = { type: TransactionType; amount: number; occurredOn: DateString }` — `sumTotals`·`dailyTotals`는 이체를 더하지 않는다. `groupByDay`는 이체도 목록에 넣는다(합계에서만 뺌)

- [ ] **Step 1: 실패하는 테스트** — `lib/calc/group.test.ts`에 추가

```ts
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
```

`lib/calc/stats.test.ts`·`dashboard.test.ts`에도 이체 한 줄(`type: "transfer", categoryId: null`)을 섞어 기존 기대값이 그대로인지 확인하는 케이스를 하나씩 추가한다.

```ts
it("이체는 카테고리별·사람별·월별 지출에 들어가지 않는다", () => {
  const transfer = { type: "transfer" as const, amount: 900_000, categoryId: null, occurredOn: "2026-10-03", scope: "joint" as const, memberSlot: "a" as const, source: "manual" };
  expect(categoryStats([transfer], [])).toEqual([]);
  expect(personStats([transfer]).a.total).toBe(0);
});
```

(`personStats`의 반환 모양은 기존 파일 기준. `joint`·`a`·`b` 키가 있다.)

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/group.test.ts lib/calc/stats.test.ts lib/calc/dashboard.test.ts` → FAIL 또는 타입 오류

- [ ] **Step 3: 구현** — `lib/calc/group.ts`

```ts
import type { TransactionType } from "@/lib/domain";
import type { DateString } from "@/lib/date";

export type Summable = { type: TransactionType; amount: number; occurredOn: DateString };
export type DayTotal = { expense: number; income: number };

/** 지출·수입 합계. 이체는 내 돈끼리 옮긴 것이라 더하지 않는다 */
export function sumTotals(rows: readonly Summable[]): DayTotal {
  const total: DayTotal = { expense: 0, income: 0 };
  for (const row of rows) if (row.type !== "transfer") total[row.type] += row.amount;
  return total;
}

/** 날짜 → 그날 지출·수입 합계 (이체 제외) */
export function dailyTotals(rows: readonly Summable[]): Record<DateString, DayTotal> {
  const totals: Record<DateString, DayTotal> = {};
  for (const row of rows) {
    if (row.type === "transfer") continue;
    const day = (totals[row.occurredOn] ??= { expense: 0, income: 0 });
    day[row.type] += row.amount;
  }
  return totals;
}
```

(`groupByDay`는 그대로 — 이미 `sumTotals`를 쓴다.) `lib/calc/stats.ts`의 `Row`는 `type: TransactionType; categoryId: string | null;`로, `personStats`·`monthlyExpense`는 이미 `expense`만 거르는지 확인하고 `personStats`의 카테고리 키 접근에 `r.categoryId &&` 조건을 더한다. `lib/calc/dashboard.ts:21`의 `type: CategoryType` → `TransactionType`.

- [ ] **Step 4: 통과 확인** — 위 세 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/group.ts lib/calc/group.test.ts lib/calc/stats.ts lib/calc/stats.test.ts lib/calc/dashboard.ts lib/calc/dashboard.test.ts
git commit -m "수입·지출 합계와 통계에서 이체 빼기 (F-12, F-23)"
```

### Task 14: 잔액 계산

**Files:**
- Modify: `lib/calc/assets.ts`
- Test: `lib/calc/assets.test.ts`

**Interfaces:**
- Consumes: `TransactionType`
- Produces:

```ts
export type BalanceRecord = { assetId: string; asOf: DateString; amount: number; createdAt: string };
export type BalanceTx = { type: TransactionType; amount: number; occurredOn: DateString; createdAt: string; assetId: string | null; toAssetId: string | null };
export type AssetBalance = { balance: number; asOf: DateString; txCount: number };
export function assetBalances(
  assets: readonly { id: string; isLiability: boolean }[],
  records: readonly BalanceRecord[],
  txs: readonly BalanceTx[],
): Record<string, AssetBalance>;
export function netContribution(amount: number, isLiability: boolean): number;
```

- [ ] **Step 1: 실패하는 테스트** — `lib/calc/assets.test.ts`에 추가

```ts
describe("assetBalances", () => {
  const bank = { id: "bank", isLiability: false };
  const card = { id: "card", isLiability: true };
  const rec = (assetId: string, asOf: string, amount: number, createdAt = `${asOf}T03:00:00+00:00`) => ({ assetId, asOf, amount, createdAt });
  const tx = (over: Partial<BalanceTx>): BalanceTx => ({
    type: "expense", amount: 1_000, occurredOn: "2026-10-26", createdAt: "2026-10-26T01:00:00+00:00", assetId: "bank", toAssetId: null, ...over,
  });

  it("자산: 기록 뒤 수입 +, 지출 −, 이체로 받으면 +, 보내면 −", () => {
    const r = assetBalances([bank, card], [rec("bank", "2026-10-25", 100_000), rec("card", "2026-10-25", 0)], [
      tx({ type: "income", amount: 50_000 }),
      tx({ type: "expense", amount: 12_000 }),
      tx({ type: "transfer", amount: 30_000, assetId: "card", toAssetId: "bank" }),
      tx({ type: "transfer", amount: 5_000, assetId: "bank", toAssetId: "card" }),
    ]);
    expect(r.bank).toEqual({ balance: 100_000 + 50_000 - 12_000 + 30_000 - 5_000, asOf: "2026-10-25", txCount: 4 });
  });

  it("부채: 지출 +, 수입 −, 이체로 받으면(갚으면) −, 보내면 +", () => {
    const r = assetBalances([bank, card], [rec("bank", "2026-10-25", 0), rec("card", "2026-10-25", 200_000)], [
      tx({ type: "expense", amount: 40_000, assetId: "card" }),
      tx({ type: "income", amount: 3_000, assetId: "card" }),
      tx({ type: "transfer", amount: 150_000, assetId: "bank", toAssetId: "card" }),
      tx({ type: "transfer", amount: 10_000, assetId: "card", toAssetId: "bank" }),
    ]);
    expect(r.card.balance).toBe(200_000 + 40_000 - 3_000 - 150_000 + 10_000);
  });

  it("기록 날짜보다 앞선 내역은 빼고, 같은 날이면 기록보다 나중에 넣은 것만 (Review Focus 1)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 100_000, "2026-10-25T05:00:00+00:00")], [
      tx({ occurredOn: "2026-10-24", amount: 1 }),
      tx({ occurredOn: "2026-10-25", createdAt: "2026-10-25T04:59:59+00:00", amount: 10 }),
      tx({ occurredOn: "2026-10-25", createdAt: "2026-10-25T05:00:01+00:00", amount: 100 }),
    ]);
    expect(r.bank).toEqual({ balance: 99_900, asOf: "2026-10-25", txCount: 1 });
  });

  it("가장 최근 기록에서 시작한다 (날짜, 같은 날이면 나중 기록)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-01", 1), rec("bank", "2026-10-20", 500), rec("bank", "2026-10-10", 9)], []);
    expect(r.bank).toEqual({ balance: 500, asOf: "2026-10-20", txCount: 0 });
  });

  it("0보다 작아질 수 있다 (마이너스 통장)", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 10_000)], [tx({ amount: 30_000 })]);
    expect(r.bank.balance).toBe(-20_000);
  });

  it("자산이 없는 예전 내역과 다른 자산의 내역은 영향이 없다", () => {
    const r = assetBalances([bank], [rec("bank", "2026-10-25", 10_000)], [tx({ assetId: null }), tx({ assetId: "other" })]);
    expect(r.bank).toEqual({ balance: 10_000, asOf: "2026-10-25", txCount: 0 });
  });

  it("기록이 없는 자산은 결과에 없다", () => {
    expect(assetBalances([bank], [], [])).toEqual({});
  });
});

describe("netContribution", () => {
  it("자산은 그대로, 부채는 빼는 값", () => {
    expect(netContribution(1_000, false)).toBe(1_000);
    expect(netContribution(1_000, true)).toBe(-1_000);
    expect(netContribution(-500, true)).toBe(500);
  });
});
```

import에 `assetBalances`, `netContribution`, `type BalanceTx` 추가. (지운 내역은 읽을 때 이미 뺀다 — `lib/assets.ts`가 `deleted_at is null`로 읽음.)

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/assets.test.ts` → FAIL (`assetBalances` 없음)

- [ ] **Step 3: 구현** — `lib/calc/assets.ts`에 추가 (`import type { TransactionType } from "@/lib/domain";`, `import type { DateString } from "@/lib/date";`)

```ts
export type BalanceRecord = { assetId: string; asOf: DateString; amount: number; createdAt: string };
export type BalanceTx = {
  type: TransactionType;
  amount: number;
  occurredOn: DateString;
  createdAt: string;
  assetId: string | null;
  toAssetId: string | null;
};
export type AssetBalance = { balance: number; asOf: DateString; txCount: number };

const time = (iso: string) => Date.parse(iso);

/** 기록 뒤에 넣은 내역인지: 기록 날짜 다음 날부터, 같은 날이면 기록보다 나중에 저장한 것 */
function isAfter(tx: BalanceTx, record: BalanceRecord): boolean {
  return tx.occurredOn > record.asOf || (tx.occurredOn === record.asOf && time(tx.createdAt) > time(record.createdAt));
}

/** 그 자산(자산 기준 부호)에 내역이 더하는 값. 관계없으면 0 */
function effect(tx: BalanceTx, assetId: string): number {
  if (tx.type === "transfer") {
    if (tx.toAssetId === assetId) return tx.amount;
    if (tx.assetId === assetId) return -tx.amount;
    return 0;
  }
  if (tx.assetId !== assetId) return 0;
  return tx.type === "income" ? tx.amount : -tx.amount;
}

/**
 * 자산 잔액 (2026-10-25): 가장 최근 잔액 기록 + 그 기록 뒤에 넣은 내역.
 * 자산은 수입 +, 지출 −, 이체 받기 +, 보내기 −. 부채는 반대(지출하면 빚이 늘어남).
 * 지운 내역·기록은 미리 빼고 넘긴다. 기록이 없는 자산은 결과에 없다.
 */
export function assetBalances(
  assets: readonly { id: string; isLiability: boolean }[],
  records: readonly BalanceRecord[],
  txs: readonly BalanceTx[],
): Record<string, AssetBalance> {
  const result: Record<string, AssetBalance> = {};
  for (const asset of assets) {
    let latest: BalanceRecord | null = null;
    for (const r of records) {
      if (r.assetId !== asset.id) continue;
      if (!latest || r.asOf > latest.asOf || (r.asOf === latest.asOf && time(r.createdAt) > time(latest.createdAt))) latest = r;
    }
    if (!latest) continue;
    let delta = 0;
    let txCount = 0;
    for (const tx of txs) {
      const e = effect(tx, asset.id);
      if (e === 0 || !isAfter(tx, latest)) continue;
      delta += e;
      txCount += 1;
    }
    result[asset.id] = { balance: latest.amount + (asset.isLiability ? -delta : delta), asOf: latest.asOf, txCount };
  }
  return result;
}

/** 순자산에 더하는 값: 자산은 그대로, 부채는 뺀다 */
export function netContribution(amount: number, isLiability: boolean): number {
  return isLiability ? -amount : amount;
}
```

`netWorth`는 그대로 쓴다 (`amount`에 잔액을 넘긴다 — Task 15).

- [ ] **Step 4: 통과 확인** — `pnpm vitest run lib/calc/assets.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/assets.ts lib/calc/assets.test.ts
git commit -m "자산 잔액 계산: 최근 기록 + 그 뒤 내역 (F-41)"
```

### Task 15: 내역·자산 읽기와 필터

**Files:**
- Modify: `lib/transactions.ts` (`TransactionRecord`, `COLUMNS`, `Row`, `toRecord`, 자산 필터, `LabelMaps.assets`)
- Modify: `lib/calc/filters.ts` (`assets: string[]`, `asset` 파라미터, 유형 `transfer`)
- Test: `lib/calc/filters.test.ts`
- Modify: `lib/assets.ts` (잔액 계산 붙이기)

**Interfaces:**
- Consumes: `assetBalances`, `BalanceTx`, `toTransactionType`, `fetchAll` (`lib/supabase/fetch-all.ts`)
- Produces:
  - `TransactionRecord = { id; type: TransactionType; amount; occurredOn; categoryId: string | null; merchant; memo; assetId: string | null; toAssetId: string | null; scope; memberSlot; source; createdBy; updatedBy; createdAt; updatedAt }`
  - `LabelMaps = { categories: Record<string,{name;icon}>; assets: Record<string, string> }` (지운 자산 이름 포함)
  - `TypeFilter = "all" | "expense" | "income" | "transfer"`, `TransactionFilters.assets: string[]` (주소 `?asset=id,id`)
  - `AssetItem`에 `txCount: number` 추가, `amount`는 **계산한 잔액**, `recordedAmount: number`(가장 최근 기록 금액), `values: AssetValue[]`의 `AssetValue = { id; asOf; amount; createdAt }`
  - `getAssetsOverview()`는 지금처럼 `cache`로 감싼 함수 (레이아웃·자산 화면이 같이 씀)

- [ ] **Step 1: 실패하는 필터 테스트** — `lib/calc/filters.test.ts`에 추가

```ts
describe("자산 필터·이체 유형", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  it("asset 파라미터는 자산 id 목록, 유형 transfer를 읽는다", () => {
    const f = parseFilters({ asset: `${A},잘못된값`, type: "transfer" }, "2026-10");
    expect(f.assets).toEqual([A]);
    expect(f.type).toBe("transfer");
  });
  it("주소로 되돌리면 asset·type이 남는다", () => {
    const f = parseFilters({ asset: A, type: "transfer" }, "2026-10");
    expect(filtersToHref(f, "2026-10")).toBe(`/transactions?type=transfer&asset=${A}`);
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/filters.test.ts` → FAIL

- [ ] **Step 3: 필터 구현** — `lib/calc/filters.ts`

```ts
export type TypeFilter = "all" | "expense" | "income" | "transfer";
```

`TransactionFilters`에 `/** 이 자산이 들어간 내역 (이체의 보내는·받는 쪽 포함) */ assets: string[];` 추가. `parseFilters`:

```ts
    type: type === "expense" || type === "income" || type === "transfer" ? type : "all",
    categories: idList(params.cat),
    assets: idList(params.asset),
```

`filtersToHref`의 `cat` 줄 다음에 `if (f.assets.length) params.set("asset", f.assets.join(","));`.

Run: `pnpm vitest run lib/calc/filters.test.ts` → PASS

- [ ] **Step 4: 내역 읽기** — `lib/transactions.ts`
  - `TransactionRecord`: `type: TransactionType`, `categoryId: string | null`, `assetId: string | null`, `toAssetId: string | null` (`paymentMethodId`는 Task 9에서 지움)
  - `COLUMNS`에 `asset_id, to_asset_id` 추가, `Row`·`toRecord`에 같은 칸 (`type: toTransactionType(row.type)`)
  - `fetchTransactions`의 카테고리 필터 다음:

```ts
  if (q.assets?.length) {
    // 이 자산에서 나간 것(지출·이체 보내기) + 들어온 것(수입·이체 받기). 검색 or와는 AND로 묶인다
    const ids = q.assets.join(",");
    query = query.or(`asset_id.in.(${ids}),to_asset_id.in.(${ids})`);
  }
```

  - `getLabelMaps`:

```ts
export type LabelMaps = {
  categories: Record<string, { name: string; icon: string }>;
  /** 지운 자산 포함 (예전 내역 표시용) */
  assets: Record<string, string>;
};

/** 숨긴 카테고리·지운 자산까지 포함한 이름 (지난 내역 표시용) */
export async function getLabelMaps(): Promise<LabelMaps> {
  const supabase = await createClient();
  const [categories, assets] = await Promise.all([
    supabase.from("categories").select("id, name, icon"),
    supabase.from("assets").select("id, name"),
  ]);
  if (categories.error) throw new Error(`카테고리를 불러오지 못했어요: ${categories.error.message}`);
  if (assets.error) throw new Error(`자산을 불러오지 못했어요: ${assets.error.message}`);
  return {
    categories: Object.fromEntries(categories.data.map((c) => [c.id, { name: c.name, icon: c.icon }])),
    assets: Object.fromEntries(assets.data.map((a) => [a.id, a.name])),
  };
}
```

- [ ] **Step 5: 자산 잔액 읽기** — `lib/assets.ts`

```ts
export type AssetValue = { id: string; asOf: DateString; amount: number; createdAt: string };

export type AssetItem = {
  id: string;
  name: string;
  kind: AssetKind;
  owner: Owner;
  /** 지금 잔액 = 가장 최근 기록 + 그 뒤 내역 (lib/calc/assets.ts assetBalances) */
  amount: number;
  /** 가장 최근 기록의 금액 */
  recordedAmount: number;
  /** 가장 최근 기록의 기준일 */
  valueAsOf: DateString;
  /** 잔액에 반영된 내역 수 (가장 최근 기록 뒤) */
  txCount: number;
  isLiability: boolean;
  memo: string | null;
  /** 잔액 기록, 최근 날짜 먼저 */
  values: AssetValue[];
};
```

`getAssetsOverview` 안에서:

```ts
  const [assetsRes, valuesRes, txs] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, kind, owner, amount, value_as_of, is_liability, memo, created_at")
      .is("deleted_at", null)
      .order("is_liability")
      .order("amount", { ascending: false }),
    supabase
      .from("asset_values")
      .select("id, asset_id, as_of, amount, created_at")
      .is("deleted_at", null)
      .order("as_of", { ascending: false }),
    // 잔액용: 자산이 걸린 내역 전부 (1000줄 넘게 끝까지, Review Focus 5)
    fetchAll("잔액 계산용 내역", (f, t) =>
      supabase
        .from("transactions")
        .select("type, amount, occurred_on, created_at, asset_id, to_asset_id")
        .is("deleted_at", null)
        .or("asset_id.not.is.null,to_asset_id.not.is.null")
        .order("id")
        .range(f, t),
    ),
  ]);
  if (assetsRes.error) throw fail("자산", assetsRes.error);
  if (valuesRes.error) throw fail("잔액 기록", valuesRes.error);

  const records = valuesRes.data.map((v) => ({ id: v.id, assetId: v.asset_id, asOf: v.as_of, amount: v.amount, createdAt: v.created_at }));
  const balances = assetBalances(
    assetsRes.data.map((a) => ({ id: a.id, isLiability: a.is_liability })),
    records,
    txs.map((t) => ({
      type: toTransactionType(t.type),
      amount: t.amount,
      occurredOn: t.occurred_on,
      createdAt: t.created_at,
      assetId: t.asset_id,
      toAssetId: t.to_asset_id,
    })),
  );

  return {
    assets: assetsRes.data.map((a) => {
      const b = balances[a.id];
      return {
        id: a.id,
        name: a.name,
        kind: toAssetKind(a.kind),
        owner: toOwner(a.owner),
        amount: b?.balance ?? a.amount,
        recordedAmount: a.amount,
        valueAsOf: b?.asOf ?? a.value_as_of ?? todayKST(new Date(a.created_at)),
        txCount: b?.txCount ?? 0,
        isLiability: a.is_liability,
        memo: a.memo,
        values: records.filter((r) => r.assetId === a.id).map(({ id, asOf, amount, createdAt }) => ({ id, asOf, amount, createdAt })),
      };
    }),
  };
```

(import: `assetBalances` from `./calc/assets`, `toTransactionType` from `./domain`, `fetchAll` from `./supabase/fetch-all`.) 정렬은 잔액이 바뀌므로 화면 쪽 `groupAssets`가 다시 정렬한다(이미 금액 큰 순).

- [ ] **Step 6: 확인** — `pnpm vitest run lib/calc/filters.test.ts lib/calc/assets.test.ts` PASS. `pnpm typecheck`의 남은 오류는 Task 16~19의 화면 파일이다.

- [ ] **Step 7: 커밋**

```bash
git add lib/transactions.ts lib/calc/filters.ts lib/calc/filters.test.ts lib/assets.ts
git commit -m "내역에 자산 읽기·자산 필터, 자산 잔액을 내역으로 계산해 읽기 (F-12, F-41)"
```

### Task 16: 내역 저장 액션

**Files:**
- Modify: `app/(app)/transactions/actions.ts`
- Modify: `lib/action-result.ts` (`transfer_same_asset` 추가, `invalid_asset` 문구를 내역에도 맞게)

**Interfaces:**
- Consumes: `transactionInputSchema` (Task 12)
- Produces: `saveTransaction(input: TransactionInput): Promise<ActionResult>` (모양은 그대로, 인자에 `assetId`·`toAssetId`)

- [ ] **Step 1: 구현** — `saveTransaction`의 `values`

```ts
  const values = {
    type: v.type,
    amount: v.amount,
    occurred_on: v.occurredOn,
    category_id: v.categoryId,
    merchant: v.merchant,
    memo: v.memo,
    asset_id: v.assetId,
    to_asset_id: v.toAssetId,
    scope: v.scope,
    member_slot: v.memberSlot,
  };
```

`lib/action-result.ts`:

```ts
  invalid_asset: "자산을 찾을 수 없어요. 새로고침 후 다시 골라 주세요",
  transfer_same_asset: "보내는 자산과 받는 자산이 같아요. 다른 자산을 골라 주세요",
```

DB 검사(`transactions_shape`) 위반은 코드 `23514`로 온다. `dbErrorMessage`에 추가:

```ts
  // 23514: check 위반 (이체 모양 등). 화면 검증을 지나왔다면 오래된 화면일 가능성이 크다
  if (error.code === "23514") return "입력값이 맞지 않아요. 새로고침 후 다시 저장해 주세요";
```

- [ ] **Step 2: 확인** — `pnpm vitest run` 전체 PASS (액션은 E2E에서 확인)

- [ ] **Step 3: 커밋**

```bash
git add "app/(app)/transactions/actions.ts" lib/action-result.ts
git commit -m "내역 저장에 자산·받는 자산 칸 (F-10)"
```

### Task 17: 내역 입력 창 — 자산 고르기와 이체

**Files:**
- Create: `lib/calc/asset-options.ts`, `lib/calc/asset-options.test.ts`
- Create: `components/transactions/AssetSelect.tsx`
- Create: `components/transactions/useTransactionDelete.ts` (폼을 200줄 아래로)
- Modify: `components/transactions/TransactionForm.tsx`
- Modify: `components/transactions/types.ts` (`PanelData.assets`)
- Modify: `app/(app)/layout.tsx` (패널에 자산 넘기기)

**Interfaces:**
- Consumes: `AssetItem` (Task 15), `defaultAssignment(owner, mySlot)` (`lib/calc/assignment.ts`), `TRANSACTION_TYPES`·`TRANSACTION_TYPE_LABEL` (Task 12)
- Produces:
  - `PanelData.assets: AssetOption[]`, `AssetOption = { id: string; name: string; owner: Owner; isLiability: boolean; amount: number }`
  - `assetSelectOptions(assets: readonly AssetOption[], current: string | null, labels: Record<string, string>): { value: string; label: string }[]`

- [ ] **Step 1: 실패하는 테스트** — `lib/calc/asset-options.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { assetSelectOptions } from "./asset-options";

const bank = { id: "bank", name: "생활비통장", owner: "joint", isLiability: false, amount: 1_234_000 } as const;
const card = { id: "card", name: "현대카드", owner: "a", isLiability: true, amount: 350_000 } as const;

describe("assetSelectOptions", () => {
  it("자산 먼저, 부채는 뒤에. 이름 옆에 지금 잔액 (부채는 −)", () => {
    expect(assetSelectOptions([card, bank], null, {})).toEqual([
      { value: "bank", label: "생활비통장 1,234,000원" },
      { value: "card", label: "현대카드 (부채) −350,000원" },
    ]);
  });
  it("고른 자산이 지워져 목록에 없으면 이름과 함께 맨 아래에 남긴다 (Review Focus 4)", () => {
    expect(assetSelectOptions([bank], "gone", { gone: "옛 통장" }).at(-1)).toEqual({ value: "gone", label: "옛 통장 (지운 자산)" });
  });
  it("마이너스 잔액은 −로", () => {
    expect(assetSelectOptions([{ ...bank, amount: -20_000 }], null, {})[0].label).toBe("생활비통장 −20,000원");
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/asset-options.test.ts` → FAIL (모듈 없음)

- [ ] **Step 3: 구현** — `lib/calc/asset-options.ts`

```ts
/**
 * 내역 입력 창의 자산 고르기 목록 (2026-10-25). 자산 먼저, 부채는 뒤. 이름 옆에 지금 잔액.
 */
import type { Owner } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { netContribution } from "./assets";

export type AssetOption = { id: string; name: string; owner: Owner; isLiability: boolean; amount: number };

function signed(value: number): string {
  return `${value < 0 ? "−" : ""}${formatWon(Math.abs(value))}`;
}

export function assetSelectOptions(
  assets: readonly AssetOption[],
  current: string | null,
  labels: Record<string, string>,
): { value: string; label: string }[] {
  const sorted = [...assets].sort((a, b) => Number(a.isLiability) - Number(b.isLiability));
  const options = sorted.map((a) => ({
    value: a.id,
    label: `${a.name}${a.isLiability ? " (부채)" : ""} ${signed(netContribution(a.amount, a.isLiability))}`,
  }));
  if (current && !assets.some((a) => a.id === current)) {
    options.push({ value: current, label: `${labels[current] ?? "자산"} (지운 자산)` });
  }
  return options;
}
```

Run: `pnpm vitest run lib/calc/asset-options.test.ts` → PASS

- [ ] **Step 4: 고르기 부품** — `components/transactions/AssetSelect.tsx`

```tsx
"use client";

import { Select } from "@/components/ui/Select";
import { assetSelectOptions, type AssetOption } from "@/lib/calc/asset-options";

type Props = {
  id: string;
  label: string;
  assets: AssetOption[];
  /** 지운 자산 이름 (예전 내역) */
  labels: Record<string, string>;
  value: string | null;
  onChange: (id: string | null) => void;
  /** 예전 내역(자산 없음)을 고칠 때만 "자산 없음"을 고를 수 있다 */
  allowEmpty: boolean;
};

/** 자산 고르기 (2026-10-25). 지출·수입은 이 자산에서 나가고 들어온다 */
export function AssetSelect({ id, label, assets, labels, value, onChange, allowEmpty }: Props) {
  return (
    <Select
      id={id}
      label={label}
      value={value ?? ""}
      onChange={(v) => onChange(v === "" ? null : v)}
      placeholder="골라 주세요"
      emptyLabel={allowEmpty ? "자산 없음" : undefined}
      options={assetSelectOptions(assets, value, labels)}
    />
  );
}
```

`components/transactions/types.ts`:

```ts
import type { AssetOption } from "@/lib/calc/asset-options";
// …
export type PanelData = {
  categories: CategoryOption[];
  /** 지금 있는 자산 (잔액 포함) */
  assets: AssetOption[];
  /** 지운 자산까지 이름 (예전 내역 편집) */
  assetNames: Record<string, string>;
  members: HouseholdMember[];
  names: MemberNames;
  mySlot: Slot;
  rules: Record<string, string>;
};
```

`app/(app)/layout.tsx`: `getAssetsOverview()`와 `getLabelMaps()`를 `Promise.all`에 더하고

```ts
  const assets = overview.assets.map(({ id, name, owner, isLiability, amount }) => ({ id, name, owner, isLiability, amount }));
  // …
  <TransactionPanelProvider data={{ categories, assets, assetNames: labels.assets, members, names, mySlot: me.slot, rules }}>
```

- [ ] **Step 5: 삭제·되돌리기 훅 분리** — `components/transactions/useTransactionDelete.ts` (기존 `remove()`를 그대로 옮김)

```ts
"use client";

import { useTransition } from "react";
import { deleteTransaction, restoreTransaction } from "@/app/(app)/transactions/actions";
import { useToast } from "@/components/ui/Toast";

/** 내역 삭제 + 5초 되돌리기 (F-11). 패널은 바로 닫고 삭제는 뒤에서 한다 */
export function useTransactionDelete(onDone: () => void) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  return (id: string) => {
    onDone();
    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (result.error) return toast(result.error);
      toast("삭제했어요", {
        durationMs: 5000,
        action: {
          label: "되돌리기",
          onClick: () => {
            void restoreTransaction(id).then((r) => toast(r.error ?? "되돌렸어요"));
          },
        },
      });
    });
  };
}
```

- [ ] **Step 6: 폼** — `components/transactions/TransactionForm.tsx`에서 바꿀 곳

```tsx
import { TRANSACTION_TYPE_LABEL, TRANSACTION_TYPES, type CategoryType, type Scope, type Slot, type TransactionType } from "@/lib/domain";
import { AssetSelect } from "./AssetSelect";
import { useTransactionDelete } from "./useTransactionDelete";

const TYPE_OPTIONS = TRANSACTION_TYPES.map((value) => ({ value, label: TRANSACTION_TYPE_LABEL[value] }));
```

상태:

```tsx
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [assetId, setAssetId] = useState<string | null>(initial?.assetId ?? null);
  const [toAssetId, setToAssetId] = useState<string | null>(initial?.toAssetId ?? null);
  const removeTx = useTransactionDelete(onDone);
  // 예전 내역(자산 없이 저장된 지출·수입)을 고칠 때만 "자산 없음"을 남겨 둔다 (Review Focus 2)
  const allowNoAsset = Boolean(record && record.type !== "transfer" && record.assetId === null);
```

카테고리 추천은 지출·수입에만:

```tsx
  const categoryType: CategoryType = type === "income" ? "income" : "expense";
  const categories = data.categories.filter((c) => c.type === categoryType);

  function changeType(next: TransactionType) {
    setType(next);
    if (next === "transfer") return;
    if (!categoryTouched) setCategoryId(suggest(merchant, next));
    else if (!data.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId(null);
  }

  function changeMerchant(value: string) {
    setMerchant(value);
    if (!categoryTouched && type !== "transfer") setCategoryId(suggest(value, type));
  }

  // 자산을 고르면 구분·사람 기본값을 그 자산 소유로 (예전 결제수단과 같은 규칙, §8.1)
  function changeAsset(id: string | null) {
    setAssetId(id);
    const next = defaultAssignment(data.assets.find((a) => a.id === id)?.owner ?? null, data.mySlot);
    setScope(next.scope);
    setMemberSlot(next.memberSlot);
  }
```

`changePaymentMethod`는 Task 9에서 지웠다. `suggest`의 두 번째 인자 타입은 `CategoryType` 그대로(이체에서는 부르지 않음).

저장 인자:

```tsx
      const result = await saveTransaction({
        id: record?.id,
        type,
        amount: amount ?? 0,
        occurredOn,
        categoryId: type === "transfer" ? null : categoryId,
        merchant,
        memo,
        assetId,
        toAssetId: type === "transfer" ? toAssetId : null,
        scope,
        memberSlot,
      });
      if (result.error) return setError(result.error);
      if (categoryId && type !== "transfer") onLearn(merchant, categoryId);
```

"계속 추가"로 비울 때 자산은 남겨 둔다(같은 통장으로 여러 건 넣는 일이 많음) — 지금 코드의 초기화 목록에 `setAssetId`를 넣지 않는다.

`remove()` 함수를 지우고 `onDelete={record ? () => removeTx(record.id) : null}`. `deleteTransaction`·`restoreTransaction` import 삭제.

입력 칸 (금액·날짜 다음):

```tsx
        {type === "transfer" ? (
          <>
            <AssetSelect id="tx-asset" label="보내는 자산" assets={data.assets} labels={data.assetNames} value={assetId} onChange={setAssetId} allowEmpty={false} />
            <AssetSelect id="tx-to-asset" label="받는 자산" assets={data.assets} labels={data.assetNames} value={toAssetId} onChange={setToAssetId} allowEmpty={false} />
          </>
        ) : (
          <>
            <TextField label="가맹점·내용 (선택)" value={merchant} onChange={(e) => changeMerchant(e.target.value)} maxLength={50} />
            <CategoryGrid categories={categories} value={categoryId} onChange={pickCategory} />
            <AssetSelect
              id="tx-asset"
              label={type === "income" ? "들어온 자산" : "나간 자산"}
              assets={data.assets}
              labels={data.assetNames}
              value={assetId}
              onChange={changeAsset}
              allowEmpty={allowNoAsset}
            />
          </>
        )}
```

`AssignmentFields`와 메모 칸은 그대로 (이체도 누가 옮겼는지 남김). 자산이 하나도 없을 때(`data.assets.length === 0`) 자산 칸 아래에 안내:

```tsx
        {data.assets.length === 0 ? (
          <p className="text-caption text-ink-muted">
            먼저 자산 화면에서 통장이나 카드를 추가해 주세요.
          </p>
        ) : null}
```

- [ ] **Step 7: 줄 수·타입 확인** — Run: `(Get-Content components/transactions/TransactionForm.tsx | Measure-Object -Line).Lines` → 200 이하. 넘으면 지출·수입 칸 묶음(`TextField` + `CategoryGrid` + `AssetSelect`)을 `components/transactions/SpendFields.tsx`로 옮긴다(props: `merchant, onMerchantChange, categories, categoryId, onCategoryPick, assets, assetNames, assetId, onAssetChange, allowEmpty, type`).
Run: `pnpm typecheck` → 이 파일 오류 0

- [ ] **Step 8: 화면 확인** — `pnpm dev`, E2E 계정 A로 로그인해(`e2e/support/accounts.ts` 값으로 직접 로그인, 또는 Task 21 이후 E2E로) 지출 → 나간 자산 고르기, 이체 → 두 칸이 보이는지, 같은 자산을 두 번 고르면 "보내는 자산과 받는 자산이 같아요…" 오류. PC·폰 폭 확인. **실제 계정으로 저장하지 않는다.**

- [ ] **Step 9: 커밋**

```bash
git add lib/calc/asset-options.ts lib/calc/asset-options.test.ts components/transactions "app/(app)/layout.tsx"
git commit -m "내역 입력 창에 자산 고르기와 이체 (F-10)"
```

### Task 18: 내역 목록·필터에 이체와 자산

**Files:**
- Modify: `components/transactions/TransactionList.tsx`
- Modify: `components/transactions/FilterBar.tsx`, `app/(app)/transactions/page.tsx`

**Interfaces:**
- Consumes: `LabelMaps.assets` (Task 15), `TypeFilter` with `transfer`, `TransactionFilters.assets`

- [ ] **Step 1: 목록** — `TransactionList.tsx`의 행 안 (import에 `ArrowLeftRight` from `lucide-react`)

```tsx
            {group.items.map((tx) => {
              const owner = ownerOfTransaction(tx.scope, tx.memberSlot);
              const assetName = (id: string | null) => (id ? (labels.assets[id] ?? "자산") : null);
              const isTransfer = tx.type === "transfer";
              const category = tx.categoryId ? labels.categories[tx.categoryId] : undefined;
              const title = isTransfer
                ? `${assetName(tx.assetId)} → ${assetName(tx.toAssetId)}`
                : (tx.merchant ?? category?.name ?? "내역");
              const sub = isTransfer ? ["이체", tx.memo] : [category?.name, assetName(tx.assetId), tx.memo];
              const amountClass = isTransfer ? "text-ink-muted" : tx.type === "income" ? "text-income" : "text-expense";
              return (
                <li key={tx.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openEdit(tx)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-sunken/60"
                  >
                    {isTransfer ? (
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink" aria-hidden>
                        <ArrowLeftRight size={20} strokeWidth={1.75} />
                      </span>
                    ) : (
                      <CategoryIcon name={category?.icon ?? "circle-ellipsis"} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-ink">{title}</span>
                      <span className="block truncate text-caption text-ink-muted">{sub.filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`text-amount tabular-nums ${amountClass}`}>
                        {tx.type === "income" ? "+" : ""}
                        {formatWon(tx.amount)}
                      </span>
                      <PersonChip owner={owner} label={ownerLabel(owner, names)} />
                    </span>
                  </button>
                </li>
              );
            })}
```

- [ ] **Step 2: 필터** — `FilterBar.tsx`: prop `assets: { id: string; name: string }[]`를 받는다. 유형 세그먼트에 `{ value: "transfer", label: "이체" }`를 더하고, 유형이 `transfer`면 카테고리 체크 목록을 숨긴다. 결제수단이 있던 자리에

```tsx
            <CheckboxList
              legend="자산"
              options={assets.map((a) => ({ value: a.id, label: a.name }))}
              selected={filters.assets}
              onChange={(ids) => apply({ assets: ids })}
            />
```

(`CheckboxList`의 실제 prop 이름은 기존 결제수단 목록이 쓰던 그대로 따른다.) 초기화: `apply({ type: "all", categories: [], assets: [] })`.

`app/(app)/transactions/page.tsx`: `getAssetsOverview()`를 읽어 `<FilterBar … assets={overview.assets.map(({ id, name }) => ({ id, name }))} />`.

- [ ] **Step 3: 확인** — `pnpm typecheck`·`pnpm lint` 통과, `pnpm dev`에서 `/transactions?type=transfer`, `/transactions?asset=<id>` 화면 확인 (보기만)

- [ ] **Step 4: 커밋**

```bash
git add components/transactions "app/(app)/transactions/page.tsx"
git commit -m "내역 목록에 이체 줄과 자산 이름, 자산·이체 필터 (F-12)"
```

### Task 19: 자산 화면과 사이드바 자산 목록

**Files:**
- Modify: `components/assets/AssetList.tsx` (잔액·설명 줄)
- Modify: `components/assets/AssetValueHistory.tsx` (문구 "잔액 맞추기")
- Modify: `components/assets/AssetEditor.tsx` ("이 자산 내역 보기" 링크)
- Create: `components/layout/SidebarAssets.tsx` (지운 `SidebarMethods.tsx`의 접기 동작을 그대로 가져옴)
- Modify: `components/layout/SidebarContent.tsx`, `Sidebar.tsx`, `MobileMenu.tsx`, `app/(app)/layout.tsx` (`sidebar.assets`)
- Modify: `e2e/settings.spec.ts` (사이드바 접기 테스트를 자산 목록으로 다시 씀)

**Interfaces:**
- Consumes: `AssetItem.amount`(잔액), `txCount`, `valueAsOf`, `netContribution`
- Produces: `SidebarAssets({ assets: AssetOption[]; onNavigate?: () => void })`

- [ ] **Step 1: 목록 행** — `AssetList.tsx`의 항목 행 설명·금액

```tsx
                          <span className="block truncate text-caption text-ink-muted">
                            {ASSET_KIND_LABEL[a.kind]} · {formatDayHeader(a.valueAsOf, currentYear)} 기록
                            {a.txCount ? ` + 내역 ${a.txCount}건` : ""}
                          </span>
```

```tsx
                          <span className="text-body text-ink tabular-nums">{signedWon(netContribution(a.amount, a.isLiability))}</span>
```

묶음 합계도 `signedWon(group.isLiability ? -group.total : group.total)`. 같은 파일 위에:

```tsx
/** 순자산 기준 부호: 0보다 작으면 "−" (부채, 마이너스 통장) */
const signedWon = (value: number) => `${value < 0 ? "−" : ""}${formatWon(Math.abs(value))}`;
```

빈 목록 문구: `통장, 카드, 적금, 보증금 같은 항목을 추가하면 내역과 함께 잔액을 계산해 줘요.`

- [ ] **Step 2: 잔액 맞추기 문구** — `AssetValueHistory.tsx`: 주석 `/** 잔액 맞추기 (F-41): 실제 잔액을 적으면 그때부터 내역으로 다시 계산한다 */`, 버튼·제목의 "금액 기록 추가" → "잔액 맞추기", 토스트 "금액을 기록했어요" → "잔액을 맞췄어요", 목록 제목 "금액 기록" → "잔액 기록". 금액 입력칸 라벨은 "지금 잔액"으로, 안내 한 줄: `이 날짜 이후에 넣은 내역부터 잔액에 더하고 빼요.`

`AssetEditor.tsx`의 기존 항목 편집 화면 아래쪽(삭제 버튼 위)에:

```tsx
          <Link
            href={`/transactions?asset=${item.id}`}
            onClick={onClose}
            className="inline-flex h-11 items-center text-body font-semibold text-primary underline-offset-4 hover:underline"
          >
            이 자산 내역 보기
          </Link>
```

(`import Link from "next/link";`) 파일이 200줄을 넘으면 링크와 기록 부분을 `AssetDetailFooter.tsx`로 나눈다.

- [ ] **Step 3: 사이드바** — `components/layout/SidebarAssets.tsx`: `git show main:components/layout/SidebarMethods.tsx`(`main`에는 아직 남아 있음)의 `STORAGE_KEY`·`read`·`subscribe`·`save` 부분을 그대로 복사하고(`STORAGE_KEY = "sidebar-assets-collapsed"`), 화면 부분을 아래로.

```tsx
type Props = { assets: AssetOption[]; onNavigate?: () => void };

/** 사이드바 자산 목록 (2026-10-25, "계좌·카드" 자리). 제목을 누르면 접고 편다. 누르면 그 자산 내역 */
export function SidebarAssets({ assets, onNavigate }: Props) {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  return (
    <section aria-labelledby="sidebar-assets" className="pt-6">
      <div className="flex items-center gap-1 pb-1">
        <h2 id="sidebar-assets" className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="sidebar-assets-list"
            onClick={() => save(!collapsed)}
            className="flex h-8 w-full items-center gap-1 rounded-sm px-3 text-left text-label text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <span className="min-w-0 flex-1 truncate">자산</span>
            {collapsed ? <span className="text-caption tabular-nums">{assets.length}</span> : null}
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>
        </h2>
        <Link
          href="/assets"
          onClick={onNavigate}
          aria-label="자산 관리"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <ul id="sidebar-assets-list" hidden={collapsed}>
        {assets.map((a) => {
          const value = netContribution(a.amount, a.isLiability);
          return (
            <li key={a.id}>
              <Link
                href={`/transactions?asset=${a.id}`}
                onClick={onNavigate}
                className="flex h-9 items-center gap-2 rounded-sm px-3 text-body text-ink hover:bg-surface-sunken"
              >
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="shrink-0 text-caption text-ink-muted tabular-nums">
                  {value < 0 ? "−" : ""}
                  {formatWon(Math.abs(value))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

(사람 색 점은 넣지 않는다 — 이름 글자 없이 색만 쓰게 되므로.) `SidebarContent.tsx`에서 `<SidebarAssets assets={assets} onNavigate={onNavigate} />`, `layout.tsx`의 `sidebar`에 `assets` 추가, `Sidebar`·`MobileMenu` props에 전달.

- [ ] **Step 4: E2E 사이드바 테스트** — `e2e/settings.spec.ts`의 접기 테스트를 `/자산/` 버튼으로 바꿔 다시 쓴다 (`getByRole("button", { name: /^자산/ })`, 접고 → 새로고침 → `aria-expanded="false"` → 펼침).

- [ ] **Step 5: 확인** — `pnpm typecheck`, `pnpm lint`, `pnpm test` 통과. `pnpm dev`로 PC·폰 폭에서 자산 화면·사이드바 확인 (보기만)

- [ ] **Step 6: 커밋**

```bash
git add components "app/(app)/layout.tsx" e2e/settings.spec.ts
git commit -m "자산 화면 잔액·잔액 맞추기, 사이드바에 자산 잔액 목록 (F-40, F-41)"
```

### Task 20: 이체 알림 문장

**Files:**
- Modify: `lib/calc/notifications.ts`, `lib/calc/notifications.test.ts`
- Modify: `lib/notifications.ts` (`tx_type` 읽기)

**Interfaces:**
- Produces: `NotificationItem.txType: TransactionType | null`; `notificationSentence`는 `txType`을 받는다

- [ ] **Step 1: 실패하는 테스트**

```ts
describe("이체 알림", () => {
  it("“보내는 → 받는 금액 이체를 추가했어요”", () => {
    expect(
      notificationSentence({ kind: "created", subject: "생활비통장 → 현대카드", amount: 500_000, count: 1, txType: "transfer" }, "서연"),
    ).toBe("서연님이 생활비통장 → 현대카드 500,000원 이체를 추가했어요");
    expect(
      notificationSentence({ kind: "deleted", subject: "생활비통장 → 현대카드", amount: 500_000, count: 1, txType: "transfer" }, "지훈"),
    ).toBe("지훈님이 생활비통장 → 현대카드 500,000원 이체를 삭제했어요");
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm vitest run lib/calc/notifications.test.ts` → FAIL

- [ ] **Step 3: 구현** — `NotificationItem`에 `/** 내역 알림의 유형 (이체 문장용) */ txType: TransactionType | null;` 추가. `notificationSentence`의 인자 타입에 `txType?: TransactionType | null`, 마지막 줄을

```ts
  const what = `${item.subject ?? "내역"} ${formatWon(item.amount ?? 0)}`;
  const verb = ACTION_TEXT[item.kind as keyof typeof ACTION_TEXT];
  if (item.txType === "transfer") return `${who} ${what} 이체를 ${verb}`;
  return `${who} ${what}을 ${verb}`;
```

`lib/notifications.ts`: select에 `tx_type`, 매핑에 `txType: n.tx_type ? toTransactionType(n.tx_type) : null`. `lib/calc/push.ts`의 Pick에 `"txType"` 추가.

- [ ] **Step 4: 통과 확인** — `pnpm vitest run lib/calc/notifications.test.ts lib/calc/push.test.ts` PASS, `pnpm typecheck` 통과

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/notifications.ts lib/calc/notifications.test.ts lib/notifications.ts lib/calc/push.ts
git commit -m "이체 알림 문장 (F-17)"
```

### Task 21: E2E — 자산 준비, 기존 테스트 고치기, 잔액 흐름

**Files:**
- Modify: `e2e/support/accounts.ts` (가구에 자산 두 개 만들기)
- Modify: `e2e/transactions.spec.ts`, `e2e/notifications.spec.ts`, `e2e/mobile.spec.ts`, `e2e/search-pickers.spec.ts`, `e2e/period.spec.ts` 등 내역을 저장하는 테스트 (자산 고르기 추가)
- Create: `e2e/asset-balance.spec.ts`

**Interfaces:**
- Produces: `E2E_ASSETS = { bank: "E2E 통장", card: "E2E 카드" }` (`accounts.ts`에서 export)

- [ ] **Step 1: 자산 준비** — `createE2EAccounts()`에서 B 합류 뒤:

```ts
export const E2E_ASSETS = { bank: "E2E 통장", card: "E2E 카드" } as const;

  // 내역 저장에 자산이 필요하다 (2026-10-25). 통장 100만 원, 카드(부채) 0원
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  for (const [name, isLiability, amount] of [[E2E_ASSETS.bank, false, 1_000_000], [E2E_ASSETS.card, true, 0]] as const) {
    const { data: asset, error: assetError } = await a
      .from("assets")
      .insert({ name, kind: isLiability ? "other" : "deposit", owner: "joint", is_liability: isLiability, amount, value_as_of: today })
      .select("id")
      .single();
    if (assetError) throw assetError;
    const { error: valueError } = await a.rpc("set_asset_value", { p_asset_id: asset.id, p_as_of: today, p_amount: amount });
    if (valueError) throw valueError;
  }
```

(`household_id`는 넣지 않는다: `assets_force_household` 트리거가 로그인한 사람의 가구로 채운다.)

`deleteE2EAccounts()`: `transactions` 삭제 다음에 `await admin.from("asset_values").delete().in("household_id", households); await admin.from("assets").delete().in("household_id", households);` 추가.

- [ ] **Step 2: 기존 테스트에 자산 고르기** — 패널에서 저장하는 모든 곳에 아래 두 줄을 저장 전에 넣는다 (`rg -n "Control\+Enter|name: \"저장\"" e2e`로 위치 찾기).

```ts
  await panel.getByRole("combobox", { name: "나간 자산" }).click();
  await page.getByRole("option", { name: /^E2E 통장/ }).click();
```

DB로 직접 넣는 테스트(`a.from("transactions").insert(...)`)는 그대로 둔다 (DB는 자산 없는 지출을 허용).

- [ ] **Step 3: 새 테스트** — `e2e/asset-balance.spec.ts`

```ts
import { expect, test } from "@playwright/test";
import { E2E_ASSETS } from "./support/accounts";
import { login } from "./support/login";

async function pick(page: import("@playwright/test").Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: new RegExp(`^${name}`) }).click();
}

test("지출하면 통장 잔액이 줄고, 이체하면 양쪽이 바뀌고, 잔액 맞추기 뒤부터 다시 계산한다", async ({ page }) => {
  await login(page, "a", "/transactions");

  // 지출 12,000원 (통장)
  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill("12000");
  await panel.getByRole("radio", { name: "생활·마트" }).click();
  await pick(page, "나간 자산", E2E_ASSETS.bank);
  await panel.getByLabel("가맹점·내용 (선택)").press("Control+Enter");
  await expect(panel).toBeHidden();

  // 이체 300,000원 통장 → 카드
  await page.keyboard.press("n");
  await panel.getByRole("radio", { name: "이체" }).click();
  await panel.getByLabel("금액").fill("300000");
  await pick(page, "보내는 자산", E2E_ASSETS.bank);
  await pick(page, "받는 자산", E2E_ASSETS.card);
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(`${E2E_ASSETS.bank} → ${E2E_ASSETS.card}`) })).toBeVisible();

  // 자산 화면: 통장 1,000,000 − 12,000 − 300,000 = 688,000, 카드(부채) 0 − 300,000 = −300,000 → 순자산 기여 +300,000
  await page.goto("/assets");
  const list = page.getByRole("region", { name: "자산·부채" });
  for (const button of await list.getByRole("button", { expanded: false }).all()) await button.click();
  await expect(list.getByRole("button", { name: new RegExp(E2E_ASSETS.bank) })).toContainText("688,000원");
  await expect(list.getByRole("button", { name: new RegExp(E2E_ASSETS.bank) })).toContainText("내역 2건");
  await expect(list.getByRole("button", { name: new RegExp(E2E_ASSETS.card) })).toContainText("300,000원");

  // 잔액 맞추기: 통장을 오늘 700,000원으로 → 앞의 두 건은 더 이상 빼지 않음
  await list.getByRole("button", { name: new RegExp(E2E_ASSETS.bank) }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("지금 잔액").fill("700000");
  await editor.getByRole("button", { name: "잔액 맞추기" }).click();
  await expect(page.getByText("잔액을 맞췄어요")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list.getByRole("button", { name: new RegExp(E2E_ASSETS.bank) })).toContainText("700,000원");

  // 이 자산 내역 보기 → 자산 필터 (이체 포함)
  await list.getByRole("button", { name: new RegExp(E2E_ASSETS.bank) }).click();
  await page.getByRole("link", { name: "이 자산 내역 보기" }).click();
  await expect(page).toHaveURL(/asset=/);
  await expect(page.getByRole("button", { name: new RegExp(`${E2E_ASSETS.bank} → ${E2E_ASSETS.card}`) })).toBeVisible();
});

test("이체에 같은 자산을 두 번 고르면 저장되지 않고 이유를 알려준다", async ({ page }) => {
  await login(page, "a", "/transactions");
  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByRole("radio", { name: "이체" }).click();
  await panel.getByLabel("금액").fill("1000");
  await pick(page, "보내는 자산", E2E_ASSETS.bank);
  await pick(page, "받는 자산", E2E_ASSETS.bank);
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel.getByText("보내는 자산과 받는 자산이 같아요. 다른 자산을 골라 주세요")).toBeVisible();
});

test("자산 없이 저장된 예전 내역은 자산을 비워 둔 채 고쳐 저장된다", async ({ page }) => {
  // DB에 자산 없는 지출을 직접 넣는다 (예전 내역)
  const { userClient, readCreds } = await import("./support/accounts");
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const { data: cat } = await a.from("categories").select("id").eq("type", "expense").limit(1).single();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  await a.from("transactions").insert({ type: "expense", amount: 4_500, occurred_on: today, category_id: cat!.id, merchant: "E2E 예전 내역", scope: "joint", member_slot: "a" });

  await login(page, "a", "/transactions");
  await page.getByRole("button", { name: /E2E 예전 내역/ }).click();
  const edit = page.getByRole("dialog", { name: "내역 수정" });
  await expect(edit.getByRole("combobox", { name: "나간 자산" })).toContainText("자산 없음");
  await edit.getByLabel("메모 (선택)").fill("고침");
  await edit.getByRole("button", { name: "저장" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole("button", { name: /E2E 예전 내역/ })).toContainText("고침");
});
```

(`readCreds()`는 `global-setup.ts`가 저장해 둔 E2E 계정 정보를 읽는다. 테스트 데이터는 전체 teardown이 가구째 지운다.)

- [ ] **Step 4: 실행** — 3000번 서버를 끄고 Run: `pnpm test:e2e` → 모두 PASS. 실패하면 화면 문구·라벨을 코드와 맞춘다(테스트를 느슨하게 바꾸지 않는다). 끝나면 `pnpm dev`를 다시 켠다.

- [ ] **Step 5: 커밋**

```bash
git add e2e
git commit -m "E2E: 자산 준비, 지출·이체·잔액 맞추기·예전 내역 고치기 (F-10, F-41)"
```

### Task 22: 정리 마이그레이션·문서·합치기·배포

**Files:**
- Create: `supabase/migrations/20261025200000_simplify_cleanup.sql`
- Modify: `lib/supabase/types.ts` (`pnpm db:types`)
- Modify: `lib/action-result.ts` (`invalid_payment_method`, `invalid_recurring_item` 삭제)
- Modify: `e2e/support/accounts.ts` (`recurring_items` 삭제 줄 제거)
- Modify: `SPEC.md`, `spec/transactions.md`, `spec/assets.md`, `spec/data-model.md`, `design/README.md`, `docs/history/2026-10-25.md`, `docs/phone-checklist.md`, `docs/progress.md`

- [ ] **Step 1: 백업 다시** — Run: `node --env-file=.env.local tmp/backup-simplify.cjs` (최신 데이터로 덮어씀)

- [ ] **Step 2: 정리 마이그레이션 작성**

```sql
-- 앱 단순화 정리 (2026-10-25): 뺀 기능의 표·함수·칸을 지운다. 지우기 전 데이터는 로컬 tmp/simplify-backup-*.json
-- 남기는 것: households·members·invites·categories·transactions·merchant_rules·notifications·moods·push_subscriptions·
--           assets·asset_values·period_overrides·custom_holidays·holiday_presets·holiday_sync

-- 1) 알림: 뺀 기능의 알림 지우기, 칸 정리
delete from public.notifications
where kind not in ('created', 'updated', 'deleted', 'restored', 'mood_set');
alter table public.notifications
  drop column note_id,
  drop column event_id,
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in ('created', 'updated', 'deleted', 'restored', 'mood_set'));

-- 2) 메모·일정·대출
drop table public.notes cascade;
drop table public.events cascade;
drop table public.loan_scenarios cascade;
drop table public.loan_debts cascade;
drop table public.loan_profiles cascade;
drop function if exists public.notes_before_write(), public.notify_note_changed(), public.note_subject(text, jsonb),
  public.note_items_content(jsonb), public.toggle_note_item(uuid, text, boolean),
  public.events_before_write(), public.notify_event_changed(), public.set_event_occurrence_skipped(uuid, date, boolean),
  public.detach_event_occurrence(uuid, date),
  public.loan_profiles_before_write(), public.loan_items_before_write(), public.loan_debts_check_asset(),
  public.set_loan_rule_group(text, jsonb);

-- 3) 정기지출: 내역의 연결 칸 먼저
drop index if exists public.transactions_recurring_once;
alter table public.transactions
  drop constraint if exists transactions_recurring_pair,
  drop column recurring_item_id,
  drop column recurring_month;
drop table public.recurring_items cascade;

-- 4) 예산
drop table public.spend_budget_amounts cascade;
drop table public.spend_budget_methods cascade;
drop table public.spend_budgets cascade;
drop table public.budget_months cascade;
drop table public.budgets cascade;

-- 5) 저축 목표
drop table public.goal_contributions cascade;
drop table public.goals cascade;

-- 6) 결제수단
alter table public.transactions drop column payment_method_id;
drop table public.payment_methods cascade;

-- 7) 내역 쓰기 규칙에서 지운 칸 확인 빼기 (20261025100000의 함수에서 결제수단·정기지출 부분만 뺀 것)
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_category public.categories%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;

  if tg_op = 'INSERT' then
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();

  if new.type = 'transfer' then
    if new.asset_id = new.to_asset_id then
      raise exception 'transfer_same_asset';
    end if;
  else
    select * into v_category from public.categories where id = new.category_id;
    if not found or v_category.household_id <> new.household_id then
      raise exception 'invalid_category';
    end if;
    if v_category.type <> new.type then
      raise exception 'category_type_mismatch';
    end if;
  end if;

  if new.asset_id is not null and not exists (
    select 1 from public.assets where id = new.asset_id and household_id = new.household_id
  ) then
    raise exception 'invalid_asset';
  end if;
  if new.to_asset_id is not null and not exists (
    select 1 from public.assets where id = new.to_asset_id and household_id = new.household_id
  ) then
    raise exception 'invalid_asset';
  end if;

  return new;
end;
$$;
```

이어서 알림 함수 두 개를 다시 만든다 (지운 칸을 참조하므로): 20261025100000에서 만든 `notify_transactions_inserted()`에서 `case when n.source = 'recurring' then 'recurring_paid' else 'created' end` → `'created'`, 문자 묶음(`v_sms_count`) 부분 삭제(한 건씩 넣기만 남김, `where` 조건 삭제). `notify_transaction_updated()`에서 `v_kind := case when new.recurring_item_id is not null then 'recurring_unchecked' else 'deleted' end;` → `v_kind := 'deleted';`, 비교 튜플에서 `old.payment_method_id`·`new.payment_method_id` 삭제.

`create_household()`는 기본 결제수단 "현금"을 만든다 (`supabase/migrations/20260927100000_m1_household.sql:201`의 `insert into public.payment_methods …`). 그 함수 전체를 이 파일에 `create or replace function`으로 복사하고 그 insert 문만 뺀다 (다른 마이그레이션에서 다시 정의한 적 없음 — `rg "function public.create_household" supabase/migrations`로 한 번 더 확인).

`cascade`로 지운 Realtime 발행 목록·정책은 표와 함께 사라진다.

- [ ] **Step 3: 적용 직전 확인** — PR 1·PR 2의 모든 검사가 통과한 상태인지 확인 (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`). 사용자에게 "지금 DB 정리를 적용하면 배포가 끝날 때까지(몇 분) 운영 앱이 오류를 낼 수 있어요"라고 알리고 승인받는다.

- [ ] **Step 4: 적용·타입** — Run: `pnpm db:migrate` → 오류 없음. Run: `pnpm db:types`. `lib/action-result.ts`의 `invalid_payment_method`·`invalid_recurring_item`, `e2e/support/accounts.ts`의 `recurring_items` 줄 삭제. `pnpm typecheck`·`pnpm test` 통과, `pnpm test:e2e` 통과(정리된 DB에서)

- [ ] **Step 5: 문서** — `SPEC.md` 목차: 내역 F-10·F-12에 "자산 선택·이체 (2026-10-25)", 자산 F-40·F-41에 "잔액 = 기록 + 내역". `spec/transactions.md`·`spec/assets.md`에 스펙 문서 §2·§3 내용 반영, `spec/data-model.md` 표 목록 갱신. `design/README.md` 사이드바 "자산" 목록, 이체 금액 `ink-muted`. `docs/history/2026-10-25.md`에 한 일·결정(카드=부채 자산, 예전 내역 그대로, 잔액 계산 규칙, 마이그레이션 둘로 나눈 이유). `docs/phone-checklist.md`에 아래 "폰에서 확인할 것" 추가, `docs/progress.md` "지금 상태" 갱신.

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/20261025200000_simplify_cleanup.sql lib/supabase/types.ts lib/action-result.ts e2e/support/accounts.ts
git commit -m "뺀 기능의 표·함수·칸 정리 마이그레이션"
git add SPEC.md spec design docs
git commit -m "내역·자산 연결을 스펙·디자인·기록에 반영"
```

- [ ] **Step 7: 합치기·배포** — PR 1(`simplify-remove-features`)을 draft 해제 후 `main`에 합치고, PR 2(`asset-linked-transactions`)의 base를 `main`으로 바꿔 바로 이어서 합친다 (중간 배포가 몇 분 생길 수 있음 — Vercel이 PR 2 합치기 배포로 곧 덮어씀).

```bash
git push -u origin asset-linked-transactions
gh pr create --base simplify-remove-features --title "앱 단순화 2/2: 내역 ↔ 자산 연결" --body "<요약 + Generated with Claude Code 줄>"
gh pr ready <PR1 번호>; gh pr merge <PR1 번호> --merge
gh pr edit <PR2 번호> --base main; gh pr merge <PR2 번호> --merge
```

- [ ] **Step 8: 배포 확인** — https://complex-henna-psi.vercel.app 에서 로그인, 홈·내역·통계·자산·설정이 열리는지 (보기만). 사이드바 자산 잔액이 자산 화면과 같은지.

**폰에서 확인할 것** (`docs/phone-checklist.md`에 추가)
- [ ] 하단 탭바가 홈 · 내역 · 통계 · 자산 · 설정인지
- [ ] 자산 화면에서 카드(현대카드 등)를 **부채**로 추가하고 지금 카드값을 잔액으로 적기
- [ ] 지출을 넣을 때 "나간 자산"에서 통장이나 카드를 고르면 자산 화면 잔액이 바로 바뀌는지
- [ ] 카드값 낸 날: 이체로 통장 → 카드, 두 잔액이 함께 바뀌는지
- [ ] 실제 통장 잔액과 다르면 항목을 눌러 "잔액 맞추기"
- [ ] 상대 폰에도 같은 잔액이 보이는지, 이체 알림 문장
