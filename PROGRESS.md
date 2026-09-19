# 개발 진행 기록

DESIGN.md 6번(개발 우선순위) 순서대로 진행하면서, 각 단계에서 한 일과 유의사항을 기록합니다. 새 세션에서 이어서 작업할 때 여기부터 확인하면 됩니다.

## 진행 상태

| 단계 | 상태 | 비고 |
|---|---|---|
| 1. 프로젝트 세팅 (Next.js/Prisma/Supabase) | ✅ 완료 | Supabase 프로젝트 연결 + `prisma migrate dev` 완료, 테이블 7개 생성됨 |
| 2. 로그인 | ✅ 완료 | 실제 계정으로 로그인/로그아웃까지 브라우저 테스트 완료 |
| 3. 가계부 (등록/목록) | ✅ 완료 | 거래 등록/수정/삭제, 카테고리 관리, 월 필터까지 브라우저 테스트 완료 |
| 4. 일정관리 | 🔲 시작 전 | |
| 5. 여행계획 | 🔲 시작 전 | |

## 1~2단계에서 한 일

- `git init`, pnpm 기반 Next.js 16(App Router) + TypeScript + Tailwind v4 스캐폴딩
- shadcn/ui 초기화 (`init -d` 기본값) + `button`, `input`, `label`, `card` 컴포넌트 추가
- `prisma/schema.prisma`에 DESIGN.md 10번 스키마 반영 (Profile/Couple/Category/Transaction/Event/Trip/TripItem)
- `lib/prisma.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` — Supabase SSR 공식 패턴대로 작성
- `proxy.ts` — 비로그인 시 `/login` 리다이렉트, 로그인 상태에서 `/login` 접근 시 홈으로
- `actions/auth.ts` (signIn/signOut Server Actions), `app/login/page.tsx` (useActionState 폼)
- `app/page.tsx` — 로그인 후 Profile 조회해서 이름/컬러 표시, 없으면 안내 문구 + 로그아웃 버튼
- `scripts/link-couple.ts` — Supabase에 수동 생성한 계정 2개를 Couple+Profile로 연결하는 1회성 스크립트
- DESIGN.md에 "8. 폴더 구조" 절 신설 (7번과 9번 사이, 원래 비어있던 번호)
- `pnpm typecheck`, `pnpm lint`, `pnpm build` 모두 통과 확인. 개발 서버로 `/` 요청 시 Supabase 미설정 에러가 정확히 뜨는 것까지 확인(= proxy/미들웨어 로직 자체는 정상 동작)

## 3단계(가계부)에서 한 일

- `lib/auth.ts`: `requireProfile()` — Supabase 세션 + Prisma `Profile` 조회, coupleId 없으면 에러. Server Action에서 매번 호출해 인증 확인 (proxy.ts만 믿지 않음 — Next 공식 문서 권장 패턴)
- `app/globals.css`에 `--color-partner-a`(#B15B65) / `--color-partner-b`(#2F6F62) 토큰 추가 → 가계부 리스트 행 좌측 컬러 바에 사용 (DESIGN.md 9번 "색 구분은 장식이 아닌 기능" 요구사항 첫 적용)
- `actions/budget.ts`: `createCategory`/`deleteCategory`/`createTransaction`/`updateTransaction`/`deleteTransaction` — 전부 `useActionState`용 `{ error? }` 반환 패턴, 매 mutation 후 `revalidatePath("/budget")`
- `app/budget/page.tsx`(서버 컴포넌트) + `components/budget/*`(다이얼로그 3종) — 월별 필터(`?month=YYYY-MM`), flat 리스트, 카테고리 관리, 거래 추가/수정 다이얼로그
- 실제 브라우저(2개 계정 로그인, 카테고리 추가→거래 추가→수정→삭제→카테고리 삭제 제약 확인→월 이동)까지 전부 테스트 완료

## 3단계에서 발견/수정한 버그

- **`Button` + `render={<Link .../>}`인데 `nativeButton={false}`를 안 주면 클릭이 씹힘**: Base UI Button은 기본적으로 `nativeButton: true`라 실제 `<button>`이 아닌 요소(예: `next/link`의 `<a>`)로 렌더링하면 클릭 시 네비게이션이 아예 발생하지 않음(콘솔 경고까지 뜸). `<Link>`로 렌더링하는 모든 Button에는 `nativeButton={false}`를 명시할 것.
- **Base UI `Select`가 `defaultValue`/`value`만 주면 라벨을 안 보여줌**: `items={{ value: "라벨" }}` 형태의 `items` prop을 같이 안 주면 트리거에 "지출" 대신 원시 값 "expense"가 그대로 보임. `Select`를 쓸 때는 항상 `items`도 같이 넘길 것.
- **날짜 서버 검증 부족으로 잘못된 날짜가 `null`로 저장됨**: `new Date(dateValue)`가 유효하지 않은 문자열(Invalid Date)이어도 그대로 Prisma에 넘기면 DB에 `date: null`이 들어감(스키마상 non-null인데도). `actions/budget.ts`의 `parseDate()`에서 `Number.isNaN(date.getTime())`으로 유효성 검사 후 반려하도록 수정함 — 앞으로 날짜/시간 필드를 다루는 액션(일정관리 등)에서도 같은 패턴 적용할 것.
- **`useEffect` 안에서 `setState`로 다이얼로그 닫기 → lint 에러**: `react-hooks/set-state-in-effect` 규칙에 걸림. `useActionState` 결과가 바뀌었을 때 뭔가 하고 싶으면 `useEffect` 대신 렌더 중 "이전 상태와 비교 후 조건부 setState" 패턴(`if (state !== prevState) { setPrevState(state); ... }`) 사용할 것.

## ⚠️ 꼭 알아둬야 할 사항

### 이 프로젝트는 Next.js 16 — `middleware.ts`가 아니라 `proxy.ts`
Next 16부터 `middleware.ts`/`export function middleware`가 `proxy.ts`/`export function proxy`로 이름이 바뀜 (동작은 동일, `config`/`matcher` export는 그대로). 새 세션에서 "미들웨어 추가해줘" 같은 요청이 오면 `proxy.ts`에 로직을 추가할 것 — `middleware.ts`를 새로 만들면 안 됨.

### Prisma 7 — 스키마에 `url`/`directUrl`을 못 씀
Prisma 7부터 `datasource` 블록에 `url`/`directUrl`을 직접 못 쓰고, 연결 정보는 `prisma.config.ts`(CLI/마이그레이션용, `DIRECT_URL`)와 `lib/prisma.ts`의 `PrismaClient({ adapter })`(런타임용, `DATABASE_URL` + `@prisma/adapter-pg`)로 분리해야 함. 스키마 새로 만들 때 예전 방식(`url = env(...)`)을 쓰면 `prisma generate`/`migrate`가 즉시 에러남.

### `prisma.config.ts`에서 `dotenv/config`는 `.env.local`을 안 읽음
`import "dotenv/config"`는 `.env` 파일만 자동으로 읽고 `.env.local`은 무시함. 그래서 `.env.local`에 `DIRECT_URL`을 채워놔도 `prisma migrate dev`가 "datasource.url property is required" 에러를 냄. `import { config } from "dotenv"; config({ path: ".env.local" });` 형태로 명시적으로 로드해야 함 (지금은 고쳐져 있음).

### shadcn init 기본값이 `base-nova` 스타일(Base UI 기반)로 바뀜
`@radix-ui/react-*`가 아니라 `@base-ui/react` 위에 얹은 컴포넌트가 생성됨(`components.json`의 `style: "base-nova"`). 컴포넌트 커스터마이징할 때 Radix 문서를 그대로 따라하면 API가 안 맞을 수 있음 — Base UI 문서 기준으로 확인할 것.

### shadcn init 직후 폰트가 깨지는 버그 — 이미 수정해둠
`shadcn init`이 `app/globals.css`의 `@theme inline`에 `--font-sans: var(--font-sans)`(순환 참조)를 넣어서 폰트가 깨지는 알려진 버그가 있음. `"Geist", "Geist Fallback", ...` 같은 리터럴 값으로 고쳐뒀음 — 나중에 `shadcn add`로 컴포넌트를 추가하다가 `globals.css`가 다시 덮어써지면 이 부분을 다시 확인할 것.

### 디자인 토큰(Partner A/B 컬러, Fraunces 세리프 폰트 등)은 아직 미적용
지금은 shadcn 기본 컬러(neutral)/기본 폰트(Geist) 그대로. DESIGN.md 9번의 실제 디자인 방향(더스티 로즈/딥 파인그린, 세리프+산세리프 조합, 좌측 사이드바)은 가계부/일정관리 등 실제 화면을 만들 때 반영 예정 — 로그인 화면은 기능 확인용 최소 스타일임.

### 이 컴퓨터의 pnpm 관련 메모
로컬에 pnpm이 전역 설치돼있지 않아 `npm install -g pnpm`으로 설치함 (corepack은 서명 검증 에러로 실패). 설치 경로(`C:\Users\toxic\AppData\Roaming\npm`)를 사용자 PATH에 영구 등록했지만, 이 세션의 셸 도구는 매 호출마다 새 프로세스라 PATH 갱신이 반영 안 될 때가 있음 — pnpm 관련 명령이 "not recognized" 에러를 내면 `$env:PATH += ";C:\Users\toxic\AppData\Roaming\npm"`를 같은 명령 안에서 먼저 실행할 것.

### 브라우저 자동화로 테스트할 때 참고
이 프로젝트를 Claude in Chrome 등으로 테스트할 때, 작은 아이콘 버튼(휴지통 삭제 버튼 등)은 좌표/ref 클릭이 가끔 씹히는 경우가 있었음 — 클릭했는데 서버 로그에 해당 액션이 안 찍히면 `document.querySelector(...).click()`으로 JS에서 직접 클릭해서 재확인할 것. 네이티브 `<input type="date">`에 키보드로 타이핑해서 값 넣는 것도 세그먼트가 꼬이기 쉬우니, `input.value = "YYYY-MM-DD"` 후 `input` / `change` 이벤트를 dispatch하는 방식이 더 안정적임.

## 다음 단계: 4. 일정관리

DESIGN.md 3번 기능 정의서 기준 — 월간 캘린더 뷰 + 일정 등록/수정/삭제 + 다가오는 일정. `Event` 모델은 스키마에 이미 있음(`prisma/schema.prisma`). 가계부에서 만든 패턴(`lib/auth.ts`의 `requireProfile()`, Server Action에서 `revalidatePath`, flat list + Partner 컬러 바)을 그대로 재사용하면 됨.
