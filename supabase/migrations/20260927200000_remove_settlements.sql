-- 공동 지출 정산(F-24) 제거 — 사용자 결정 2026-09-27: 반반으로 나눌 일이 없고 비율 설정도 필요 없음.
-- 정산 기록 테이블, 기록 함수, 가구의 정산 비율 컬럼을 지운다.

drop function if exists public.record_settlement(date, text);
drop table if exists public.settlements;
alter table public.households drop column if exists settlement_share_a;
