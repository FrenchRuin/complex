-- 용돈: 사람별 한 달 개인 지출 한도 (F-21 확장, 사용자 요청 2026-09-29)
-- 그 사람의 "개인" 지출(scope = personal, member_slot = 그 사람) 합계를 한도와 비교한다. 공동 지출은 들어가지 않는다.
-- 카테고리 예산처럼 달마다 저장하고, 새 달에 처음 들어가면 지난달 한도를 복사한다.

create table public.allowances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  member_slot text not null check (member_slot in ('a', 'b')),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  updated_at timestamptz not null default now(),
  unique (household_id, month, member_slot)
);

-- 쓰기 규칙: 가구는 로그인한 사람 기준
create function public.allowances_before_write()
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
  return new;
end;
$$;

create trigger allowances_before_write
before insert or update on public.allowances
for each row execute function public.allowances_before_write();

-- RLS: 예산과 같다 (설정값이라 "없음"은 행 삭제)
alter table public.allowances enable row level security;

create policy "allowances: 같은 가구 조회" on public.allowances
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "allowances: 같은 가구 추가" on public.allowances
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "allowances: 같은 가구 수정" on public.allowances
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy "allowances: 같은 가구 삭제" on public.allowances
  for delete to authenticated using (household_id = (select public.my_household_id()));

-- 이 달 예산 준비: 처음이면 지난달 카테고리 예산과 용돈을 복사한다
create or replace function public.ensure_month_budgets(p_month date)
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

  insert into public.allowances (household_id, month, member_slot, amount)
  select a.household_id, p_month, a.member_slot, a.amount
  from public.allowances a
  where a.household_id = v_household
    and a.month = (p_month - interval '1 month')::date
  on conflict (household_id, month, member_slot) do nothing;
end;
$$;

alter publication supabase_realtime add table public.allowances;
