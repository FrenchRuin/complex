-- 대출 계산 (F-43, spec/loans.md §3, 사용자 요청 2026-09-30)
-- 우리 정보·기준값(가구마다 한 줄), 기존 대출, 집 후보. 계산 결과는 저장하지 않는다.
-- 금액은 원, 금리는 0.01% 단위 정수(rate_bp).

create table public.loan_profiles (
  household_id uuid primary key references public.households (id) on delete cascade,
  income_a bigint not null default 0 check (income_a between 0 and 100000000000000),
  income_b bigint not null default 0 check (income_b between 0 and 100000000000000),
  home_status text not null default 'none' check (home_status in ('none', 'one')),
  first_time boolean not null default false,
  -- 사용자가 고친 기준값 묶음만 (없는 묶음은 코드의 조사값)
  rules jsonb not null default '{}' check (jsonb_typeof(rules) = 'object'),
  updated_by uuid references public.members (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (not (first_time and home_status = 'one'))
);

create table public.loan_debts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  kind text not null check (kind in ('mortgage', 'credit', 'overdraft', 'car', 'jeonse', 'other')),
  owner text not null check (owner in ('joint', 'a', 'b')),
  -- 마이너스통장은 한도
  balance bigint not null check (balance between 1 and 100000000000000),
  rate_bp integer not null default 0 check (rate_bp between 0 and 3000),
  months_left integer check (months_left between 1 and 600),
  monthly_payment bigint check (monthly_payment between 1 and 100000000000000),
  -- 자산 메뉴에서 불러온 부채 항목
  asset_id uuid references public.assets (id) on delete set null,
  created_by uuid not null references public.members (id) on delete cascade,
  updated_by uuid not null references public.members (id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index loan_debts_household_idx on public.loan_debts (household_id, created_at) where deleted_at is null;
create unique index loan_debts_asset_idx on public.loan_debts (household_id, asset_id)
  where deleted_at is null and asset_id is not null;

create table public.loan_scenarios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  deal text not null check (deal in ('buy', 'jeonse')),
  price bigint not null check (price between 1 and 100000000000000),
  region text not null check (region in ('regulated', 'metro', 'local')),
  rate_bp integer check (rate_bp between 0 and 3000),
  term_years integer check (term_years between 1 and 30),
  extra_costs bigint not null default 0 check (extra_costs between 0 and 100000000000000),
  memo text not null default '' check (char_length(memo) <= 500),
  created_by uuid not null references public.members (id) on delete cascade,
  updated_by uuid not null references public.members (id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index loan_scenarios_household_idx on public.loan_scenarios (household_id, created_at) where deleted_at is null;

-- ─────────────────────────────────────────────
-- 쓰기 전 규칙: 가구·작성자·수정자·시각은 DB가 채운다 (화면 값은 믿지 않음)
-- ─────────────────────────────────────────────

create function public.loan_profiles_before_write()
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
  else
    new.household_id := v_member.household_id;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger loan_profiles_before_write before insert or update on public.loan_profiles
  for each row execute function public.loan_profiles_before_write();

create function public.loan_items_before_write()
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
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger loan_debts_before_write before insert or update on public.loan_debts
  for each row execute function public.loan_items_before_write();
create trigger loan_scenarios_before_write before insert or update on public.loan_scenarios
  for each row execute function public.loan_items_before_write();

-- 불러온 자산 항목이 같은 가구 것인지 (가구를 채운 뒤에 검사하도록 이름이 뒤에 오게)
create function public.loan_debts_check_asset()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.asset_id is not null
     and not exists (select 1 from public.assets where id = new.asset_id and household_id = new.household_id) then
    raise exception 'invalid_asset';
  end if;
  return new;
end;
$$;

create trigger loan_debts_zz_check_asset before insert or update on public.loan_debts
  for each row execute function public.loan_debts_check_asset();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구만. 삭제는 deleted_at으로만
-- ─────────────────────────────────────────────

alter table public.loan_profiles enable row level security;
alter table public.loan_debts enable row level security;
alter table public.loan_scenarios enable row level security;

create policy "loan_profiles: 조회" on public.loan_profiles for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "loan_profiles: 추가" on public.loan_profiles for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "loan_profiles: 수정" on public.loan_profiles for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

create policy "loan_debts: 조회" on public.loan_debts for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "loan_debts: 추가" on public.loan_debts for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "loan_debts: 수정" on public.loan_debts for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

create policy "loan_scenarios: 조회" on public.loan_scenarios for select to authenticated
  using (household_id = (select public.my_household_id()));
create policy "loan_scenarios: 추가" on public.loan_scenarios for insert to authenticated
  with check (household_id = (select public.my_household_id()));
create policy "loan_scenarios: 수정" on public.loan_scenarios for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.loan_profiles, public.loan_debts, public.loan_scenarios from authenticated, anon;

-- ─────────────────────────────────────────────
-- RPC: 기준값 묶음 하나만 바꾸기·되돌리기 (p_value가 null이면 조사값으로).
-- 한 묶음만 바꿔 두 사람이 다른 묶음을 동시에 고쳐도 서로 덮어쓰지 않는다. security invoker라 RLS·트리거 적용.
-- ─────────────────────────────────────────────

create function public.set_loan_rule_group(p_group text, p_value jsonb default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_group not in ('bankBuy', 'stress', 'didimdol', 'bankJeonse', 'butimok', 'regulatedAreas', 'defaults') then
    raise exception 'invalid_rule_group';
  end if;
  if p_value is not null and jsonb_typeof(p_value) <> 'object' then
    raise exception 'invalid_rule_group';
  end if;
  insert into public.loan_profiles (household_id, rules)
  values (
    public.my_household_id(),
    case when p_value is null then '{}'::jsonb else jsonb_build_object(p_group, p_value) end
  )
  on conflict (household_id) do update
    set rules = case
      when p_value is null then public.loan_profiles.rules - p_group
      else public.loan_profiles.rules || jsonb_build_object(p_group, p_value)
    end;
end;
$$;

revoke execute on function public.set_loan_rule_group(text, jsonb) from public, anon;
grant execute on function public.set_loan_rule_group(text, jsonb) to authenticated;

alter publication supabase_realtime add table public.loan_profiles, public.loan_debts, public.loan_scenarios;
