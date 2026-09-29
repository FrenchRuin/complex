-- 용돈 계산을 결제수단 기준으로 (F-21, 사용자 결정 2026-09-29)
-- "개인 지출 전부"는 월급에서 나가는 개인 카드값까지 세서 맞지 않았다.
-- 용돈 통장·카드로 표시한 결제수단으로 쓴 지출만 그 결제수단 소유자의 용돈에서 뺀다 (공동으로 적은 지출도 포함).

alter table public.payment_methods
  add column is_allowance boolean not null default false,
  -- 용돈 결제수단은 한 사람 소유여야 한다
  add constraint payment_methods_allowance_owner check (not is_allowance or owner <> 'joint');
