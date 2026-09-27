# 진행 기록

## M1 — 가구 만들기·초대, 프로필, 설정 기본 (폰 확인 대기)

### 한 일
- DB 첫 마이그레이션: households, members, invites, categories, payment_methods + RLS
- DB 함수: `create_household`(기본 카테고리 20개·현금 포함), `create_invite`, `get_invite`, `accept_invite`
- `/onboarding` 가구 만들기, `/invite/[token]` 초대 수락 (로그인 전에 열어도 로그인 후 돌아옴)
- `/settings`: 표시 이름, 구성원·초대 링크(7일, 1회용, 복사), 카테고리 관리(추가·이름·아이콘·위/아래·숨기기), 계좌·카드 관리(이름·종류·소유·별칭·위/아래·숨기기), 로그아웃
- 가구가 없으면 앱 화면 대신 온보딩으로 이동
- 권한 확인 29개 통과 (다른 가구 데이터 조회·수정 불가, 남의 표시 이름·자리 변경 불가, 삭제 불가, 비로그인 차단, 초대 재사용·3번째 구성원 차단)
- 테스트 계정 3개로 화면 흐름 확인 후 테스트 계정·데이터 삭제

### 결정한 것
- 순서 변경은 드래그 대신 `위로`/`아래로` 버튼 (A안, SPEC 반영). 아이콘 선택에 Radix Popover 추가
- Lucide 새 이름 사용: `home` → `house`, `play-square` → `square-play` (SPEC 반영)
- 카테고리 이름 최대 12자, 결제수단 이름 최대 20자
- 기본 결제수단 "현금"의 소유는 공동
- Supabase 명령어 도구는 `.env.local`의 `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`로 동작

### 남은 일 / 확인 필요
- Supabase 프로젝트에 이전(Prisma) 앱의 테이블 8개가 RLS 꺼진 채 남아 있음 → 처리 방법 사용자 결정 필요

### 폰에서 확인할 것
- [ ] A: 로그인 → 가구 만들기 (표시 이름 입력)
- [ ] A: 설정 → 초대 링크 만들기 → 복사 → 카톡으로 B에게 보내기
- [ ] B: 링크 열기 → 로그인 → 표시 이름 입력 → 합류하기
- [ ] 두 사람 홈에 서로 이름이 보이는지
- [ ] 한 사람이 카테고리를 숨기거나 순서를 바꾸면, 다른 사람 설정 화면에서도 (새로고침 후) 바뀌어 있는지
- [ ] 결제수단을 추가하고 소유를 각자 이름으로 골라보기

## M0 — 프로젝트 셋업, 이메일 로그인 (완료 2026-09-27)

### 한 일
- Next.js 16 + TypeScript strict + Tailwind 4 + pnpm 11 프로젝트 생성
- 디자인 토큰(색·글자·모서리·그림자)을 `app/globals.css` CSS 변수로 정의, Tailwind 기본 색 팔레트 제거
- Pretendard 글꼴(자체 호스팅), 시스템 설정을 따르는 다크 모드
- `lib/money.ts` (formatWon, formatWonShort, parseWon), `lib/date.ts` (KST 오늘·이번 달·지난달 같은 기간) + 단위 테스트
- 이메일 + 비밀번호 로그인 (F-01): `/login`, 허용 이메일 확인(`ALLOWED_EMAILS`), 로그인 안 하면 `/login`으로 이동, 로그아웃, 임시 홈
- Supabase: 두 계정 미리 생성, 새 가입 막음. 로컬 Docker 없이 클라우드 프로젝트에 바로 연결
- GitHub `FrenchRuin/complex`의 `main`에 업로드. 이전 작업은 `backup/old-master` 태그로 보관

### 결정한 것
- 로그인은 구글 대신 이메일 + 비밀번호 (SPEC 반영)
- 데스크톱은 사이드바, 하단 탭바는 홈·내역·통계·정기지출·설정 (design/README 반영)
- pnpm 12는 윈도우 스마트 앱 컨트롤에 막혀 11.x 사용

- Vercel 배포: https://complex-henna-psi.vercel.app (main에 푸시하면 자동 배포)
  - 배포 주소에서 로그인 이동, 허용 안 된 이메일 차단, 틀린 비밀번호 안내 확인함

### 폰에서 확인한 것
- [x] 배포 주소에서 두 사람 모두 로그인 (사용자 확인)
- [x] 다른 이메일은 "초대받은 계정만 사용할 수 있어요" (배포 주소에서 확인)
