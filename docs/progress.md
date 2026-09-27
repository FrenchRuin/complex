# 진행 기록

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
