# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 매번 따르는 규칙이다.
**무엇을 만들지는 `SPEC.md`(목차) + `spec/`(영역별 상세)**, **어떻게 만들지는 이 파일**을 기준으로 한다. 둘이 충돌하면 작업을 멈추고 사용자에게 묻는다.

**세션을 시작하면 읽는 순서** (토큰 절약): `docs/progress.md`(지금 상태) → 필요하면 `SPEC.md` 목차 → 작업할 영역의 `spec/*.md`만. `docs/history/`는 예전 결정·이유를 찾을 때만 연다.

## 프로젝트 한 줄 요약

신혼부부 두 사람만 쓰는 가계부 웹앱 "감자밭"(2026-09-29 "우리 둘 가계부"에서 이름 변경). 공동/개인 지출 구분, 실시간 동기화, 정기지출, 예산·정산이 핵심이다. 상세는 `SPEC.md`.

## 작업 방식 (가장 중요)

1. **한 번에 마일스톤 하나.** `SPEC.md` §10의 M0 → M7 순서로 진행한다. 사용자가 지시하지 않은 다음 마일스톤으로 넘어가지 않는다.
2. **계획 먼저.** 마일스톤이나 큰 기능을 시작할 때는 만들 파일, DB 변경, 화면 목록을 짧게 계획으로 보여주고 승인을 받은 뒤 구현한다.
3. **스펙에 없는 기능을 추가하지 않는다.** 필요해 보이면 제안만 하고 사용자에게 묻는다.
4. **스펙이 모호하면 추측하지 말고 묻는다.** 결정된 내용은 해당 `spec/*.md`에 반영한다 (사용자 승인 후. 기능 추가·제거는 `SPEC.md` 목차 표도).
5. **끝났다고 말하기 전에** `pnpm lint`, `pnpm typecheck`, `pnpm test`를 모두 통과시킨다. 화면 작업은 로컬에서 직접 열어 확인한다.
6. **진행 기록**: 작업을 끝낼 때마다 한 일·확인한 것·결정한 것은 `docs/history/<날짜>.md` 위쪽에, 폰에서 확인할 항목은 `docs/phone-checklist.md`에 적고, `docs/progress.md`는 "지금 상태"·"남은 개선 후보"만 짧게 고친다.
7. 사용자는 개발 용어에 익숙하지 않을 수 있다. 설명은 한국어로, 짧고 쉽게. 사용자가 직접 해야 하는 일(가입, 키 발급, 콘솔 설정)은 단계별로 안내한다.
8. **사용자에게 보내는 모든 메시지는 한글로 쓴다.** 작업 결과 보고, 중간 진행 상황, 오류·막힌 상황 설명 모두 해당한다. 긴 작업 끝의 정리나 도구 오류 직후에도 영어로 바뀌지 않게 주의한다. 코드·명령어·파일 이름만 원래 표기 그대로 둔다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js (App Router), TypeScript `strict` |
| 패키지 매니저 | pnpm |
| 스타일 | Tailwind CSS + 디자인 토큰 CSS 변수 (아래) |
| UI 기본 부품 | Radix UI primitives (Dialog, Popover, DropdownMenu 등 접근성 필요한 것만). 겉모양은 직접 스타일링 |
| 아이콘 | `lucide-react` (stroke 1.75, 기본 22px) |
| 글꼴 | `pretendard` npm 패키지 (자체 호스팅) |
| 백엔드 | Supabase: Postgres, Auth(이메일+비밀번호, 가입 막음), Realtime, RLS. 클라이언트는 `@supabase/ssr` |
| 검증 | Zod (폼 입력, 서버 액션 인자) |
| 날짜 | `date-fns` + `@date-fns/tz`, 항상 `Asia/Seoul` |
| 차트 | Recharts (2차, 통계 화면) |
| 테스트 | Vitest (단위), Playwright (주요 흐름 E2E, M3 이후) |
| 배포 | Vercel (main = 운영, PR = 미리보기) |

설치 시점의 최신 안정 버전을 쓰고 `package.json`에 고정한다. 새 라이브러리 추가는 사용자에게 먼저 알린다.

## 폴더 구조

```
app/
  (auth)/login, (auth)/invite/[token], onboarding
  (app)/layout.tsx          # 사이드바 + 메인 스크롤 영역 / 모바일 탭바
  (app)/(home)/page.tsx     # 홈 (loading.tsx를 홈에만 걸려고 그룹으로 감쌈)
  (app)/transactions, recurring, stats, schedule, notes, assets, settings
components/
  ui/                       # 버튼, 칩, 세그먼트, 진행바 등 디자인 시스템 부품
  layout/                   # Sidebar, MobileTabBar, PageHeader
  transactions/, recurring/, dashboard/ ...
lib/
  supabase/                 # server.ts, client.ts, proxy.ts(세션 갱신), env.ts
  auth/                     # 허용 이메일 확인
  money.ts                  # 금액 포맷·파싱 (formatWon, formatWonShort, parseWon)
  date.ts                   # KST 기준 월 경계, 지난달 같은 기간 등
  calc/                     # 합계, 분할 비율, 정산 등 순수 계산 함수
  sms/                      # 카드 문자 파서 (2차)
supabase/
  migrations/               # SQL 마이그레이션 (RLS 포함)
  seed.sql                  # 로컬 개발용 예시 데이터
fixtures/sms/               # 문자 파서 테스트용 실제 문자 예시
design/                     # 디자인 시스템 README, tokens.json
spec/                       # 영역별 상세 스펙 (목차는 SPEC.md)
docs/
  progress.md               # 지금 상태 (세션 시작 때 먼저 읽기)
  phone-checklist.md        # 폰에서 확인할 것 모음
  history/                  # 지난 작업 기록 (날짜별, milestones.md)
```

## 디자인 규칙

기준 문서: `design/README.md`, `design/tokens.json`. 아래는 요약.

- **색은 토큰으로만.** 컴포넌트에 16진수 색을 직접 쓰지 않는다. `app/globals.css`에 CSS 변수로 정의하고 Tailwind 테마에 연결한다.
- 라이트/다크 두 테마. 처음(M0)부터 `prefers-color-scheme`로 시스템 설정을 따른다. 수동 전환은 3차.

| 토큰 | 라이트 | 다크 | 용도 |
| --- | --- | --- | --- |
| `surface` | #F4F6F8 | #0F1318 | 페이지 바탕 |
| `surface-raised` | #FFFFFF | #181D24 | 카드, 사이드바, 패널 |
| `surface-sunken` | #E9EDF1 | #0A0D11 | 입력창, 세그먼트 트랙, 빈 진행바 |
| `line` | #DCE2E8 | #2C343E | 구분선 |
| `line-strong` | #7B8794 | #6B7682 | 컨트롤 테두리 |
| `ink` | #151B23 | #EEF1F4 | 본문, 지출 금액 |
| `ink-muted` | #56616E | #A3ADB8 | 날짜, 보조 문구 |
| `primary` | #1B5FAF | #78AEF2 | 유일한 행동 색, 수입 금액 |
| `primary-soft` | #E6EEF8 | #203854 | 선택 상태 배경 |
| `on-primary` | #FFFFFF | #0B1220 | primary 위 글자 |
| `joint` / `joint-soft` | #3C4E66 / #E8ECF1 | #A9B8CC / #1E2733 | 공동 |
| `member-a` / `member-a-soft` | #0A7061 / #E0F2EE | #4FC7B2 / #0F2A26 | 사람 A |
| `member-b` / `member-b-soft` | #AD500A / #FBEBDD | #F2A45E / #33200F | 사람 B |
| `danger` / `danger-soft` | #C2362B / #FBE6E4 | #FF8A7E / #3A1714 | 예산 초과, 삭제 |
| `holiday` | #C2362B | #FF8A7E | 공휴일 날짜·이름 (경고용 아님, 이름 글자와 함께) |
| `scrim` | 남색 40% | 검정 60% | 창·패널·메뉴 뒤 덮개 (두 모드 모두 어둡게, `ink/30` 쓰지 않기) |
| `potato` / `potato-soft` / `sprout` | #8A5A2B / #ECD2A6 / #2F8A4A | #E6C08A / #5B3F24 / #6CC47A | 감자밭 로고·로그인 밭고랑 꾸밈 전용 (글자·상태 표시 금지) |
| `chart-1`~`chart-7` | `design/tokens.json` | 〃 | 자산 구성 도넛의 종류 색(예금·적금·투자·보증금·부동산·자동차·기타 순서 고정, 색맹 검사 통과). 그래프 전용, 항상 이름·금액 글자와 함께 |

- 글자: `amount-hero` 32/40 700, `title` 22/30 700, `heading` 17/24 600, `amount` 17/24 600, `body` 15/22 400, `caption` 13/18 400, `label` 12/16 600.
- 간격 4px 단위 (`4 8 12 16 20 24 32`), 모서리 `8 / 14 / 22 / 9999`.
- 금액은 항상 `tabular-nums`, `12,000원` 형식. 지출은 `expense`(빨강, 라이트 #CC2F2F / 다크 #FF7A7A), 수입은 `primary` + `+`. 경고용 `danger`와는 따로 둔다 (2026-09-28 사용자 결정으로 "지출을 빨간색으로 칠하지 않는다"에서 변경).
- 사람 색은 **항상 이름 글자와 함께** 쓴다. 색만으로 구분하지 않는다.
- 카드에는 그림자 없음. 그림자는 떠 있는 것(추가 버튼, 패널, 탭바)에만.
- 모든 컨트롤에 포커스 링 (`0 0 0 2px surface, 0 0 0 4px primary`).
- 레이아웃: 1024px 이상은 사이드바(248px) 고정 + 메인만 스크롤, 미만은 하단 탭바(홈·내역·통계·정기지출·설정) + 추가 버튼. 목업 이미지는 없다. `spec/layout.md`와 `design/README.md`를 기준으로 한다.

## 코드 규칙

- **금액**: DB와 코드 모두 원 단위 정수. 포맷은 `lib/money.ts`만 사용한다.
- **날짜**: DB에는 `date`(거래일)와 `timestamptz`(기록 시각). "오늘", "이번 달"은 항상 `lib/date.ts`의 KST 함수로 계산한다. `new Date()`로 월 경계를 직접 계산하지 않는다.
- **계산 로직은 순수 함수**로 `lib/calc/`에 두고 단위 테스트를 쓴다 (합계, 분할 비율, 지난달 같은 기간, 정산, 짧은 금액 표기).
- **데이터 접근**: 읽기는 서버 컴포넌트, 쓰기는 서버 액션. 실시간 구독만 클라이언트에서.
- **보안**: 모든 테이블에 RLS를 켜고 정책을 마이그레이션에 함께 둔다. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이며 클라이언트 번들에 절대 들어가면 안 된다.
- **DB 변경은 마이그레이션으로만.** 대시보드에서 직접 고치지 않는다. 변경 후 타입을 다시 생성한다 (`pnpm db:types`).
- **삭제는 소프트 삭제** (`deleted_at`). 조회 쿼리는 항상 `deleted_at is null`.
- **문구**: 해요체, 짧게, 이모지·느낌표 없음. 버튼은 동작 그대로(`저장`, `삭제`). 오류는 원인과 해결 방법. 사람은 표시 이름으로 부른다.
- **접근성**: 실제 `<button>`, `<a>`, `<label>` 사용. 아이콘 버튼엔 `aria-label`. 키보드로 모든 기능 사용 가능.
- 컴포넌트 하나가 200줄을 넘으면 나눈다. `any` 금지.

## 명령어

```bash
pnpm dev            # 개발 서버 (http://localhost:3000)
pnpm lint           # ESLint
pnpm typecheck      # next typegen + tsc --noEmit
pnpm test           # Vitest
pnpm test:e2e       # Playwright (M3 이후)
pnpm db:link        # 클라우드 Supabase 프로젝트 연결 (처음 한 번, supabase login 필요)
pnpm db:migrate     # 마이그레이션을 클라우드 프로젝트에 적용 (supabase db push)
pnpm db:types       # DB 타입 생성 → lib/supabase/types.ts
```

로컬 Supabase(Docker)는 쓰지 않는다. 개발도 클라우드 프로젝트에 바로 연결한다.

이 PC 환경 메모: pnpm은 11.x (12.x는 exe라 윈도우 스마트 앱 컨트롤에 막힘), 전역 설치 위치 `%APPDATA%\npm`. Next.js 16은 `middleware.ts` 대신 루트 `proxy.ts`를 쓴다.

## 환경변수

`.env.local` (커밋 금지, `.env.example`에 키 이름만 둔다)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # Publishable key (옛 anon 키도 동작)
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_EMAILS=a@gmail.com,b@gmail.com
```

Vercel에도 같은 값을 등록한다.

## Git

- `main`은 항상 배포 가능한 상태. 기능은 브랜치에서 작업하고 PR로 합친다.
- 커밋 메시지는 한국어로 무엇을 했는지 한 줄: `내역 추가 패널 구현 (F-10)`. 관련 기능 ID를 괄호로 붙인다.
- 한 커밋에 한 가지 일.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
