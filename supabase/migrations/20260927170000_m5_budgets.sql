-- M5: 카테고리별 월 예산 (SPEC §5.2 budgets, F-21)
-- 예산은 기록이 아닌 설정값이라, "예산 없음"은 행을 지워서 나타낸다 (내역처럼 소프트 삭제하지 않음).

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category_id uuid not null references public.categories (id) on delete cascade,
  amount bigint not null check (amount > 0),
  updated_at timestamptz not null default now(),
  unique (household_id, month, category_id)
);

create index budgets_household_month_idx on public.budgets (household_id, month);

-- 이 달 예산을 이미 준비했는지 (지난달 복사를 한 달에 한 번만 하려고)
create table public.budget_months (
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  primary key (household_id, month)
);

-- 쓰기 규칙: 가구는 로그인한 사람 기준, 카테고리는 같은 가구의 지출 카테고리
create function public.budgets_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.household_id := coalesce(
    case when tg_op = 'UPDATE' then old.household_id end,
    public.my_household_id()
  );
  if new.household_id is null then
    raise exception 'not_member';
  end if;
  new.updated_at := now();
  if not exists (
    select 1 from public.categories
    where id = new.category_id and household_id = new.household_id and type = 'expense'
  ) then
    raise exception 'invalid_category';
  end if;
  return new;
end;
$$;

create trigger budgets_before_write
before insert or update on public.budgets
for each row execute function public.budgets_before_write();

alter table public.budgets enable row level security;
alter table public.budget_months enable row level security;

create policy "budgets: 같은 가구 조회" on public.budgets
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "budgets: 같은 가구 추가" on public.budgets
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "budgets: 같은 가구 수정" on public.budgets
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy "budgets: 같은 가구 삭제" on public.budgets
  for delete to authenticated using (household_id = (select public.my_household_id()));

create policy "budget_months: 같은 가구 조회" on public.budget_months
  for select to authenticated using (household_id = (select public.my_household_id()));

-- RPC: 이 달 예산 준비. 처음이면 지난달 예산을 복사한다 (이미 준비했으면 아무것도 안 함)
create function public.ensure_month_budgets(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.my_household_id();
  v_inserted int;
begin
  if v_household is null then
    raise exception 'not_member';
  end if;
  if extract(day from p_month) <> 1 then
    raise exception 'invalid_month';
  end if;

  insert into public.budget_months (household_id, month)
  values (v_household, p_month)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return;
  end if;

  insert into public.budgets (household_id, month, category_id, amount)
  select b.household_id, p_month, b.category_id, b.amount
  from public.budgets b
  join public.categories c on c.id = b.category_id and not c.is_hidden
  where b.household_id = v_household
    and b.month = (p_month - interval '1 month')::date
  on conflict (household_id, month, category_id) do nothing;
end;
$$;

revoke execute on function public.ensure_month_budgets(date) from public, anon;
grant execute on function public.ensure_month_budgets(date) to authenticated;

alter publication supabase_realtime add table public.budgets;
