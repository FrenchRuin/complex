# 오늘 기분 (F-04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 각자 오늘 기분(이모지 12개 중 하나 + 20자 한 줄)을 정하면 홈·사이드바에 보이고 상대에게 알림이 간다. 한국 날짜가 바뀌면 안 보인다.

**Architecture:** 새 테이블 `moods`(사람·날짜별 한 줄, 소프트 삭제). 쓰기는 DB 함수 `set_my_mood` / `clear_my_mood`(security definer)만, 날짜는 DB가 KST로 정한다. 트리거가 `notifications`에 `kind='mood_set'`(새 칸 `mood` = 기분 키, `subject` = 한 줄)을 만들고, 기존 푸시 트리거가 휴대폰 알림을 보낸다. 화면은 서버 컴포넌트가 `getTodayMoods()`로 읽고, 실시간 구독에 `moods`를 더해 `router.refresh()`.

**Tech Stack:** Next.js 16 App Router, Supabase(Postgres, RLS, Realtime), Radix Popover, Zod, Vitest, Playwright

**Spec:** `spec/accounts.md` F-04, `spec/data-model.md` moods

## Global Constraints

- 이모지 12개 (키 · 이모지 · 이름, 이 순서): good 😊 좋아요, happy 🥰 행복해요, excited 😆 신나요, calm 😌 평온해요, meh 😐 그저 그래요, tired 😴 피곤해요, busy 😵 바빠요, annoyed 😤 짜증나요, sad 😢 슬퍼요, sick 🤒 아파요, hungry 🍚 배고파요, celebrate 🥳 축하해요
- 한 줄 메모: 앞뒤 공백 지움, 빈 글은 null, 20자까지
- "오늘" = 한국 시각 날짜 (DB `(now() at time zone 'Asia/Seoul')::date`, 앱 `todayKST()`)
- 알림 문장: `○○님이 오늘 기분을 😴 피곤해요로 정했어요` + 메모가 있으면 ` · 야근 중`. 누르면 `/`
- 같은 날 여러 번 바꾸면 안 읽은 기분 알림 하나만 고침. 같은 기분·메모로 다시 저장, 지우기는 알림 없음
- 이모지 옆에는 항상 이름 글자 또는 `aria-label`
- 문구 해요체, 앱 문구에 이모지·느낌표 없음 (사람이 고른 기분 이모지만 예외)
- 커밋: 한국어 한 줄 + `(F-04)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 실제 계정으로 저장 금지. 저장 흐름은 E2E 계정
- E2E 전 3000번 개발 서버를 끄고, 끝나면 다시 켠다

## Review Focus

- 자정 경계: 어제 기분이 남아 있어도 오늘 화면에 안 보여야 한다 → Task 1 E2E에서 어제 날짜 행을 관리자 키로 넣고 `getTodayMoods`가 아닌 DB 조건(`mood_date = 오늘`)으로 걸러지는지 확인, Task 3 단위 테스트 `pickToday`
- 다른 사람 기분 고치기: B가 A의 행을 update/insert/delete 하면 막혀야 한다 → Task 1 E2E
- 지운 뒤 같은 기분으로 다시 고르기: 다시 보이고 알림이 가야 한다 → Task 1 E2E
- 혼자인 가구: 받는 사람이 없으면 알림 없이 저장만 → 트리거의 `v_recipient is null` 분기 (E2E 계정은 둘이라 코드 검토로 확인)
- 메모 21자, 없는 기분 키: 액션이 문구로 거절하고 DB도 거절 → Task 1 E2E(DB), Task 2 단위(Zod)

---

### Task 1: DB — moods 테이블, 쓰기 함수, 알림 트리거

**Files:**
- Create: `supabase/migrations/20261001120000_moods.sql`
- Modify: `lib/supabase/types.ts` (`pnpm db:types`로 다시 생성)
- Test: `e2e/mood-rules.spec.ts`

**Interfaces:**
- Produces: 테이블 `moods(id, household_id, member_id, mood_date, mood, note, updated_at, deleted_at)`, RPC `set_my_mood(p_mood text, p_note text)`, `clear_my_mood()`, `notifications.mood text null`, `notifications.kind`에 `'mood_set'`

- [ ] **Step 1: 실패하는 E2E 규칙 테스트 쓰기**

```ts
// e2e/mood-rules.spec.ts
import { expect, test } from "@playwright/test";
import { adminClient, readCreds, serverNow, userClient } from "./support/accounts";

const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

test("오늘 기분 규칙: 하루 한 줄, 알림은 하나로, 같은 값·지우기는 알림 없음, 남의 기분은 못 고침 (F-04)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  await a.rpc("clear_my_mood");
  // 지난 테스트가 남긴 안 읽은 기분 알림 정리
  await b.from("notifications").update({ read_at: new Date().toISOString() }).eq("kind", "mood_set").is("read_at", null);
  const since = await serverNow();

  expect((await a.rpc("set_my_mood", { p_mood: "tired", p_note: "  야근 중  " })).error).toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "happy", p_note: "" })).error).toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "happy", p_note: null })).error).toBeNull(); // 같은 값
  const { data: rows } = await b.from("moods").select("mood, note, mood_date, deleted_at");
  expect(rows).toEqual([{ mood: "happy", note: null, mood_date: kstToday(), deleted_at: null }]);

  const { data: forB } = await b.from("notifications").select("kind, mood, subject").eq("kind", "mood_set").gte("created_at", since);
  expect(forB).toEqual([{ kind: "mood_set", mood: "happy", subject: null }]);

  // 지우기: 안 보이게 + 알림 없음
  expect((await a.rpc("clear_my_mood")).error).toBeNull();
  const { data: cleared } = await b.from("moods").select("deleted_at").single();
  expect(cleared!.deleted_at).not.toBeNull();
  // 다시 고르면 같은 행이 살아나고 알림 하나(읽지 않은 것을 고침)
  await a.rpc("set_my_mood", { p_mood: "sick", p_note: "감기" });
  const { data: again } = await b.from("moods").select("mood, note, deleted_at");
  expect(again).toEqual([{ mood: "sick", note: "감기", deleted_at: null }]);
  const { data: forB2 } = await b.from("notifications").select("mood, subject").eq("kind", "mood_set").gte("created_at", since);
  expect(forB2).toEqual([{ mood: "sick", subject: "감기" }]);

  // 잘못된 값은 DB가 거절
  expect((await a.rpc("set_my_mood", { p_mood: "nope", p_note: null })).error).not.toBeNull();
  expect((await a.rpc("set_my_mood", { p_mood: "good", p_note: "가".repeat(21) })).error).not.toBeNull();

  // 직접 쓰기는 막혀 있다 (함수로만)
  const { data: aRow } = await a.from("moods").select("id").single();
  expect((await b.from("moods").update({ mood: "sad" }).eq("id", aRow!.id).select()).data ?? []).toHaveLength(0);
  expect((await a.from("moods").delete().eq("id", aRow!.id)).error).not.toBeNull();
  const fake = "00000000-0000-0000-0000-000000000000";
  expect(
    (await b.from("moods").insert({ household_id: fake, member_id: fake, mood_date: kstToday(), mood: "good" })).error,
  ).not.toBeNull();

  // 어제 행은 오늘 조건에 안 걸린다
  const admin = adminClient();
  const { data: me } = await a.from("members").select("id, household_id").eq("slot", "a").single();
  const yesterday = new Date(Date.now() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
  await admin.from("moods").insert({ household_id: me!.household_id, member_id: me!.id, mood_date: yesterday, mood: "sad" });
  const { data: todayOnly } = await b.from("moods").select("mood").eq("mood_date", kstToday()).is("deleted_at", null);
  expect(todayOnly).toEqual([{ mood: "sick" }]);
  await admin.from("moods").delete().eq("member_id", me!.id).eq("mood_date", yesterday);
  await a.rpc("clear_my_mood");
});
```

- [ ] **Step 2: 실패 확인**

Run: (3000번 개발 서버 끄고) `pnpm exec playwright test e2e/mood-rules.spec.ts`
Expected: FAIL — `set_my_mood` 함수 없음 (`Could not find the function`)

- [ ] **Step 3: 마이그레이션 쓰기**

```sql
-- 오늘 기분 (F-04, 사용자 요청 2026-10-01)
-- 사람·한국 날짜마다 한 줄. 쓰기는 set_my_mood / clear_my_mood 함수로만 (날짜는 DB가 정한다).

create table public.moods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  mood_date date not null,
  mood text not null check (mood in (
    'good', 'happy', 'excited', 'calm', 'meh', 'tired', 'busy', 'annoyed', 'sad', 'sick', 'hungry', 'celebrate'
  )),
  note text check (note is null or char_length(note) between 1 and 20),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (member_id, mood_date)
);

create index moods_household_idx on public.moods (household_id, mood_date);

alter table public.moods enable row level security;

create policy "moods: 같은 가구 조회" on public.moods
  for select to authenticated
  using (household_id = (select public.my_household_id()));

revoke insert, update, delete on public.moods from authenticated, anon;

create function public.set_my_mood(p_mood text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;
  insert into public.moods (household_id, member_id, mood_date, mood, note)
  values (v_member.household_id, v_member.id, (now() at time zone 'Asia/Seoul')::date, p_mood,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (member_id, mood_date) do update
    set mood = excluded.mood, note = excluded.note, deleted_at = null, updated_at = now();
end;
$$;

create function public.clear_my_mood()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moods
  set deleted_at = now(), updated_at = now()
  where member_id = (select id from public.members where user_id = auth.uid())
    and mood_date = (now() at time zone 'Asia/Seoul')::date
    and deleted_at is null;
end;
$$;

revoke execute on function public.set_my_mood(text, text) from public, anon;
revoke execute on function public.clear_my_mood() from public, anon;
grant execute on function public.set_my_mood(text, text) to authenticated;
grant execute on function public.clear_my_mood() to authenticated;

-- ─────────────────────────────────────────────
-- 알림 (F-17 확장): 상대가 기분을 정하거나 바꾸면
-- ─────────────────────────────────────────────

alter table public.notifications
  add column mood text,
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'recurring_unchecked', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored',
    'event_created', 'event_updated', 'event_deleted', 'event_restored',
    'event_occurrence_deleted', 'event_occurrence_restored',
    'mood_set'
  ));

create function public.notify_mood_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  if new.deleted_at is not null then
    return null; -- 지우기는 알림 없음
  end if;
  if tg_op = 'UPDATE' and old.deleted_at is null
     and (old.mood, old.note) is not distinct from (new.mood, new.note) then
    return null; -- 같은 값으로 다시 저장
  end if;

  select id into v_recipient from public.members
  where household_id = new.household_id and id <> new.member_id;
  if v_recipient is null then
    return null;
  end if;

  update public.notifications
  set created_at = now(), mood = new.mood, subject = new.note, occurred_on = new.mood_date
  where recipient_id = v_recipient and actor_id = new.member_id and kind = 'mood_set' and read_at is null;
  if found then
    return null;
  end if;

  insert into public.notifications (household_id, recipient_id, actor_id, kind, mood, subject, occurred_on)
  values (new.household_id, v_recipient, new.member_id, 'mood_set', new.mood, new.note, new.mood_date);
  return null;
end;
$$;

create trigger moods_notify
after insert or update on public.moods
for each row execute function public.notify_mood_changed();

revoke execute on function public.notify_mood_changed() from public, anon, authenticated;

alter publication supabase_realtime add table public.moods;
```

- [ ] **Step 4: 적용·타입 생성**

Run: `pnpm db:migrate` 그다음 `pnpm db:types`
Expected: 마이그레이션 적용, `lib/supabase/types.ts`에 `moods`, `set_my_mood`, `clear_my_mood`, `notifications.mood`

- [ ] **Step 5: 통과 확인**

Run: `pnpm exec playwright test e2e/mood-rules.spec.ts`
Expected: PASS 1/1

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/20261001120000_moods.sql lib/supabase/types.ts e2e/mood-rules.spec.ts
git commit -m "오늘 기분 테이블·저장 함수·알림 트리거 추가 (F-04)"
```

---

### Task 2: 기분 목록·문구 계산 (순수 함수)

**Files:**
- Create: `lib/calc/mood.ts`, `lib/calc/mood.test.ts`
- Modify: `lib/calc/notifications.ts`, `lib/calc/notifications.test.ts`, `lib/calc/push.ts`, `lib/calc/push.test.ts`

**Interfaces:**
- Produces:
  - `MOODS: readonly { key: MoodKey; emoji: string; label: string }[]`, `type MoodKey`
  - `isMoodKey(v: string): v is MoodKey`
  - `moodText(m: { mood: MoodKey; note: string | null }): string` → `"😴 피곤해요 · 야근 중"`
  - `moodInputSchema` (Zod): `{ mood: MoodKey, note: string|null }` (trim, 빈 글 null, 20자 넘으면 "한 줄은 20자까지 쓸 수 있어요")
  - `type TodayMood = { mood: MoodKey; note: string | null }`, `pickToday(rows, today): Record<memberId, TodayMood>`
  - `NotificationKind`에 `"mood_set"`, `NotificationItem.mood: string | null`
  - `notificationSentence`가 `mood_set`이면 `"서연님이 오늘 기분을 🥰 행복해요로 정했어요"`(+ ` · 메모`), `notificationHref` → `"/"`
  - `pushPayload`의 tag: 기분 알림은 `mood:${actorId}`

- [ ] **Step 1: 실패하는 테스트**

```ts
// lib/calc/mood.test.ts
import { describe, expect, it } from "vitest";
import { MOODS, isMoodKey, moodInputSchema, moodText, pickToday } from "./mood";

describe("MOODS", () => {
  it("12개, 스펙 순서", () => {
    expect(MOODS.map((m) => `${m.emoji} ${m.label}`)).toEqual([
      "😊 좋아요", "🥰 행복해요", "😆 신나요", "😌 평온해요", "😐 그저 그래요", "😴 피곤해요",
      "😵 바빠요", "😤 짜증나요", "😢 슬퍼요", "🤒 아파요", "🍚 배고파요", "🥳 축하해요",
    ]);
    expect(isMoodKey("tired")).toBe(true);
    expect(isMoodKey("nope")).toBe(false);
  });
});

describe("moodText", () => {
  it("메모가 있으면 가운뎃점 뒤에", () => {
    expect(moodText({ mood: "tired", note: "야근 중" })).toBe("😴 피곤해요 · 야근 중");
    expect(moodText({ mood: "happy", note: null })).toBe("🥰 행복해요");
  });
});

describe("moodInputSchema", () => {
  it("공백을 지우고 빈 글은 null", () => {
    expect(moodInputSchema.parse({ mood: "good", note: "  밥 먹자 " })).toEqual({ mood: "good", note: "밥 먹자" });
    expect(moodInputSchema.parse({ mood: "good", note: "   " })).toEqual({ mood: "good", note: null });
    expect(moodInputSchema.parse({ mood: "good", note: null })).toEqual({ mood: "good", note: null });
  });
  it("20자 넘음, 없는 기분은 거절", () => {
    expect(moodInputSchema.safeParse({ mood: "good", note: "가".repeat(20) }).success).toBe(true);
    const long = moodInputSchema.safeParse({ mood: "good", note: "가".repeat(21) });
    expect(long.success ? null : long.error.issues[0].message).toBe("한 줄은 20자까지 쓸 수 있어요");
    const bad = moodInputSchema.safeParse({ mood: "nope", note: null });
    expect(bad.success ? null : bad.error.issues[0].message).toBe("기분을 골라 주세요");
  });
});

describe("pickToday", () => {
  it("오늘 날짜·안 지운 것만, 사람별로", () => {
    const rows = [
      { member_id: "a", mood_date: "2026-10-01", mood: "tired", note: "야근", deleted_at: null },
      { member_id: "b", mood_date: "2026-09-30", mood: "sad", note: null, deleted_at: null },
      { member_id: "b", mood_date: "2026-10-01", mood: "good", note: null, deleted_at: "2026-10-01T01:00:00Z" },
      { member_id: "c", mood_date: "2026-10-01", mood: "nope", note: null, deleted_at: null },
    ];
    expect(pickToday(rows, "2026-10-01")).toEqual({ a: { mood: "tired", note: "야근" } });
  });
});
```

`lib/calc/notifications.test.ts`에 추가:

```ts
describe("기분 알림 (F-04)", () => {
  it("문장과 갈 곳", () => {
    const mood = { kind: "mood_set" as const, subject: "야근 중", amount: null, count: 1, mood: "tired" };
    expect(notificationSentence(mood, "서연")).toBe("서연님이 오늘 기분을 😴 피곤해요로 정했어요 · 야근 중");
    expect(notificationSentence({ ...mood, subject: null, mood: "happy" }, "서연")).toBe(
      "서연님이 오늘 기분을 🥰 행복해요로 정했어요",
    );
    expect(notificationHref({ kind: "mood_set", transactionId: null, occurredOn: "2026-10-01" })).toBe("/");
    expect(toNotificationKind("mood_set")).toBe("mood_set");
  });
});
```

`lib/calc/push.test.ts`에 추가 (기존 import 유지):

```ts
it("기분 알림은 사람마다 폰에서 하나로 겹친다 (F-04)", () => {
  const p = pushPayload(
    { id: "n1", kind: "mood_set", subject: null, amount: null, count: 1, transactionId: null, noteId: null, eventId: null, occurredOn: "2026-10-01", mood: "good", actorId: "m-b" },
    "서연",
  );
  expect(p).toEqual({ title: "감자밭", body: "서연님이 오늘 기분을 😊 좋아요로 정했어요", url: "/", tag: "mood:m-b" });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run lib/calc/mood.test.ts lib/calc/notifications.test.ts lib/calc/push.test.ts`
Expected: FAIL — `./mood` 없음, `mood_set` 문장 다름

- [ ] **Step 3: 구현**

```ts
// lib/calc/mood.ts
/** 오늘 기분 (F-04). 키는 DB moods.mood check와 같다 */
import { z } from "zod";
import type { DateString } from "@/lib/date";

export const MOODS = [
  { key: "good", emoji: "😊", label: "좋아요" },
  { key: "happy", emoji: "🥰", label: "행복해요" },
  { key: "excited", emoji: "😆", label: "신나요" },
  { key: "calm", emoji: "😌", label: "평온해요" },
  { key: "meh", emoji: "😐", label: "그저 그래요" },
  { key: "tired", emoji: "😴", label: "피곤해요" },
  { key: "busy", emoji: "😵", label: "바빠요" },
  { key: "annoyed", emoji: "😤", label: "짜증나요" },
  { key: "sad", emoji: "😢", label: "슬퍼요" },
  { key: "sick", emoji: "🤒", label: "아파요" },
  { key: "hungry", emoji: "🍚", label: "배고파요" },
  { key: "celebrate", emoji: "🥳", label: "축하해요" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];
export type TodayMood = { mood: MoodKey; note: string | null };

export const MOOD_NOTE_MAX = 20;

export function isMoodKey(value: string): value is MoodKey {
  return MOODS.some((m) => m.key === value);
}

export function moodOf(key: MoodKey) {
  return MOODS.find((m) => m.key === key)!;
}

/** "😴 피곤해요 · 야근 중" */
export function moodText({ mood, note }: TodayMood): string {
  const m = moodOf(mood);
  return note ? `${m.emoji} ${m.label} · ${note}` : `${m.emoji} ${m.label}`;
}

export const moodInputSchema = z.object({
  mood: z.string().refine(isMoodKey, "기분을 골라 주세요").transform((v) => v as MoodKey),
  note: z
    .string()
    .nullable()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= MOOD_NOTE_MAX, `한 줄은 ${MOOD_NOTE_MAX}자까지 쓸 수 있어요`)
    .transform((v) => (v === "" ? null : v)),
});

type MoodRow = { member_id: string; mood_date: string; mood: string; note: string | null; deleted_at: string | null };

/** 오늘 날짜·안 지운 기분만 사람별로 */
export function pickToday(rows: readonly MoodRow[], today: DateString): Record<string, TodayMood> {
  const out: Record<string, TodayMood> = {};
  for (const r of rows) {
    if (r.mood_date !== today || r.deleted_at !== null || !isMoodKey(r.mood)) continue;
    out[r.member_id] = { mood: r.mood, note: r.note };
  }
  return out;
}
```

`lib/calc/notifications.ts`:
- `NotificationKind` 유니온과 `KINDS` 배열 끝에 `"mood_set"` 추가
- `NotificationItem`에 `mood: string | null;` 추가 (occurredOn 아래)
- import 추가: `import { isMoodKey, moodOf } from "@/lib/calc/mood";`
- `notificationSentence` 인자 타입을 `Pick<NotificationItem, "kind" | "subject" | "amount" | "count"> & { occurredOn?: DateString | null; mood?: string | null }`로, 함수 맨 앞(`const who` 다음)에:

```ts
  if (item.kind === "mood_set") {
    const m = item.mood && isMoodKey(item.mood) ? moodOf(item.mood) : null;
    const what = m ? `${m.emoji} ${m.label}` : "새 기분";
    return `${who} 오늘 기분을 ${what}로 정했어요${item.subject ? ` · ${item.subject}` : ""}`;
  }
```
- `notificationHref` 맨 앞에 `if (item.kind === "mood_set") return "/";`

`lib/calc/push.ts`의 `pushPayload`:
- 인자 Pick에 `"mood" | "actorId"` 추가
- tag: `tag: item.kind === "mood_set" ? \`mood:${item.actorId}\` : (item.transactionId ?? item.noteId ?? item.eventId ?? item.id),`

- [ ] **Step 4: 통과 확인 + 타입 오류 고치기**

Run: `pnpm vitest run lib/calc && pnpm typecheck`
Expected: 단위 PASS. typecheck는 `NotificationItem`을 만드는 곳(`lib/notifications.ts`, `lib/push-server.ts`, 기존 push 테스트 인자)에서 `mood`/`actorId` 누락 오류 → Task 3에서 채운다. 이 단계에서는 기존 `push.test.ts` 호출에 `mood: null, actorId: "m"`을 넣어 테스트 파일 오류만 없앤다.

- [ ] **Step 5: 커밋**

```bash
git add lib/calc/mood.ts lib/calc/mood.test.ts lib/calc/notifications.ts lib/calc/notifications.test.ts lib/calc/push.ts lib/calc/push.test.ts
git commit -m "오늘 기분 목록·문구·알림 문장 계산 (F-04)"
```

---

### Task 3: 읽기·저장 액션·알림 연결·실시간

**Files:**
- Create: `lib/moods.ts`, `app/(app)/mood-actions.ts`
- Modify: `lib/notifications.ts`, `lib/push-server.ts`, `components/realtime/RealtimeProvider.tsx`

**Interfaces:**
- Consumes: Task 1 RPC·테이블, Task 2 `pickToday`, `moodInputSchema`, `TodayMood`
- Produces: `getTodayMoods(): Promise<Record<string, TodayMood>>` (cache), 서버 액션 `saveMood(input: { mood: string; note: string | null }): Promise<ActionResult>`, `clearMood(): Promise<ActionResult>`

- [ ] **Step 1: 구현**

```ts
// lib/moods.ts
import { cache } from "react";
import { pickToday, type TodayMood } from "./calc/mood";
import { todayKST } from "./date";
import { createClient } from "./supabase/server";

/** 우리 가구의 오늘 기분 (F-04). RLS가 같은 가구로 좁힌다. 사람 id → 기분 */
export const getTodayMoods = cache(async (): Promise<Record<string, TodayMood>> => {
  const today = todayKST();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moods")
    .select("member_id, mood_date, mood, note, deleted_at")
    .eq("mood_date", today)
    .is("deleted_at", null);
  if (error) throw new Error(`오늘 기분을 불러오지 못했어요: ${error.message}`);
  return pickToday(data, today);
});
```

```ts
// app/(app)/mood-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { moodInputSchema } from "@/lib/calc/mood";
import { requireMember } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

/** 오늘 기분 정하기 (F-04). 날짜는 DB가 한국 시각으로 정한다 */
export async function saveMood(input: { mood: string; note: string | null }): Promise<ActionResult> {
  const parsed = moodInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_mood", { p_mood: parsed.data.mood, p_note: parsed.data.note ?? "" });
  if (error) return fail("기분을 저장하지 못했어요. 잠시 후 다시 시도해 주세요");
  revalidatePath("/", "layout");
  return ok();
}

/** 오늘 기분 지우기 (소프트 삭제, 알림 없음) */
export async function clearMood(): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_my_mood");
  if (error) return fail("기분을 지우지 못했어요. 잠시 후 다시 시도해 주세요");
  revalidatePath("/", "layout");
  return ok();
}
```

`lib/notifications.ts`: select 문자열에 `, mood` 추가, 매핑에 `mood: n.mood,`.
`lib/push-server.ts`: select 문자열에 `, mood` 추가, `pushPayload`에 넘기는 객체에 `mood: n.mood, actorId: n.actor_id`.
`RealtimeProvider.tsx`: `notes` 구독 아래에 같은 모양으로

```ts
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "moods", filter: `household_id=eq.${householdId}` },
          scheduleRefresh,
        )
```
(주변 `.on(...)` 블록 모양에 맞춘다.)

- [ ] **Step 2: 확인**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: 모두 통과 (Task 2에서 남긴 타입 오류 없음)

- [ ] **Step 3: 커밋**

```bash
git add lib/moods.ts "app/(app)/mood-actions.ts" lib/notifications.ts lib/push-server.ts components/realtime/RealtimeProvider.tsx
git commit -m "오늘 기분 읽기·저장 액션과 알림·실시간 연결 (F-04)"
```

---

### Task 4: 화면 — 고르는 창, 사이드바, 홈

**Files:**
- Create: `components/mood/MoodPicker.tsx`, `components/mood/MoodBadge.tsx`, `components/mood/TodayMoods.tsx`, `e2e/mood.spec.ts`
- Modify: `app/(app)/layout.tsx`, `components/layout/SidebarContent.tsx`, `components/layout/SidebarRail.tsx`, `components/layout/Sidebar.tsx`, `app/(app)/(home)/page.tsx`

**Interfaces:**
- Consumes: `getTodayMoods`, `saveMood`, `clearMood`, `MOODS`, `moodText`, `moodOf`, `TodayMood`
- Produces: `SidebarData.moods: Record<string, TodayMood>`; `<MoodPicker current={TodayMood|null}>{trigger}</MoodPicker>` (trigger는 `aria-label` 있는 button 하나); `<MoodBadge mood={TodayMood|undefined} className?>`

- [ ] **Step 1: 실패하는 E2E**

```ts
// e2e/mood.spec.ts
import { expect, test } from "@playwright/test";
import { E2E_NAMES, readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

test("오늘 기분: A가 고르면 홈·사이드바에 보이고 B에게 알림, 지우면 사라진다 (F-04)", async ({ browser }) => {
  const creds = readCreds();
  await (await userClient(creds.a.email, creds.a.password)).rpc("clear_my_mood");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await login(pageA, "a", "/");
  await login(pageB, "b", "/");

  const bellB = pageB.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await bellB.click();
  const markAll = pageB.getByRole("dialog").getByRole("button", { name: "모두 읽음" });
  if (await markAll.isEnabled()) await markAll.click();
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");

  // A: 홈에 아직 안 정함 → 사이드바 아래 내 프로필에서 고르기
  const homeMoods = pageA.getByRole("region", { name: "오늘 기분" });
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("아직 안 정했어요");
  await pageA.getByRole("complementary").getByRole("button", { name: /오늘 기분 고르기/ }).click();
  const picker = pageA.getByRole("dialog", { name: "오늘 기분" });
  await expect(picker.getByRole("button", { name: "저장" })).toBeDisabled();
  await picker.getByRole("radio", { name: "피곤해요" }).click();
  await picker.getByLabel("한 줄 (선택)").fill("야근 중");
  await picker.getByRole("button", { name: "저장" }).click();
  await expect(picker).toBeHidden();
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("😴 피곤해요 · 야근 중");

  // B: 새로고침 없이 홈과 알림
  await expect(
    pageB.getByRole("region", { name: "오늘 기분" }).getByRole("listitem").filter({ hasText: E2E_NAMES.a }),
  ).toContainText("😴 피곤해요 · 야근 중", { timeout: 8000 });
  await expect(bellB).toHaveAccessibleName("알림, 안 읽은 알림 1건", { timeout: 8000 });
  await bellB.click();
  await expect(
    pageB.getByRole("link", { name: new RegExp(`${E2E_NAMES.a}님이 오늘 기분을 😴 피곤해요로 정했어요 · 야근 중`) }),
  ).toBeVisible();
  await pageB.keyboard.press("Escape");

  // A: 홈의 내 칸을 눌러 지우기
  await homeMoods.getByRole("button", { name: /오늘 기분 고르기/ }).click();
  await pageA.getByRole("dialog", { name: "오늘 기분" }).getByRole("button", { name: "기분 지우기" }).click();
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("아직 안 정했어요");

  await contextA.close();
  await contextB.close();
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec playwright test e2e/mood.spec.ts`
Expected: FAIL — region "오늘 기분" 없음

- [ ] **Step 3: 부품 구현**

```tsx
// components/mood/MoodBadge.tsx
import { moodOf, type TodayMood } from "@/lib/calc/mood";

/** 아바타 모서리에 붙는 기분 이모지. 이름 글자가 옆에 있으므로 스크린리더에는 sr-only로 이름을 준다 */
export function MoodBadge({ mood, className = "" }: { mood: TodayMood | undefined; className?: string }) {
  if (!mood) return null;
  const m = moodOf(mood.mood);
  return (
    <span className={`absolute inline-flex size-5 items-center justify-center rounded-full bg-surface-raised text-[13px] leading-none ring-2 ring-surface-raised ${className}`}>
      <span aria-hidden>{m.emoji}</span>
      <span className="sr-only">기분 {m.label}</span>
    </span>
  );
}
```

```tsx
// components/mood/MoodPicker.tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useTransition, type ReactNode } from "react";
import { clearMood, saveMood } from "@/app/(app)/mood-actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { MOOD_NOTE_MAX, MOODS, type MoodKey, type TodayMood } from "@/lib/calc/mood";

type Props = { current: TodayMood | null; children: ReactNode; align?: "start" | "end"; side?: "top" | "bottom" };

/** 오늘 기분 고르기 (F-04). children은 여는 버튼 하나 */
export function MoodPicker({ current, children, align = "start", side = "top" }: Props) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<MoodKey | null>(current?.mood ?? null);
  const [note, setNote] = useState(current?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    if (next) {
      setMood(current?.mood ?? null);
      setNote(current?.note ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function run(action: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error);
      if (!result.error) setOpen(false);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-label="오늘 기분"
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[300px] rounded-md bg-surface-raised p-4 shadow-float"
        >
          <p className="mb-2 text-heading text-ink">오늘 기분</p>
          <div role="radiogroup" aria-label="기분" className="grid grid-cols-4 gap-1">
            {MOODS.map((m) => {
              const selected = m.key === mood;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={m.label}
                  onClick={() => setMood(m.key)}
                  className={`flex flex-col items-center gap-1 rounded-sm px-1 py-2 ${
                    selected ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-sunken"
                  }`}
                >
                  <span aria-hidden className="text-[22px] leading-none">{m.emoji}</span>
                  <span aria-hidden className="text-label">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <TextField
              label="한 줄 (선택)"
              value={note}
              maxLength={MOOD_NOTE_MAX}
              placeholder="야근 중"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? <p role="alert" className="mt-2 text-caption text-danger">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            {current ? (
              <Button variant="secondary" className="flex-1" pending={pending} onClick={() => run(clearMood)}>
                기분 지우기
              </Button>
            ) : null}
            <Button
              className="flex-1"
              disabled={!mood}
              pending={pending}
              onClick={() => mood && run(() => saveMood({ mood, note }))}
            >
              저장
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

```tsx
// components/mood/TodayMoods.tsx
import { moodText, type TodayMood } from "@/lib/calc/mood";
import type { HouseholdMember } from "@/lib/household";
import { Avatar } from "@/components/ui/Avatar";
import { MoodPicker } from "./MoodPicker";

type Props = { meId: string; members: HouseholdMember[]; moods: Record<string, TodayMood> };

/** 홈 위쪽: 두 사람의 오늘 기분 (F-04). 내 칸은 눌러서 고른다 */
export function TodayMoods({ meId, members, moods }: Props) {
  return (
    <section aria-label="오늘 기분" className="rounded-md bg-surface-raised px-5 py-4">
      <h2 className="sr-only">오늘 기분</h2>
      <ul className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        {members.map((m) => {
          const mood = moods[m.id];
          const text = mood ? moodText(mood) : "아직 안 정했어요";
          const row = (
            <>
              <Avatar slot={m.slot} name={m.displayName} avatarUrl={m.avatarUrl} />
              <span className="text-body font-semibold text-ink">{m.displayName}</span>
              <span className={`min-w-0 truncate text-body ${mood ? "text-ink" : "text-ink-muted"}`}>{text}</span>
            </>
          );
          return (
            <li key={m.id} className="min-w-0">
              {m.id === meId ? (
                <MoodPicker current={mood ?? null} side="bottom">
                  <button
                    type="button"
                    aria-label={`오늘 기분 고르기, 지금 ${text}`}
                    className="-mx-2 flex min-h-11 max-w-full items-center gap-3 rounded-sm px-2 hover:bg-surface-sunken"
                  >
                    {row}
                  </button>
                </MoodPicker>
              ) : (
                <div className="flex min-h-11 items-center gap-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

주의: 내 칸 버튼은 `aria-label`이 이름·기분 글자를 가리므로 `listitem`의 글자(`toContainText`)는 그대로 보인다.

- [ ] **Step 4: 연결**

`app/(app)/layout.tsx`:
- `import { getTodayMoods } from "@/lib/moods";`
- `Promise.all`에 `getTodayMoods()` 추가 → `moods`
- `const sidebar = { me: meMember, members, names, paymentMethods, recurringDue: recurring.dueUnpaid, moods };`

`components/layout/SidebarContent.tsx`:
- `SidebarData`에 `/** 오늘 기분 (F-04), 사람 id → 기분 */ moods: Record<string, TodayMood>;` (import `type TodayMood` from `@/lib/calc/mood`)
- 함수 인자에 `moods` 추가
- 위 아바타: `<Avatar …/>`를 `<span key={m.id} className="relative"><Avatar …/><MoodBadge mood={moods[m.id]} className="-right-1 -bottom-1" /></span>`로
- 아래 내 프로필 줄: 아바타 span + 이름 span을 `MoodPicker`로 감싼 버튼 하나로 바꾼다

```tsx
        <MoodPicker current={moods[me.id] ?? null}>
          <button
            type="button"
            aria-label={`오늘 기분 고르기, 지금 ${moods[me.id] ? moodText(moods[me.id]) : "안 정함"}`}
            className="-ml-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm px-2 text-left hover:bg-surface-sunken"
          >
            <span className="relative shrink-0" title={SYNC_LABEL[status]}>
              <Avatar slot={me.slot} name={me.displayName} avatarUrl={me.avatarUrl} />
              <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[status]}`} />
            </span>
            <span className="min-w-0 flex-1 truncate text-body text-ink">
              {me.displayName}
              {moods[me.id] ? <span aria-hidden> {moodOf(moods[me.id].mood).emoji}</span> : null}
              <span className="sr-only"> · {SYNC_LABEL[status]}</span>
            </span>
          </button>
        </MoodPicker>
```
(imports: `MoodPicker`, `MoodBadge`, `moodOf`, `moodText`)

`components/layout/Sidebar.tsx`: `<SidebarRail me={data.me} mood={data.moods[data.me.id]} … />`
`components/layout/SidebarRail.tsx`: Props에 `mood: TodayMood | undefined`, 내 아바타 span 안에 `<MoodBadge mood={mood} className="-top-1 -right-1" />` (상태 점은 오른쪽 아래 그대로). 접힌 사이드바에서 고르기는 펼친 뒤 한다 (스펙의 "접힌 사이드바" 고르기는 펼쳐서 같은 줄 — Rulings 참고).

`app/(app)/(home)/page.tsx`:
- `import { TodayMoods } from "@/components/mood/TodayMoods";`, `import { getTodayMoods } from "@/lib/moods";`
- `Promise.all`에 `getTodayMoods()` → `moods`
- `<div className="flex flex-col gap-4 …">` 바로 안 맨 위에 `<TodayMoods meId={me.id} members={members} moods={moods} />`

- [ ] **Step 5: 통과 확인**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm exec playwright test e2e/mood.spec.ts e2e/mood-rules.spec.ts e2e/notifications.spec.ts e2e/settings.spec.ts e2e/mobile.spec.ts`
Expected: 모두 PASS. 실패하면 사이드바 프로필 줄을 찾던 기존 테스트의 선택자를 확인한다.

- [ ] **Step 6: 화면 확인 (Aside, 읽기만)**

개발 서버를 다시 켜고 Aside로 `/`를 열어 홈 "오늘 기분" 칸과 사이드바 아래 줄을 snapshot으로 확인 (실제 계정으로 저장하지 않는다). 폰 폭은 E2E 계정 Playwright로.

- [ ] **Step 7: 커밋**

```bash
git add components/mood e2e/mood.spec.ts "app/(app)/layout.tsx" components/layout "app/(app)/(home)/page.tsx"
git commit -m "오늘 기분 고르는 창과 홈·사이드바 표시 (F-04)"
```

---

### Task 5: 기록

**Files:**
- Modify: `docs/history/2026-10-01.md`, `docs/phone-checklist.md`, `docs/progress.md`

- [ ] **Step 1:** history 위쪽에 "개선 — 오늘 기분 F-04" (한 일, 확인한 것, 결정: 날짜별 저장·소프트 삭제·함수로만 쓰기·알림 하나로·기분 바꿔도 휴대폰 알림은 처음 한 번). phone-checklist에 "폰 메뉴 아래 내 프로필 → 기분 고르기, 상대 폰에 알림, 다음 날 0시 지나면 사라짐". progress의 지금 상태·마지막 작업 갱신, 남은 후보에서 "예산 80% 알림" 빼기 (사용자 결정 2026-10-01).
- [ ] **Step 2:** `git commit -m "오늘 기분을 기록에 반영 (F-04)"`

## Rulings (계획 단계)

- 접힌 사이드바: 이모지 배지만 보이고, 고르기는 펼친 사이드바·홈·폰 메뉴에서 한다 — 64px 레일에 팝오버 버튼을 더 넣으면 기존 아이콘 버튼과 겹친다 — 틀리면 레일 아바타에 MoodPicker를 감싸면 끝 (스펙 문장도 이에 맞춰 고친다)
- 같은 날 기분을 다시 바꾸면 안 읽은 알림을 고치므로 휴대폰 알림은 처음 한 번만 온다 (기존 수정 알림과 같은 동작, 푸시 트리거가 insert에만 걸려 있음)
