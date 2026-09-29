-- 통장·카드 예산 (F-21, 사용자 결정 2026-09-29)
-- "용돈"(사람별, 용돈 통장·카드만)을 더 넓게: 예산마다 이름 + 한 달 금액 + 셀 결제수단(하나 이상, 공동·개인 모두).
--   예) 생활비 1,500,000원 = 공동 생활비 통장 + 공동 체크카드 / 지훈 용돈 300,000원 = 지훈 용돈통장
-- 한 결제수단은 한 예산에만 들어간다(두 번 세지 않게). 금액은 카테고리 예산처럼 달마다 저장하고 새 달에 복사한다.
-- 기존 용돈(allowances, payment_methods.is_allowance)은 사람마다 "○○ 용돈" 예산으로 옮기고 지운다.

create table public.spend_budgets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 20),
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index spend_budgets_household_idx on public.spend_budgets (household_id, sort_order);

create table public.spend_budget_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  budget_id uuid not null references public.spend_budgets (id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods (id) on delete cascade,
  -- 한 결제수단은 한 예산에만
  unique (payment_method_id)
);

create table public.spend_budget_amounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  budget_id uuid not null references public.spend_budgets (id) on delete cascade,
  -- 달 이름 (1일, 한 달 기준 F-56의 기간 이름)
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  updated_at timestamptz not null default now(),
  unique (budget_id, month)
);

-- ─────────────────────────────────────────────
-- 기존 용돈 옮기기 (쓰기 규칙 트리거를 만들기 전에: 마이그레이션에는 로그인한 사람이 없다)
-- ─────────────────────────────────────────────

create temporary table tmp_allowance_budgets on commit drop as
select gen_random_uuid() as id, m.household_id, m.slot, left(m.display_name || ' 용돈', 20) as name
from public.members m
where exists (select 1 from public.allowances a where a.household_id = m.household_id and a.member_slot = m.slot)
   or exists (
     select 1 from public.payment_methods p
     where p.household_id = m.household_id and p.owner = m.slot and p.is_allowance
   );

insert into public.spend_budgets (id, household_id, name, sort_order)
select id, household_id, name, case when slot = 'a' then 1 else 2 end
from tmp_allowance_budgets;

insert into public.spend_budget_methods (household_id, budget_id, payment_method_id)
select t.household_id, t.id, p.id
from tmp_allowance_budgets t
join public.payment_methods p on p.household_id = t.household_id and p.owner = t.slot and p.is_allowance;

insert into public.spend_budget_amounts (household_id, budget_id, month, amount)
select t.household_id, t.id, a.month, a.amount
from tmp_allowance_budgets t
join public.allowances a on a.household_id = t.household_id and a.member_slot = t.slot;

-- ─────────────────────────────────────────────
-- 쓰기 규칙: 가구는 로그인한 사람 기준. 결제수단·예산은 같은 가구 것만
-- ─────────────────────────────────────────────

create function public.spend_budgets_before_write()
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
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$$;

create trigger spend_budgets_before_write
before insert or update on public.spend_budgets
for each row execute function public.spend_budgets_before_write();

create function public.spend_budget_children_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.household_id := public.my_household_id();
  if new.household_id is null then
    raise exception 'not_member';
  end if;
  if not exists (select 1 from public.spend_budgets where id = new.budget_id and household_id = new.household_id) then
    raise exception 'invalid_spend_budget';
  end if;
  if tg_table_name = 'spend_budget_methods' and not exists (
    select 1 from public.payment_methods
    where id = new.payment_method_id and household_id = new.household_id
  ) then
    raise exception 'invalid_payment_method';
  end if;
  if tg_table_name = 'spend_budget_amounts' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger spend_budget_methods_before_write
before insert or update on public.spend_budget_methods
for each row execute function public.spend_budget_children_before_write();

create trigger spend_budget_amounts_before_write
before insert or update on public.spend_budget_amounts
for each row execute function public.spend_budget_children_before_write();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구. 예산은 deleted_at으로 지운다(되돌리기). 결제수단 연결·달마다 금액은 설정값이라 행 삭제
-- ─────────────────────────────────────────────

alter table public.spend_budgets enable row level security;
alter table public.spend_budget_methods enable row level security;
alter table public.spend_budget_amounts enable row level security;

create policy "spend_budgets: 같은 가구 조회" on public.spend_budgets
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "spend_budgets: 같은 가구 추가" on public.spend_budgets
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "spend_budgets: 같은 가구 수정" on public.spend_budgets
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
revoke delete on public.spend_budgets from authenticated, anon;

create policy "spend_budget_methods: 같은 가구 조회" on public.spend_budget_methods
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "spend_budget_methods: 같은 가구 추가" on public.spend_budget_methods
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "spend_budget_methods: 같은 가구 삭제" on public.spend_budget_methods
  for delete to authenticated using (household_id = (select public.my_household_id()));

create policy "spend_budget_amounts: 같은 가구 조회" on public.spend_budget_amounts
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "spend_budget_amounts: 같은 가구 추가" on public.spend_budget_amounts
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "spend_budget_amounts: 같은 가구 수정" on public.spend_budget_amounts
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy "spend_budget_amounts: 같은 가구 삭제" on public.spend_budget_amounts
  for delete to authenticated using (household_id = (select public.my_household_id()));

-- ─────────────────────────────────────────────
-- 새 달 준비: 카테고리 예산 + 통장·카드 예산 금액을 지난달에서 복사 (용돈 복사는 뺀다)
-- ─────────────────────────────────────────────

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

  -- security definer라 트리거의 my_household_id()도 호출한 사람 기준으로 동작한다
  insert into public.spend_budget_amounts (household_id, budget_id, month, amount)
  select a.household_id, a.budget_id, p_month, a.amount
  from public.spend_budget_amounts a
  join public.spend_budgets s on s.id = a.budget_id and s.deleted_at is null
  where a.household_id = v_household
    and a.month = (p_month - interval '1 month')::date
  on conflict (budget_id, month) do nothing;
end;
$$;

-- ─────────────────────────────────────────────
-- 옛 용돈 정리
-- ─────────────────────────────────────────────

alter publication supabase_realtime drop table public.allowances;
drop table public.allowances;
drop function public.allowances_before_write();

alter table public.payment_methods
  drop constraint payment_methods_allowance_owner,
  drop column is_allowance;

alter publication supabase_realtime add table public.spend_budgets;
alter publication supabase_realtime add table public.spend_budget_methods;
alter publication supabase_realtime add table public.spend_budget_amounts;
