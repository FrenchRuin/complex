-- 정산 대상 시작일 수정: 정산 기록이 없으면 "가구 생성일"이 아니라 "처음부터".
-- 가구를 만든 뒤 지난 날짜의 내역을 입력해도 첫 정산에 포함되게 한다 (SPEC F-24 보완).

create or replace function public.record_settlement(p_period_end date, p_memo text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_share int;
  v_start date;
  v_paid_a bigint;
  v_paid_b bigint;
  v_excess numeric;
  v_id uuid;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;

  -- 같은 가구의 동시 정산을 막는다
  perform 1 from public.households where id = v_member.household_id for update;

  select settlement_share_a into v_share from public.households where id = v_member.household_id;
  select max(period_end) + 1 into v_start from public.settlements where household_id = v_member.household_id;

  if v_start is not null and p_period_end < v_start then
    raise exception 'nothing_to_settle';
  end if;

  select
    coalesce(sum(amount) filter (where member_slot = 'a'), 0),
    coalesce(sum(amount) filter (where member_slot = 'b'), 0)
    into v_paid_a, v_paid_b
  from public.transactions
  where household_id = v_member.household_id
    and deleted_at is null
    and type = 'expense'
    and scope = 'joint'
    and occurred_on <= p_period_end
    and (v_start is null or occurred_on >= v_start);

  v_excess := v_paid_a - (v_paid_a + v_paid_b) * v_share / 100.0;

  insert into public.settlements (
    household_id, period_end, from_slot, to_slot, amount, paid_a, paid_b, share_a, created_by, memo
  )
  values (
    v_member.household_id,
    p_period_end,
    case when v_excess > 0 then 'b' when v_excess < 0 then 'a' end,
    case when v_excess > 0 then 'a' when v_excess < 0 then 'b' end,
    floor(abs(v_excess))::bigint,
    v_paid_a,
    v_paid_b,
    v_share,
    v_member.id,
    nullif(trim(p_memo), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;
