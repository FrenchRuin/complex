# 💑 커플 라이프 매니저 - 기능 정의서 (v1.0)

> 기술 스택은 다루지 않고, "무엇을 만들 것인가"만 정리한 문서입니다.

## 0. 서비스 개요

결혼을 앞둔 커플 두 사람이 함께 쓰는 개인용 웹 서비스. 가계부, 일정관리, 여행계획을 한 곳에서 관리한다.

- **사용자**: 정확히 2명 (본인 + 배우자)
- **개발 방향**: 데모 버전을 먼저 만들고, 사용하면서 점진적으로 다듬는다 (완벽한 v1을 처음부터 만들지 않는다)
- **핵심 가치**: 두 사람의 데이터가 자연스럽게 공유되는 것. 각자 입력해도 서로 다 볼 수 있어야 함

---

## 1. 로그인 / 계정

### MVP
- 아이디/비밀번호 로그인 (두 사람 계정만 존재)
- 회원가입 페이지 없음 — 계정은 관리자(개발자 본인)가 직접 생성
- 로그인 안 하면 모든 페이지 접근 불가 (전부 비공개)
- 로그인 유지 (자동 로그아웃 없이 오래 유지되는 세션)

### 확장 아이디어 (v2)
- 비밀번호 찾기/변경
- "누구로 로그인했는지" 표시 (예: 우측 상단에 이름/아바타)

---

## 2. 가계부

### 목적
같이 쓰는 돈을 기록하고, 한눈에 얼마 썼는지 파악한다.

### MVP 기능
- **거래 등록**: 수입/지출, 금액, 날짜, 카테고리, 메모, 누가 썼는지(본인/배우자) 기록
- **거래 목록**: 월별로 필터링해서 보기, 최신순 정렬
- **거래 수정/삭제**
- **카테고리 관리**: 식비, 데이트, 결혼준비, 경조사 등 카테고리를 자유롭게 추가/삭제
- **월별 요약**: 이번 달 총 수입, 총 지출, 카테고리별 지출 비중 (그래프)

### 사용 시나리오
> "어제 저녁 데이트하면서 쓴 돈 8만원을 입력한다. 카테고리는 '데이트'로 하고, 내가 냈다고 표시한다. 배우자가 나중에 접속해서 이번 달 데이트 비용이 얼마나 나갔는지 확인한다."

### 확장 아이디어 (v2)
- 영수증 사진 첨부
- 정산 기능 (누가 얼마 더 냈는지 자동 계산 → 반반 정산 시 얼마 보내야 하는지)
- 예산 목표 설정 (이번 달 식비 50만원 이내로) 및 초과 시 표시
- 반복 거래 자동 등록 (매달 나가는 고정비)
- 결혼 준비 비용을 별도로 묶어서 보는 뷰 (총 예산 대비 얼마 썼는지)

---

## 3. 일정관리

### 목적
결혼 준비 일정, 데이트, 각자의 개인 일정 중 공유할 것들을 함께 본다.

### MVP 기능
- **월간 캘린더 뷰**: 한 달치 일정을 한눈에
- **일정 등록**: 제목, 날짜/시간, 종일 여부, 카테고리(결혼준비/데이트/기타), 메모
- **일정 수정/삭제**
- **다가오는 일정**: 홈 화면에서 가까운 일정 몇 개를 미리 보여줌
- 두 사람 모두 서로의 일정을 보고 추가할 수 있음 (공동 캘린더 하나)

### 사용 시나리오
> "웨딩홀 미팅이 다음 주 토요일 오후 2시로 잡혔다. 캘린더에 등록해두면 배우자도 로그인해서 바로 확인 가능하다."

### 확장 아이디어 (v2)
- 결혼식까지 D-day 카운터
- 반복 일정 (매주 화요일 데이트 등)
- 일정별 체크리스트 (웨딩홀 미팅 준비물 등)
- 알림/리마인더

---

## 4. 여행계획

### 목적
신혼여행이나 커플 여행을 계획할 때, 일자별로 뭘 할지 정리하고 공유한다.

### MVP 기능
- **여행 목록**: 계획중 / 확정 / 완료 상태로 관리
- **여행 생성**: 제목, 목적지, 기간(시작~끝), 예산(선택)
- **일자별 세부 일정**: Day 1, Day 2... 별로 장소/숙소/이동/할일 등록, 시간 순 정렬
- **체크리스트**: 여행 준비물이나 할 일을 체크 형태로 관리

### 사용 시나리오
> "제주도 신혼여행 계획을 짠다. Day 1에는 공항 도착 → 숙소 체크인 → 저녁 식사, Day 2에는 성산일출봉 → 카페 순서로 등록한다. 준비물 체크리스트에 '여권'을 추가하고 챙기면 체크한다."

### 확장 아이디어 (v2)
- 지도에 장소 핀으로 표시
- 여행 예산을 가계부와 연동해서 실제 얼마 썼는지 비교
- 여행 사진첩
- 여행 후기/기록 남기기

---

## 5. 홈 / 대시보드 (선택, MVP 이후)

로그인하면 처음 보는 화면. 세 기능의 요약을 한눈에 보여준다.

- 이번 달 가계부 요약 (수입/지출 합계)
- 다가오는 일정 3~4개
- 진행중인 여행 계획 (있다면)

> MVP 단계에서는 생략하고, 세 기능이 각각 안정화된 후 마지막에 만들어도 됨.

---

## 6. 개발 우선순위 (제안)

데모 버전 기준으로 아래 순서를 제안합니다. 각 기능을 "최소한으로 동작하는 버전"까지만 먼저 만들고, 세 개 다 만든 뒤에 다듬는 걸 추천해요.

1. 로그인 (두 계정만 되면 됨)
2. 가계부 - 등록/목록만 (요약 그래프는 나중)
3. 일정관리 - 캘린더 뷰 + 등록만
4. 여행계획 - 여행 생성 + 일자별 등록만
5. (여기까지 데모 완성 → 실사용 시작)
6. 이후 확장 아이디어들을 사용하면서 필요한 순서대로 추가

---

## 7. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 14+ (App Router) | Server Actions로 API 레이어 최소화 |
| 언어 | TypeScript | |
| 스타일 | Tailwind CSS + shadcn/ui | |
| DB / 인증 / 스토리지 | Supabase (Postgres 기반) | DB+인증+파일저장소+실시간(v2)을 한 플랫폼에서 |
| ORM | Prisma | Supabase Postgres에 연결 |
| 캘린더 UI | 직접 구현 (date-fns + Tailwind grid, shadcn Calendar 컴포넌트 재활용) | MVP엔 월간 그리드만 필요. 주간뷰/드래그 필요해지면 v2에서 FullCalendar 도입 검토 |
| 클라이언트 상태관리 | 서버 컴포넌트 위주 (Server Actions + revalidatePath) + 필요한 곳만 `useOptimistic` | 체크리스트 토글 등 즉각 반응이 필요한 곳만 낙관적 업데이트. TanStack Query는 실시간 동기화 도입 시(v2) 재검토 |
| 모바일 지원 | 반응형 웹(처음부터) → PWA(v2) | 홈 화면에 추가해서 앱처럼 쓰는 것 목표. `next-pwa`(또는 Serwist) + manifest.json + 아이콘 세트 |
| 배포 | Vercel | |

## 8. 폴더 구조

```
app/
  login/page.tsx        # 로그인 (공개)
  page.tsx              # 홈 (보호됨)
  layout.tsx
actions/
  auth.ts               # signIn/signOut Server Actions
components/
  ui/                    # shadcn 컴포넌트
lib/
  prisma.ts
  supabase/
    server.ts            # Server Component/Action용 Supabase 클라이언트
    middleware.ts         # proxy.ts에서 쓰는 세션 갱신 헬퍼
prisma/
  schema.prisma
scripts/
  link-couple.ts         # Couple/Profile 1회성 연결 스크립트
proxy.ts                 # 라우트 보호 (Next.js 16 — middleware.ts의 새 이름)
```

가계부/일정관리/여행계획을 만들 때는 `app/budget`, `app/calendar`, `app/trips`, `actions/budget.ts` 등으로 이 구조를 그대로 확장한다. 폴더별로 특별한 규칙이 필요해지면 그 폴더에 하위 CLAUDE.md를 둔다.

> **Next.js 버전 메모**: 이 프로젝트는 Next.js 16을 사용. `middleware.ts`가 `proxy.ts`로 이름이 바뀌었고(`export function proxy` + `export const config`), 다른 부분은 App Router 문법과 거의 동일. 헷갈리면 `node_modules/next/dist/docs/` 참고.

---

## 9. 디자인 방향

> 레퍼런스: Linear/Plane 스타일 프로젝트 관리 툴 (사이드바 + 상단 필터 탭 + 밀도 있는 리스트뷰 구조). 톤은 다크/라이트 모드 전환 가능하게, "두 사람을 색으로 구분"하는 걸 장식이 아닌 기능으로 사용.

### 색상 토큰

| 이름 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| Surface (배경) | `#FAF8F4` | `#1B1A22` | 전체 배경 |
| Ink (텍스트) | `#2A2620` | `#EDE9E2` | 본문 텍스트 |
| Partner A | `#B15B65` (더스티 로즈) | 동일(다크에서 살짝 밝게) | 나(배우자1) — 거래/일정 좌측 컬러 바 등 |
| Partner B | `#2F6F62` (딥 파인그린) | 동일 | 배우자(배우자2) |
| Border/Divider | Surface에서 파생된 저채도 회색 | 〃 | 리스트 행 구분선 |

### 타이포그래피
- 헤딩/섹션 타이틀: 세리프 (Fraunces 등)
- 본문/리스트/숫자: 산세리프 (Inter, Public Sans 등)

### 레이아웃
- 좌측 고정 사이드바 (대시보드 / 가계부 / 일정관리 / 여행계획 + 다크·라이트 토글)
- 메인 영역: 상단 페이지명+필터 탭, 그 아래 flat 리스트뷰 (카드 UI 지양)
- 리스트 각 행 좌측에 Partner A/B 컬러 바로 "누가 등록/지출했는지" 표시

> 세부 컴포넌트 스타일은 실제 구현 단계에서 다듬을 예정. 톤/컬러는 나중에 얼마든지 조정 가능.

### 모바일 / PWA
- **처음부터**: 모든 화면을 모바일 우선(mobile-first)으로 반응형 설계 — Tailwind 브레이크포인트 기준으로 좁은 화면에서 사이드바는 하단 탭바나 햄버거 메뉴로 전환
- **v2 (추후)**: PWA로 전환해서 배우자 폰 홈 화면에 아이콘 추가 → 앱처럼 실행
  - `manifest.json` (앱 이름, 아이콘, 테마 색 — Surface/Ink 토큰 재사용)
  - Service Worker (`next-pwa` 또는 Serwist 라이브러리로 설정) — 오프라인 캐싱은 필수 아님, 설치 가능하게만 만드는 최소 구성으로 시작
  - iOS는 홈 화면 추가 시 별도 아이콘/스플래시 메타 태그 필요 (`apple-touch-icon` 등)
- 이후 사용성이 부족하면 그때 React Native 등 네이티브 앱 전환 검토 (지금 단계에서는 오버스펙)

## 10. 데이터베이스 스키마 (초안)

> 개발하면서 바뀔 수 있는 대략적인 구조입니다. Prisma schema 기준으로 작성했고, Supabase Auth가 관리하는 인증 정보(`auth.users`)와 앱 도메인 데이터를 분리했습니다.

```prisma
// Supabase Auth의 auth.users와 1:1로 연결되는 프로필
// id는 auth.users.id(UUID)와 동일하게 사용
model Profile {
  id        String   @id
  name      String   // "나" / "배우자" 같은 표시 이름
  colorRole String   // "A" | "B" — 디자인의 Partner A/B 컬러와 매칭
  coupleId  String?
  couple    Couple?  @relation(fields: [coupleId], references: [id])
  createdAt DateTime @default(now())
}

// 두 사람을 묶는 단위. 대부분의 데이터는 이 coupleId로 공유됨
model Couple {
  id           String        @id @default(cuid())
  name         String        // 예: "민수 ♥ 지은"
  profiles     Profile[]
  categories   Category[]
  transactions Transaction[]
  events       Event[]
  trips        Trip[]
  createdAt    DateTime      @default(now())
}

// 가계부 카테고리 (식비, 데이트, 결혼준비 등)
model Category {
  id           String        @id @default(cuid())
  coupleId     String
  couple       Couple        @relation(fields: [coupleId], references: [id])
  name         String
  type         String        // "income" | "expense"
  icon         String?
  transactions Transaction[]
}

// 가계부 거래
model Transaction {
  id          String   @id @default(cuid())
  coupleId    String
  couple      Couple   @relation(fields: [coupleId], references: [id])
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  type        String   // "income" | "expense"
  amount      Int      // 원 단위
  memo        String?
  date        DateTime
  createdById String   // Profile.id — 누가 입력했는지 (Partner A/B 컬러 표시에 사용)
  createdAt   DateTime @default(now())
}

// 일정
model Event {
  id          String    @id @default(cuid())
  coupleId    String
  couple      Couple    @relation(fields: [coupleId], references: [id])
  title       String
  description String?
  startAt     DateTime
  endAt       DateTime?
  isAllDay    Boolean   @default(false)
  category    String?   // "결혼준비" | "데이트" | "기타"
  createdById String    // Profile.id
  createdAt   DateTime  @default(now())
}

// 여행
model Trip {
  id          String     @id @default(cuid())
  coupleId    String
  couple      Couple     @relation(fields: [coupleId], references: [id])
  title       String     // "제주도 신혼여행"
  destination String?
  startDate   DateTime
  endDate     DateTime
  budget      Int?
  status      String     @default("planning") // planning | confirmed | done
  items       TripItem[]
  createdAt   DateTime   @default(now())
}

// 여행 세부 일정 / 체크리스트
model TripItem {
  id        String  @id @default(cuid())
  tripId    String
  trip      Trip    @relation(fields: [tripId], references: [id])
  day       Int     // 여행 몇일차 (체크리스트 항목은 0 등으로 별도 취급 가능)
  time      String?
  title     String  // "성산일출봉 방문"
  memo      String?
  type      String  // "장소" | "숙소" | "이동" | "할일"
  isChecked Boolean @default(false)
  order     Int     @default(0)
}
```

**설계 메모**
- `Profile.colorRole`을 두어 디자인 토큰(Partner A/B)과 데이터를 직접 연결 — 프론트에서 `createdById`로 Profile을 찾아 색을 결정
- 인증(비밀번호 등)은 Supabase가 전담하므로 앱 스키마에는 비밀번호 필드가 없음
- 실제 개발 중 필드가 추가/변경될 가능성이 높은 편 — 특히 `Category`, `TripItem`의 `type` 값들은 UI 만들면서 구체화될 것

---

## 11. 배포 계획

1. GitHub 레포 생성 → Vercel과 연동 (Push 시 자동 배포)
2. Supabase 프로젝트 생성
   - `DATABASE_URL` (Prisma용, Supavisor 커넥션 풀러 경유)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 클라이언트 노출 금지)
   - 위 환경변수들을 Vercel 프로젝트 설정에 등록
3. 빌드 커맨드에 `prisma migrate deploy` 포함 → 배포 시 앱 도메인 스키마(Couple, Transaction 등) 자동 마이그레이션
4. Supabase 대시보드(Authentication 탭)에서 두 사람 계정 직접 생성 (이메일/비번)
5. 생성된 두 계정의 `user.id`로 `Couple` 레코드 1개 + `Profile` 레코드 2개(colorRole: "A"/"B")를 1회성 스크립트로 연결
6. (v2) Supabase Storage에 버킷 생성 — 영수증 사진(`receipts`), 여행 사진(`trip-photos`) 등
7. 이후 배포는 GitHub main 브랜치에 push할 때마다 Vercel이 자동으로 처리

---

## 12. Claude Code 사용 시 유의사항 (토큰/스캔 낭비 줄이기)

> Claude Code로 이 프로젝트를 개발할 때 참고할 실무 팁. 프로젝트에 `.claude/`, `.claudeignore`를 세팅하면서 같이 반영하면 좋습니다.

### CLAUDE.md 관리
- **CLAUDE.md는 매 턴(turn)마다 전체가 컨텍스트에 로드됨** — 대화 2번을 하든 200번을 하든 그 토큰을 매번 지불하는 구조. 그러니 최대한 간결하게, "코드만 봐서는 알 수 없는 것"만 적기
  - 테스트/빌드 실행 명령어, 패키지 매니저(npm/pnpm 등), 포맷팅 규칙, 이 설계서에 나온 아키텍처 제약(예: coupleId로 데이터 분리), Claude가 건드리면 안 되는 디렉토리
- 폴더별로 다른 규칙이 필요해지면(예: `/app/budget`과 `/app/trips`가 다른 패턴을 쓴다면) 하나의 거대한 CLAUDE.md 대신 **하위 폴더에 각각 CLAUDE.md를 nested로 분리**

### 스캔 범위 줄이기
- `.claudeignore` 파일을 만들어서 `node_modules`, `.next`, lock 파일, 빌드 산출물, `/mnt/user-data/uploads` 같은 대용량/무관 디렉토리를 스캔 대상에서 제외
- "코드베이스 전체 훑어보고 개선점 찾아줘" 같은 광범위한 프롬프트는 비용이 크게 뜀 — **"budget 관련 Server Action만 리팩터링해줘"처럼 대상 파일/기능을 구체적으로 지정**하는 게 토큰도 적게 쓰고 결과도 더 정확함 (범위 지정 시 전체 스캔 대비 60~80% 절약된다는 리포트도 있음)

### 세션 관리
- **작업 단위가 바뀌면 `/clear`로 새 세션 시작** — 이전 대화의 관련 없는 컨텍스트를 계속 들고 있는 게 가장 큰 낭비 요인. 맥락은 이어가되 대화가 길어졌다면 `/compact`로 압축
- 서로 관련된 작업(예: 가계부 CRUD 한 세트)은 **한 세션에 모아서** 처리 — 세션을 자주 끊으면 매번 파일을 다시 읽는 비용이 발생
- 복잡하고 탐색이 많이 필요한 작업(예: "이 버그의 원인이 어디 있는지 찾아줘")은 **서브에이전트에 위임**해서 메인 세션 컨텍스트를 깨끗하게 유지하는 것도 방법

### 모델/설정
- 간단한 반복 작업(포맷팅, 단순 CRUD 보일러플레이트)은 가벼운 모델로, 복잡한 설계 판단이 필요한 부분만 상위 모델로 전환
- `--verbose` 옵션으로 실제로 어떤 프롬프트가 토큰을 많이 쓰는지 확인하고 패턴 개선

### 이 프로젝트에 바로 적용할 것
- [ ] `.claudeignore`에 `node_modules/`, `.next/`, `*.lock` 추가
- [ ] CLAUDE.md에 이 설계서의 핵심 요약(스택, coupleId 기반 데이터 분리 원칙, Server Actions 사용)만 압축해서 넣기
- [ ] 기능별(가계부/일정/여행)로 세션을 나눠서 작업

---

## 13. 확정되지 않은 부분 (다음에 정할 것)

- [ ] 없음 — 데모 개발 시작해도 되는 수준으로 정리됨
- 세부 필드/컴포넌트는 실제 구현하면서 조정 예정
