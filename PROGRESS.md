# 개발 진행 기록

DESIGN.md 6번(개발 우선순위) 순서대로 진행하면서, 각 단계에서 한 일과 유의사항을 기록합니다. 새 세션에서 이어서 작업할 때 여기부터 확인하면 됩니다.

## 진행 상태

| 단계 | 상태 | 비고 |
|---|---|---|
| 1. 프로젝트 세팅 (Next.js/Prisma/Supabase) | ✅ 완료 | Supabase 프로젝트 연결 + `prisma migrate dev` 완료, 테이블 7개 생성됨 |
| 2. 로그인 | ✅ 완료 | 실제 계정으로 로그인/로그아웃까지 브라우저 테스트 완료 |
| 3. 가계부 (등록/목록) | ✅ 완료 | 거래 등록/수정/삭제, 카테고리 관리, 월 필터까지 브라우저 테스트 완료 |
| 디자인 방향 전환 + 레이아웃 셸 | ✅ 완료 | 사용자 피드백으로 Linear/Plane→노션/Slack 방향 전환, 사이드바(데스크톱)/탭바(모바일) 셸 구축 |
| 디자인 리터치 (토스 톤) + 설정 페이지 분리 | ✅ 완료 | Pretendard 폰트, 토스 블루 팔레트, 폰트 크기 축소, 카테고리 관리를 `/settings`로 분리 |
| UX 버그 수정 (Select/날짜/필수입력) | ✅ 완료 | 셀렉트 드롭다운 위치, 캘린더 날짜 피커, 네이티브 필수입력 팝업 제거 |
| 홈 화면 가계부 요약 위젯 | ✅ 완료 | 이번 달 수입/지출/순잔액 스탯 + 카테고리별 지출 스택 바 차트 |
| 가계부 캘린더 뷰 | ✅ 완료 | 월간 캘린더에서 날짜별 수입/지출 미리보기 + 날짜 클릭 시 그날 거래만 필터링 |
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

## 디자인 리터치(토스 톤)에서 한 일

- `pnpm add pretendard` → `app/globals.css`에서 `pretendard/dist/web/variable/pretendardvariable.css`를 `@import`, `--font-sans`/`--font-heading`을 `"Pretendard Variable", -apple-system, ...` 리터럴로 지정. `app/layout.tsx`의 Geist Sans 로딩은 제거(Geist Mono는 유지)
- `app/globals.css`의 `:root`/`.dark` 색상 토큰을 토스 팔레트로 교체 — Primary `#3182F6`, Accent `#E8F3FF`, Muted `#F2F4F6`/`#8B95A1`, Border `#E5E8EB`, Destructive `#F04452`. Partner A/B 컬러는 그대로 유지(기능이라 무관)
- 페이지 h1/카드 타이틀 `text-xl`→`text-lg`, 자주 쓰는 lucide 아이콘에 `strokeWidth={1.5}` 적용해서 더 부드럽게
- **카테고리 관리를 가계부 다이얼로그에서 `/settings` 페이지로 분리**: `components/budget/category-manager.tsx`(Dialog 버전) 삭제, 로직을 `components/settings/category-settings.tsx`로 옮겨서 페이지에 바로 렌더. `app/(app)/settings/page.tsx` 신규, `components/nav-links.tsx`에 "설정" 메뉴 추가. 가계부 화면의 카테고리 0개 안내 문구는 `/settings`로 가는 링크로 변경
- Pretendard 폰트가 실제로 로드됐는지 `document.fonts`로 확인(`Pretendard Variable:loaded`), 설정 페이지 카테고리 추가/삭제까지 브라우저 테스트 완료
- 이어서 사용자가 `ref/`(gitignore 대상 아님, 그냥 참고용 스크린샷 폴더)에 Linear/Plane류 툴 참고 이미지 3장(`home.png`/`list.png`/`cal.png`)을 넣어줌 → 공통적으로 콘텐츠 영역이 사이드바 옆 전체 폭을 쓰고, 액션 버튼은 작게 툴바에 얹혀있는 스타일이었음. 이를 반영해서:
  - `app/(app)/budget/page.tsx`, `app/(app)/settings/page.tsx`의 `mx-auto max-w-2xl` 제거 → 홈처럼 전체 폭 사용
  - "거래 추가" 버튼을 `w-full` 큰 버튼에서 `size="sm"` 작은 버튼으로 바꾸고 페이지 제목 옆(툴바 자리)으로 이동
  - `components/settings/category-settings.tsx`의 이름 입력 필드는 `flex-1`(전체 폭 늘어남) 대신 `sm:w-64` 고정폭으로 — 페이지는 전체 폭을 쓰되 개별 폼 컨트롤까지 늘어나진 않게 함
- `components/ui/input.tsx`/`components/ui/select.tsx`가 기본형(얇은 테두리 + 투명 배경)이라 밋밋하다는 피드백 → 토스 스타일 filled input으로 교체: 테두리 없애고 `bg-secondary`(연회색) 채움, 포커스 시 `bg-background`로 바뀌면서 토스 블루 테두리+링 표시, 높이도 `h-8`→`h-9`로 살짝 키움. 로그인/설정 폼 등 `Input`/`Select`를 쓰는 모든 화면에 자동 반영됨

## 발견/수정한 버그 2건 (사용자가 직접 지적함)

- **`components/ui/select.tsx`의 `SelectContent`가 트리거를 가리고 열림**: 기본값 `alignItemWithTrigger: true`가 macOS 네이티브 팝업 메뉴 스타일(선택된 항목이 트리거와 같은 위치에 겹쳐서 뜨는 방식)이라, 웹에서 흔히 기대하는 "트리거 아래로 드롭다운" 동작이 아니었음. `alignItemWithTrigger: false`, `align: "start"`로 기본값 변경 → 이제 일반적인 드롭다운처럼 트리거 바로 아래에 열림. `Select`를 쓰는 모든 화면(가계부 거래 폼, 설정 카테고리 폼)에 자동 반영.
- **날짜 입력이 브라우저 네이티브 `<input type="date">`라 밋밋함** → `pnpm dlx shadcn add calendar popover`로 설치(`react-day-picker`, `date-fns` 의존성 추가됨), `components/date-picker.tsx` 신규(Popover+Calendar 조합, 한글 로케일(`date-fns/locale/ko`), 트리거 버튼 + 숨김 input으로 기존 `FormData` 기반 Server Action과 호환). `components/budget/transaction-form-dialog.tsx`의 날짜 필드를 이걸로 교체, 새 거래 등록 시 기본값을 오늘 날짜로 설정. 나중에 4단계(일정관리) 만들 때도 이 컴포넌트 재사용 가능.
- **필수 입력을 비우고 제출하면 브라우저 네이티브 "이 입력란을 작성하세요" 말풍선이 뜸**: `Input`/`Select`에 걸어둔 HTML `required` 속성 때문에, 폼이 서버로 가기도 전에 브라우저가 자체 검증 팝업으로 막아버려서 우리가 만든 예쁜 에러 메시지(`state.error`)가 아예 뜰 기회가 없었음. 모든 폼(`app/login/page.tsx`, `components/budget/transaction-form-dialog.tsx`, `components/settings/category-settings.tsx`)에서 `required`를 제거함 — 이미 Server Action 쪽에 동일한 필수값 검증이 다 있어서(비어있으면 `state.error`로 반환) 기능적으로는 그대로고, 에러 메시지만 우리 스타일로 통일됨. **앞으로 새 폼 만들 때도 `required` 쓰지 말고 Server Action에서 검증 후 `state.error`로 보여줄 것.**

## 홈 화면 가계부 요약 위젯

DESIGN.md 5번(홈 대시보드, 원래 "MVP 이후"로 미뤄뒀던 항목)을 가계부 부분만 앞당겨서 만듦 — 사용자가 4단계(일정관리) 가기 전에 요청함.

- 차트/그래프를 만들기 전에 **`dataviz` 스킬을 반드시 먼저 로드**해서 절차(폼 선택→색상→검증→마크→인터랙션→접근성)를 따름. "카테고리별 지출 비중"은 part-to-whole이라 스킬 가이드대로 파이 차트가 아니라 **가로 스택 바**로 만듦.
- `node scripts/validate_palette.js`로 카테고리 색상(6슬롯, dataviz 스킬의 검증된 기본 팔레트) 팔레트를 우리 앱의 흰 배경(`#ffffff`)에 대해 실제로 돌려서 통과 확인 — 눈대중으로 정하지 않음. 카테고리가 6개 넘으면 나머지는 "기타"(회색, 팔레트 슬롯 안 씀)로 접음.
- `components/home/expense-breakdown.tsx` 신규: 서버 컴포넌트로 작성 가능했음(JS 상태 없이 Tailwind `group/seg` + `group-hover/seg:` 순수 CSS로 호버 툴팁 구현 — 툴팁은 보조 수단이고 값은 범례에도 항상 텍스트로 같이 보여줘서 "툴팁이 유일한 정보 경로"가 되지 않게 함, dataviz 스킬의 필수 규칙).
- `app/(app)/page.tsx`에 이번 달 수입/지출/순잔액 스탯 타일 3개 + 위 컴포넌트 추가, "가계부 전체 보기" 링크로 `/budget` 연결. 프로필 없는 계정은 기존 안내 카드만 보이게 그대로 둠.
- 브라우저에서 카테고리 7개(임시 시드 스크립트로 거래 채움 → 테스트 후 삭제)로 6개+기타 접힘, 빈 상태(거래 0개) 문구까지 확인.

## 가계부 캘린더 뷰

사용자가 "9월 1일에 등록한 거래를 리스트에서 찾기 어렵다"며 요청 — 리스트 위에 월간 캘린더를 추가해서 날짜별로 한눈에 보이게 함.

- `components/budget/budget-day-view.tsx` 신규 (client 컴포넌트, `date-fns`로 그리드 계산: `startOfWeek(startOfMonth(...))` ~ `endOfWeek(endOfMonth(...))`로 6주 그리드 생성). 날짜 칸마다 그날 수입/지출 합계를 `+390만`/`-3.6만`처럼 만원 단위로 축약해서 표시(작은 칸에 맞추기 위함, `compactKRW()` 헬퍼).
- 날짜를 클릭하면 그 날짜로 거래 목록이 필터링되고 "OO월 OO일 거래" + "전체 보기" 버튼이 뜸. 다시 클릭하거나 "전체 보기"를 누르면 이번 달 전체 목록으로 돌아감(기존 동작 그대로 유지) — 이 상태는 `budget-day-view.tsx` 안의 `selectedDate` state 하나로 관리, 월 이동(prev/next)은 기존처럼 서버 컴포넌트(`app/(app)/budget/page.tsx`)의 `?month=` 쿼리 파라미터로 그대로 처리(캘린더 컴포넌트는 월 이동 로직을 안 가짐).
- 리스트 렌더링(거래 행 markup, 수정/삭제 버튼)을 `app/(app)/budget/page.tsx`에서 이 컴포넌트 안으로 옮김 — 서버 페이지는 이제 데이터 조회 + `rows`(직렬화된 배열, `Date` 객체 대신 `yyyy-MM-dd` 문자열)를 만들어서 넘겨주는 역할만 함.
- 다른 달의 날짜 칸(그리드 채우기용)은 클릭 불가/흐리게 처리 — 아직 그 달 데이터를 안 불러왔기 때문에 굳이 인터랙션 안 넣음. 필요하면 나중에 클릭 시 해당 월로 이동하게 확장 가능.
- 색상은 dataviz 스킬 대상이 아님(카테고리 비교 차트가 아니라 그냥 +/- 텍스트라서) — 기존 리스트처럼 그냥 전경색/보조색 텍스트로만 구분, 빨강/초록 같은 임의 색 안 씀.
- 실제 사용자가 입력해둔 데이터(9/1 교통비 -1,234원, 9/19 월급/교통비/식비)로 캘린더 표시 + 날짜 클릭 필터링 + 전체 보기 리셋까지 브라우저에서 직접 확인.

## ⚠️ 꼭 알아둬야 할 사항

### 이 프로젝트는 Next.js 16 — `middleware.ts`가 아니라 `proxy.ts`
Next 16부터 `middleware.ts`/`export function middleware`가 `proxy.ts`/`export function proxy`로 이름이 바뀜 (동작은 동일, `config`/`matcher` export는 그대로). 새 세션에서 "미들웨어 추가해줘" 같은 요청이 오면 `proxy.ts`에 로직을 추가할 것 — `middleware.ts`를 새로 만들면 안 됨.

### Prisma 7 — 스키마에 `url`/`directUrl`을 못 씀
Prisma 7부터 `datasource` 블록에 `url`/`directUrl`을 직접 못 쓰고, 연결 정보는 `prisma.config.ts`(CLI/마이그레이션용, `DIRECT_URL`)와 `lib/prisma.ts`의 `PrismaClient({ adapter })`(런타임용, `DATABASE_URL` + `@prisma/adapter-pg`)로 분리해야 함. 스키마 새로 만들 때 예전 방식(`url = env(...)`)을 쓰면 `prisma generate`/`migrate`가 즉시 에러남.

### `prisma.config.ts`에서 `dotenv/config`는 `.env.local`을 안 읽음
`import "dotenv/config"`는 `.env` 파일만 자동으로 읽고 `.env.local`은 무시함. 그래서 `.env.local`에 `DIRECT_URL`을 채워놔도 `prisma migrate dev`가 "datasource.url property is required" 에러를 냄. `import { config } from "dotenv"; config({ path: ".env.local" });` 형태로 명시적으로 로드해야 함 (지금은 고쳐져 있음).

### Base UI 팝업(다이얼로그/셀렉트 등)이 닫히지 않고 영원히 열려있는 버그 — 고쳐둠
이 프로젝트의 `@base-ui/react` 버전에서, 팝업을 닫을 때 내부적으로 CSS 애니메이션이 끝나길 기다리는 로직(`useAnimationsFinished`가 `element.getAnimations()`의 완료를 기다림)이 이 환경에서 절대 resolve되지 않아서 X 버튼/Escape/바깥 클릭 어떤 걸로 닫으려 해도 다이얼로그가 계속 화면에 남아있는 심각한 버그가 있었음(직접 소스 까보고 확인함 — 내 코드 문제가 아니라 라이브러리 자체 문제, `DialogContent`에 커스텀 로직을 전혀 안 넣은 카테고리 관리 다이얼로그에서도 동일하게 재현됨). `app/layout.tsx`의 `<head>`에 `globalThis.BASE_UI_ANIMATIONS_DISABLED = true`를 설정하는 스크립트를 추가해서 애니메이션 완료 대기 자체를 건너뛰게 해 해결함 — 이후 새로 만드는 Dialog/Select/Popover 등 애니메이션 있는 Base UI 컴포넌트도 이 플래그 덕분에 정상적으로 닫힘. 혹시 이 플래그를 지우거나 값을 바꾸면 이 버그가 재발하니 주의.

### shadcn init 기본값이 `base-nova` 스타일(Base UI 기반)로 바뀜
`@radix-ui/react-*`가 아니라 `@base-ui/react` 위에 얹은 컴포넌트가 생성됨(`components.json`의 `style: "base-nova"`). 컴포넌트 커스터마이징할 때 Radix 문서를 그대로 따라하면 API가 안 맞을 수 있음 — Base UI 문서 기준으로 확인할 것.

### shadcn init 직후 폰트가 깨지는 버그 — 이미 수정해둠
`shadcn init`이 `app/globals.css`의 `@theme inline`에 `--font-sans: var(--font-sans)`(순환 참조)를 넣어서 폰트가 깨지는 알려진 버그가 있음. `"Geist", "Geist Fallback", ...` 같은 리터럴 값으로 고쳐뒀음 — 나중에 `shadcn add`로 컴포넌트를 추가하다가 `globals.css`가 다시 덮어써지면 이 부분을 다시 확인할 것.

### 디자인 방향: 노션/Slack 느낌으로 전환함 (Linear/Plane → 폐기)
가계부까지 만들고 나서 사용자가 "노션/Slack 느낌을 원했다"는 피드백을 줘서 DESIGN.md 9번을 다시 씀 — 세리프 헤딩 계획 폐기(전부 산세리프), 좌측 고정 사이드바(데스크톱)/상단바+하단 탭바(모바일) 셸을 실제로 구현함(`components/app-shell.tsx`, `components/nav-links.tsx`, `app/(app)/layout.tsx`). Partner A/B 컬러는 페이지 톤이 아니라 리스트 행 컬러 바 등 "기능적 포인트"로만 계속 사용. 앞으로 만드는 화면(`app/(app)/...`)은 이 셸 안에 자동으로 들어감.

### 이 컴퓨터의 pnpm 관련 메모
로컬에 pnpm이 전역 설치돼있지 않아 `npm install -g pnpm`으로 설치함 (corepack은 서명 검증 에러로 실패). 설치 경로(`C:\Users\toxic\AppData\Roaming\npm`)를 사용자 PATH에 영구 등록했지만, 이 세션의 셸 도구는 매 호출마다 새 프로세스라 PATH 갱신이 반영 안 될 때가 있음 — pnpm 관련 명령이 "not recognized" 에러를 내면 `$env:PATH += ";C:\Users\toxic\AppData\Roaming\npm"`를 같은 명령 안에서 먼저 실행할 것.

### 라우트 구조 재편: `app/(app)/` route group
로그인 이후 화면은 전부 `app/(app)/` 안으로 옮김(`page.tsx`, `budget/page.tsx`) — route group이라 URL은 그대로(`/`, `/budget`)고, `app/(app)/layout.tsx`가 `AppShell`을 씌워줌. `/login`은 이 그룹 밖에 있어서 셸이 안 붙음. `lib/auth.ts`의 `getSessionProfile()`(React `cache()`로 감쌈)을 레이아웃과 페이지가 같이 써서 세션 조회가 중복 안 되게 함 — `requireProfile()`은 그 위에 얹혀서 coupleId 없으면 에러 던지는 기존 동작 유지.

### `next build` 직후에는 dev 서버를 재시작해야 함 + Windows에서 `taskkill /IM node.exe`는 전체 node 프로세스를 죽임
같은 `.next` 디렉토리를 build와 dev가 같이 쓰면 라우트 타입 캐시가 꼬여서 `pnpm typecheck`가 존재하지 않는 파일을 찾는 에러를 냄 — build 돌린 뒤엔 dev 서버를 재시작할 것. 재시작할 때 `taskkill //F //IM node.exe`를 쓰면 이름 기준으로 전체 node 프로세스를 다 죽이므로(이 프로젝트의 dev 서버뿐 아니라 시스템의 다른 node 프로세스도 영향받을 수 있음) 가능하면 PID를 특정해서 끄는 걸 우선 고려할 것.

### 브라우저 자동화로 테스트할 때 참고
이 프로젝트를 Claude in Chrome 등으로 테스트할 때, 작은 아이콘 버튼(휴지통 삭제 버튼 등)은 좌표/ref 클릭이 가끔 씹히는 경우가 있었음 — 클릭했는데 서버 로그에 해당 액션이 안 찍히면 `document.querySelector(...).click()`으로 JS에서 직접 클릭해서 재확인할 것. 네이티브 `<input type="date">`에 키보드로 타이핑해서 값 넣는 것도 세그먼트가 꼬이기 쉬우니, `input.value = "YYYY-MM-DD"` 후 `input` / `change` 이벤트를 dispatch하는 방식이 더 안정적임.

## 다음 단계: 4. 일정관리

DESIGN.md 3번 기능 정의서 기준 — 월간 캘린더 뷰 + 일정 등록/수정/삭제 + 다가오는 일정. `Event` 모델은 스키마에 이미 있음(`prisma/schema.prisma`).

**재사용할 수 있는 것들**
- `lib/auth.ts`의 `requireProfile()` / `getSessionProfile()` — 인증/프로필 조회
- Server Action 패턴(`actions/budget.ts` 참고): `useActionState`용 `{ error? }` 반환, mutation 후 `revalidatePath`, 날짜는 꼭 `parseDate()`처럼 `Number.isNaN(date.getTime())`으로 유효성 검사할 것
- `components/date-picker.tsx` — 날짜/시간 입력에 그대로 재사용 가능 (일정 등록 시 날짜 선택에 바로 쓰면 됨)
- flat list + Partner 컬러 바 스타일(가계부 리스트 참고), 셀렉트/인풋은 이미 토스 filled 스타일 적용된 공통 컴포넌트(`components/ui/select.tsx`, `input.tsx`) 그대로 사용
- 새 화면은 `app/(app)/calendar/page.tsx`로 만들면 셸이 자동으로 씌워짐 — 만든 뒤 `components/nav-links.tsx`에 항목 추가 잊지 말 것

**주의**
- 월간 캘린더 "그리드"를 새로 만들어야 하는데, `components/ui/calendar.tsx`(react-day-picker 기반, 이번에 날짜 피커용으로 설치함)를 그대로 월간 뷰로 재활용할 수 있는지 먼저 검토해볼 것 — 안 맞으면 직접 그리드 짜야 함
- 혹시 이 기능에 그래프/차트가 필요해지면(예: 이번 달 일정 유형별 비중 같은 거) **`dataviz` 스킬을 코드 작성 전에 반드시 로드**하고, 색상은 `node scripts/validate_palette.js`로 검증할 것 — 홈 화면 위젯 만들 때 했던 방식 그대로 따르면 됨
