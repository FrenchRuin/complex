-- M7: 자산·부채, 순자산 추이, 저축 목표 (SPEC §5.3, F-40~F-42)

-- ─────────────────────────────────────────────
-- 자산·부채 (수기 관리)
-- ─────────────────────────────────────────────
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  kind text not null check (kind in ('deposit', 'savings', 'investment', 'lease_deposit', 'real_estate', 'car', 'loan', 'other')),
  owner text not null check (owner in ('joint', 'a', 'b')),
  amount bigint not null check (amount >= 0),
  is_liability boolean not null default false,
  memo text check (char_length(memo) <= 200),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index assets_household_idx on public.assets (household_id) where deleted_at is null;

-- 월말 순자산 기록 (month = 그 달 1일, 그 달 말 기준)
create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  total_assets bigint not null,
  total_liabilities bigint not null,
  unique (household_id, month)
);

-- ─────────────────────────────────────────────
-- 저축 목표와 적립 (적립은 가계부 지출 내역으로 만들지 않는다)
-- ─────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  target_amount bigint not null check (target_amount > 0),
  due_date date,
  is_done boolean not null default false,
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index goals_household_idx on public.goals (household_id) where deleted_at is null;

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount bigint not null check (amount > 0),
  contributed_on date not null,
  member_slot text not null check (member_slot in ('a', 'b')),
  memo text check (char_length(memo) <= 200),
  created_by uuid not null references public.members (id) on delete cascade,
  deleted_at timestamptz
);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id) where deleted_at is null;

-- ─────────────────────────────────────────────
-- 쓰기 규칙: 가구는 로그인한 사람 기준 (화면 값은 믿지 않음)
-- ─────────────────────────────────────────────
create function public.force_household()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.household_id := old.household_id;
    new.created_at := old.created_at;
  else
    new.household_id := public.my_household_id();
    if new.household_id is null then
      raise exception 'not_member';
    end if;
  end if;
  if tg_table_name in ('assets', 'goals') then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger assets_force_household before insert or update on public.assets
  for each row execute function public.force_household();
create trigger goals_force_household before insert or update on public.goals
  for each row execute function public.force_household();

-- 적립: 가구 강제 + 목표가 같은 가구인지 + 작성자
create function public.goal_contributions_before_write()
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
    new.goal_id := old.goal_id;
    new.created_by := old.created_by;
  else
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
  end if;
  if not exists (select 1 from public.goals where id = new.goal_id and household_id = new.household_id) then
    raise exception 'invalid_goal';
  end if;
  return new;
end;
$$;

create trigger goal_contributions_before_write before insert or update on public.goal_contributions
  for each row execute function public.goal_contributions_before_write();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구만. 삭제는 deleted_at으로만 (스냅샷은 함수로만 추가)
-- ─────────────────────────────────────────────
alter table public.assets enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "assets: 조회" on public.assets for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "assets: 추가" on public.assets for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "assets: 수정" on public.assets for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

create policy "net_worth_snapshots: 조회" on public.net_worth_snapshots for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "goals: 조회" on public.goals for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "goals: 추가" on public.goals for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "goals: 수정" on public.goals for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

create policy "goal_contributions: 조회" on public.goal_contributions for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "goal_contributions: 추가" on public.goal_contributions for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "goal_contributions: 수정" on public.goal_contributions for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.assets, public.goals, public.goal_contributions from authenticated, anon;

-- ─────────────────────────────────────────────
-- RPC: 지난달 순자산 기록 (F-41). 그 달 첫 접속 때 부른다. 이미 있거나 자산이 없으면 아무것도 안 함
-- ─────────────────────────────────────────────
create function public.ensure_net_worth_snapshot(p_current_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.my_household_id();
  v_month date;
begin
  if v_household is null then
    raise exception 'not_member';
  end if;
  if extract(day from p_current_month) <> 1 then
    raise exception 'invalid_month';
  end if;
  v_month := (p_current_month - interval '1 month')::date;

  if exists (select 1 from public.net_worth_snapshots where household_id = v_household and month = v_month) then
    return;
  end if;
  if not exists (select 1 from public.assets where household_id = v_household and deleted_at is null) then
    return;
  end if;

  insert into public.net_worth_snapshots (household_id, month, total_assets, total_liabilities)
  select
    v_household,
    v_month,
    coalesce(sum(amount) filter (where not is_liability), 0),
    coalesce(sum(amount) filter (where is_liability), 0)
  from public.assets
  where household_id = v_household and deleted_at is null
  on conflict (household_id, month) do nothing;
end;
$$;

revoke execute on function public.ensure_net_worth_snapshot(date) from public, anon;
grant execute on function public.ensure_net_worth_snapshot(date) to authenticated;

alter publication supabase_realtime add table public.assets, public.goals, public.goal_contributions;
