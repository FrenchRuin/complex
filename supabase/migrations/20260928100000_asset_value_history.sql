-- 자산 금액 기록(히스토리) (사용자 요청 2026-09-28, F-40·F-41 보완)
-- 항목마다 "언제 기준 얼마"를 쌓고, 순자산 추이는 이 기록으로 매달 말 기준 다시 계산한다.
-- 그래서 "첫 접속 때 지난달 순자산 스냅샷"은 없앤다.

create table public.asset_values (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  as_of date not null,
  amount bigint not null check (amount >= 0),
  created_by uuid not null references public.members (id) on delete cascade,
  deleted_at timestamptz
);
create index asset_values_asset_idx on public.asset_values (asset_id, as_of desc) where deleted_at is null;
create unique index asset_values_one_per_day on public.asset_values (asset_id, as_of) where deleted_at is null;

-- 항목의 "현재 금액·기준일" = 가장 최근 기록 (목록 표시용)
alter table public.assets add column value_as_of date;

-- 기존 항목은 등록한 날 기준 기록 1개로 옮긴다
insert into public.asset_values (household_id, asset_id, as_of, amount, created_by, created_at)
select a.household_id, a.id, (a.created_at at time zone 'Asia/Seoul')::date, a.amount,
       (select m.id from public.members m where m.household_id = a.household_id order by m.slot limit 1),
       a.created_at
from public.assets a;
update public.assets a set value_as_of = (a.created_at at time zone 'Asia/Seoul')::date;

-- 쓰기 규칙: 가구·작성자는 로그인한 사람 기준, 항목은 같은 가구
create function public.asset_values_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;
  if tg_op = 'UPDATE' then
    new.household_id := old.household_id;
    new.asset_id := old.asset_id;
    new.created_by := old.created_by;
  else
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
  end if;
  if not exists (select 1 from public.assets where id = new.asset_id and household_id = new.household_id) then
    raise exception 'invalid_asset';
  end if;
  return new;
end;
$$;

create trigger asset_values_before_write before insert or update on public.asset_values
  for each row execute function public.asset_values_before_write();

-- 기록이 바뀌면 항목의 현재 금액·기준일을 가장 최근 기록으로 맞춘다
create function public.asset_values_sync_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.asset_values%rowtype;
begin
  select * into v_latest from public.asset_values
  where asset_id = new.asset_id and deleted_at is null
  order by as_of desc, created_at desc
  limit 1;
  if found then
    update public.assets set amount = v_latest.amount, value_as_of = v_latest.as_of where id = new.asset_id;
  end if;
  return null;
end;
$$;

create trigger asset_values_sync_asset after insert or update on public.asset_values
  for each row execute function public.asset_values_sync_asset();

alter table public.asset_values enable row level security;
create policy "asset_values: 조회" on public.asset_values for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "asset_values: 추가" on public.asset_values for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "asset_values: 수정" on public.asset_values for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
revoke delete on public.asset_values from authenticated, anon;

-- RPC: 금액 기록 (같은 날짜 기록이 있으면 금액만 바꾼다)
create function public.set_asset_value(p_asset_id uuid, p_as_of date, p_amount bigint)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_amount';
  end if;
  update public.asset_values set amount = p_amount
  where asset_id = p_asset_id and as_of = p_as_of and deleted_at is null;
  if not found then
    insert into public.asset_values (household_id, asset_id, as_of, amount, created_by)
    values ((select household_id from public.assets where id = p_asset_id), p_asset_id, p_as_of, p_amount,
            (select id from public.members where user_id = auth.uid()));
  end if;
end;
$$;

-- RPC: 기록 지우기 (항목마다 기록이 하나는 남아야 한다)
create function public.delete_asset_value(p_value_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_asset uuid;
begin
  select asset_id into v_asset from public.asset_values where id = p_value_id and deleted_at is null;
  if v_asset is null then
    raise exception 'invalid_asset';
  end if;
  if (select count(*) from public.asset_values where asset_id = v_asset and deleted_at is null) <= 1 then
    raise exception 'last_asset_value';
  end if;
  update public.asset_values set deleted_at = now() where id = p_value_id;
  -- 지운 기록이 최신이었을 수 있으니 항목 금액을 다시 맞춘다
  update public.asset_values set amount = amount
  where id = (select id from public.asset_values where asset_id = v_asset and deleted_at is null
              order by as_of desc, created_at desc limit 1);
end;
$$;

revoke execute on function public.set_asset_value(uuid, date, bigint) from public, anon;
revoke execute on function public.delete_asset_value(uuid) from public, anon;
grant execute on function public.set_asset_value(uuid, date, bigint) to authenticated;
grant execute on function public.delete_asset_value(uuid) to authenticated;

-- 스냅샷 방식 제거 (추이는 금액 기록으로 계산)
drop function if exists public.ensure_net_worth_snapshot(date);
drop table if exists public.net_worth_snapshots;

alter publication supabase_realtime add table public.asset_values;
