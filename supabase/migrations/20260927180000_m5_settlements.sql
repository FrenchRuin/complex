-- M5: 공동 지출 정산 (SPEC §5.2 settlements, F-24)

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- 이 날짜까지의 공동 지출을 정산 (다음 계산은 그다음 날부터)
  period_end date not null,
  from_slot text check (from_slot in ('a', 'b')),
  to_slot text check (to_slot in ('a', 'b')),
  amount bigint not null check (amount >= 0),
  paid_a bigint not null,
  paid_b bigint not null,
  share_a int not null,
  created_by uuid not null references public.members (id) on delete cascade,
  memo text check (char_length(memo) <= 200)
);

create index settlements_household_idx on public.settlements (household_id, period_end desc);

alter table public.settlements enable row level security;

create policy "settlements: 같은 가구 조회" on public.settlements
  for select to authenticated using (household_id = (select public.my_household_id()));

-- 추가는 record_settlement()로만 (금액을 DB가 직접 계산)

-- RPC: 정산 완료로 기록. 마지막 정산 다음 날(없으면 가구 생성일)부터 p_period_end까지의
-- 공동 지출을 누가 얼마 냈는지 다시 계산하고, 부담 비율(share_a)로 보낼 금액을 정한다. 원 미만 버림.
create function public.record_settlement(p_period_end date, p_memo text default null)
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

  select settlement_share_a,
         coalesce(
           (select max(s.period_end) + 1 from public.settlements s where s.household_id = h.id),
           (h.created_at at time zone 'Asia/Seoul')::date
         )
    into v_share, v_start
  from public.households h
  where h.id = v_member.household_id
  for update;

  if p_period_end < v_start then
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
    and occurred_on between v_start and p_period_end;

  -- A가 부담할 몫보다 더 낸 금액 (양수면 B → A, 음수면 A → B)
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

revoke execute on function public.record_settlement(date, text) from public, anon;
grant execute on function public.record_settlement(date, text) to authenticated;

alter publication supabase_realtime add table public.settlements;
