# 프로젝트: 커플 라이프 매니저

결혼을 앞둔 커플 두 사람이 함께 쓰는 개인 웹 서비스. 가계부 / 일정관리 / 여행계획.
사용자는 정확히 2명 고정. 데모 버전 먼저 만들고 점진적으로 다듬는 방식으로 개발.

**상세 기능 명세, DB 스키마(Prisma), 디자인 토큰, 배포 절차는 `DESIGN.md` 참고.**
스키마/기능 관련 작업을 할 때만 필요한 섹션을 찾아 읽을 것 — 매번 전체를 읽지 말 것.

**단계별 개발 진행 상황, 유의사항(버전 관련 이슈 등)은 `PROGRESS.md`에 기록됨 — 새 작업 시작 전에 확인할 것.**

## 스택
- Next.js 14+ (App Router) / TypeScript / Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage) / Prisma ORM / Vercel 배포

## 핵심 원칙
- 도메인 데이터(Transaction, Event, Trip 등)는 전부 `coupleId`로 묶여 두 사람에게 공유됨
- 사용자 인증 주체는 `Profile` (Supabase `auth.users.id`와 동일한 id). `User` 모델 아님
- `createdById`(Profile.id)로 누가 입력했는지 기록 — 프론트에서 `Profile.colorRole`(A/B)로 색 구분에 사용
- REST API 라우트를 새로 만들지 말고 Server Actions로 처리
- 인증(비밀번호, 세션)은 Supabase Auth가 전담 — 커스텀 인증 로직 작성 금지
- 회원가입 페이지 만들지 않음 (계정은 Supabase 대시보드에서 수동 생성, 정확히 2개)
- **모든 화면은 모바일 우선(mobile-first)으로 반응형 작성** — 좁은 화면에서 사이드바는 하단 탭바/햄버거로 전환. PWA(manifest, service worker)는 데모 단계에선 만들지 않음, DESIGN.md의 "모바일/PWA" 절에 계획만 적어둔 상태

## 코딩 컨벤션
- 커밋 전 `pnpm lint`, `pnpm typecheck` 통과 확인 (실제 명령어는 package.json 확인 후 갱신)
- 컴포넌트/파일 네이밍, 폴더 구조는 DESIGN.md의 "폴더 구조" 절 따를 것

## 하지 말 것
- `node_modules/`, `.next/`, lock 파일 등은 읽거나 수정하지 않음 (`.claudeignore` 참고)
- DESIGN.md 전체를 매번 다시 요약하거나 재작성하지 않음 — 필요한 섹션만 인용
- 스키마를 임의로 크게 바꾸지 말고, 바꿀 필요가 있으면 먼저 이유를 설명하고 확인받을 것

## Next.js 버전 관련
`next dev`/`next build`가 루트에 `AGENTS.md`를 자동 생성/갱신함 (이 프로젝트는 Next.js 16 사용 — 학습 데이터 기준과 달라진 부분이 있을 수 있음, 예: `middleware.ts` → `proxy.ts`). 라우팅/서버 컴포넌트 관련 최신 문법이 헷갈리면 `node_modules/next/dist/docs/`를 먼저 확인할 것.

@AGENTS.md
