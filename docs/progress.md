# 진행 상태 (다음 세션은 여기부터)

마지막 갱신: 2026-10-25

## 지금 상태
- **앱 단순화 진행 중 (2026-10-25, 사용자 결정)**: 내역(지출·수입) + 통계 + 자산만 남긴다. 설계 `docs/superpowers/specs/2026-10-25-simplify-assets-design.md`, 계획 `docs/superpowers/plans/2026-10-25-simplify-assets.md` (진행 기록은 `.superpowers/sdd/2026-10-25-simplify-assets/progress.md`, git에 안 올라감)
  - PR 1 `simplify-remove-features` (기능 빼기, 코드만): 일정·메모·대출·정기지출·예산·월말 결산·문자 인식·엑셀 내보내기·저축 목표·순자산 추이·결제수단 제거. 아직 `main`에 안 합침
  - PR 2 `asset-linked-transactions` (진행 중): 내역에 자산 고르기·이체, 자산 잔액 = 최근 잔액 기록 + 그 뒤 내역. 계획 Task 12~14(이체 유형·입력 검증, 합계에서 이체 빼기, 잔액 계산 함수) 끝. **Task 11(DB 더하기 마이그레이션)이 막힘**: 이 PC `.env.local`의 `SUPABASE_ACCESS_TOKEN`(401)·`SUPABASE_DB_PASSWORD`(인증 실패)가 오래된 값 → 사용자가 다른 PC 값으로 바꾼 뒤 Task 11부터, 그다음 15~22
  - 마지막: 정리 마이그레이션(지운 기능의 표 삭제) 적용 직전에 사용자 확인 → 두 PR을 이어서 합쳐 한 번에 배포
- 그 전까지 `main`(운영)은 2026-10-02 상태: M0~M7 + 개선(알림·메모·일정·공휴일·한 달 기준·휴대폰 알림·통장카드 예산·대출·월말 결산·엑셀 내보내기·오늘 기분·사이드바 접속 상태)
- 공휴일은 남김(한 달 기준 계산에 씀). 설정 → 공휴일 "최신 공휴일 받기"

## 사용자가 해야 할 일
- Supabase 7일 정지 막기: Vercel 환경변수 `CRON_SECRET` 등록 (값은 아무 긴 무작위 글자, 등록 뒤 다시 배포)
- 휴대폰 알림(F-57): Vercel에 환경변수 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 등록 (값은 `.env.local`)
- 폰에서 확인할 것: `docs/phone-checklist.md`

## 남은 개선 후보 (사용자가 고르면 진행)
- [ ] 날짜 선택 키보드 E2E(`search-pickers.spec.ts` "날짜 달력은 키보드로도 고를 수 있다")가 매달 1일에 실패 (← 키로 지난달 날짜로 넘어가는 경우, 2026-10-01 발견)
- [ ] 오늘 기분 작은 개선 (2026-10-01 검토에서 미룸): 화면을 켜 둔 채 0시가 지나면 새로고침·이동 전까지 어제 기분이 보임, 메모에 이모지를 쓰면 20자보다 일찍 막힘, 기분 고르기 화살표 키 이동
- [ ] Vercel 미리보기 주소에서만 나는 `manifest.webmanifest` CORS 오류 (운영 주소는 문제 없음)
- [ ] 이 PC `.env.local`에 `VAPID_*` 키가 없어 휴대폰 알림 E2E 2개가 실패 (다른 PC의 `.env.local` 값을 옮기면 됨)
- [ ] `SPEC.md` 열린 질문: 기본 카테고리 확정 여부, 두 사람 표시 이름

## 작업할 때 알아둘 것
- 작업 순서: 계획 → 승인 → 브랜치 → 구현 → `pnpm lint`·`pnpm typecheck`·`pnpm test` + 화면 확인 → 커밋(한 가지 일씩) → PR → 합치기
- E2E(`pnpm test:e2e`)는 테스트용 서버를 따로 띄우므로 3000번 개발 서버를 끄고 돌린다. 끝나면 다시 켠다
- E2E에서 "이 테스트 뒤에 생긴 알림"은 `serverNow()`(서버 시각)로 거른다. 이 PC 시계가 DB보다 2초쯤 빠르다
- DB 변경은 `pnpm db:migrate` 뒤 `pnpm db:types` (`.env.local`의 Supabase 토큰 사용)
- 화면 사진: Aside `repl`은 `snapshot()`(글자 구조)은 되지만 사진 저장이 안 된다. 겉모습은 E2E 계정으로 임시 Playwright 스크립트(`e2e/tmp-*.spec.ts`, 커밋하지 않음)를 돌려 scratchpad에 PC·폰 폭 사진을 찍어 본다. Aside에서 `attachActiveBrowserTab()`은 사용자가 보던 탭을 잡으니 쓰지 말고 `openTab()`으로 새 탭을 연다 (repl 변수는 호출마다 사라짐)
- 다음 세션 시작: 이 파일 → 사용자가 `.env.local` 값을 바꿨는지 확인(`supabase migration list`가 되는지) → 앱 단순화 계획 Task 11부터 이어서. 새 기능 제안은 단순화가 끝난 뒤 사용자가 원할 때만
- 실제 계정으로 화면을 볼 때는 저장하지 않는다 (상대에게 알림이 가고 실제 데이터가 생김). 저장 흐름은 E2E 테스트 계정으로 확인

## 문서 지도
| 문서 | 내용 | 언제 읽나 |
| --- | --- | --- |
| `docs/progress.md` | 지금 상태 (이 파일) | 매 세션 처음 |
| `SPEC.md` | 스펙 목차: 목표, 확정 결정, 기능 ID → 파일, 마일스톤 | 기능 작업 시작 때 |
| `spec/*.md` | 영역별 상세 스펙 | 작업할 영역만 |
| `design/README.md` | 디자인 시스템 | 화면 작업 때 |
| `docs/phone-checklist.md` | 폰에서 확인할 것 모음 | 작업 끝에 항목 추가 |
| `docs/history/*.md` | 지난 작업 기록 (날짜별, `milestones.md`는 M0~M7) | 예전 결정·이유를 찾을 때만 |

## 기록 남기는 법
- 작업을 끝내면 `docs/history/<오늘 날짜>.md` 위쪽에 기록을 추가한다 (한 일, 확인한 것, 결정한 것). 파일이 없으면 만든다.
- 폰에서 확인할 항목은 `docs/phone-checklist.md`에 추가한다.
- 이 파일은 "지금 상태"·"남은 개선 후보"만 고친다. 길어지면 지난 내용은 history로 옮긴다.
