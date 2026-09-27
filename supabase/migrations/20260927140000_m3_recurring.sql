-- M3: 정기지출 (SPEC §5.1 recurring_items, F-30, F-31)

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  amount bigint not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  category_id uuid not null references public.categories (id),
  scope text not null check (scope in ('joint', 'personal')),
  member_slot text not null check (member_slot in ('a', 'b')),
  payment_method_id uuid references public.payment_methods (id),
  is_variable boolean not null default false,
  -- 이 달부터 표시 / 이 달까지 표시(중지한 달). 둘 다 1일.
  start_month date not null check (extract(day from start_month) = 1),
  end_month date check (end_month is null or extract(day from end_month) = 1),
  updated_at timestamptz not null default now(),
  check (end_month is null or end_month >= start_month)
);

create index recurring_items_household_idx on public.recurring_items (household_id);

-- 쓰기 규칙: 가구는 로그인한 사람 기준, 카테고리는 같은 가구의 지출 카테고리, 결제수단은 같은 가구
create function public.recurring_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_household uuid;
begin
  select household_id into v_household from public.members where user_id = auth.uid();
  if v_household is null then
    raise exception 'not_member';
  end if;

  new.household_id := case when tg_op = 'INSERT' then v_household else old.household_id end;
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();

  if not exists (
    select 1 from public.categories
    where id = new.category_id and household_id = new.household_id and type = 'expense'
  ) then
    raise exception 'invalid_category';
  end if;

  if new.payment_method_id is not null and not exists (
    select 1 from public.payment_methods
    where id = new.payment_method_id and household_id = new.household_id
  ) then
    raise exception 'invalid_payment_method';
  end if;

  return new;
end;
$$;

create trigger recurring_items_before_write
before insert or update on public.recurring_items
for each row execute function public.recurring_items_before_write();

alter table public.recurring_items enable row level security;

create policy "recurring_items: 같은 가구 조회" on public.recurring_items
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "recurring_items: 같은 가구 추가" on public.recurring_items
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "recurring_items: 같은 가구 수정" on public.recurring_items
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.recurring_items from authenticated, anon;

-- ─────────────────────────────────────────────
-- 내역 ↔ 정기지출 연결. 같은 정기지출·같은 달은 (삭제되지 않은 것) 하나만.
-- ─────────────────────────────────────────────

alter table public.transactions
  add column recurring_item_id uuid references public.recurring_items (id),
  add column recurring_month date,
  add constraint transactions_recurring_pair
    check ((recurring_item_id is null) = (recurring_month is null));

create unique index transactions_recurring_once
  on public.transactions (recurring_item_id, recurring_month)
  where deleted_at is null and recurring_item_id is not null;

-- 내역 쓰기 규칙에 정기지출 확인 추가 (M2 함수 교체)
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_category public.categories%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;

  if tg_op = 'INSERT' then
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    -- 정기지출 연결은 만든 뒤 바꿀 수 없다
    new.recurring_item_id := old.recurring_item_id;
    new.recurring_month := old.recurring_month;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();

  select * into v_category from public.categories where id = new.category_id;
  if not found or v_category.household_id <> new.household_id then
    raise exception 'invalid_category';
  end if;
  if v_category.type <> new.type then
    raise exception 'category_type_mismatch';
  end if;

  if new.payment_method_id is not null and not exists (
    select 1 from public.payment_methods
    where id = new.payment_method_id and household_id = new.household_id
  ) then
    raise exception 'invalid_payment_method';
  end if;

  if new.recurring_item_id is not null and not exists (
    select 1 from public.recurring_items
    where id = new.recurring_item_id and household_id = new.household_id
  ) then
    raise exception 'invalid_recurring_item';
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 납부 체크 (F-31). 그 달 결제일(없으면 말일)로 내역을 만든다.
-- security invoker: RLS·트리거가 그대로 적용된다.
-- ─────────────────────────────────────────────

create function public.check_recurring(p_item_id uuid, p_month date, p_amount bigint default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_item public.recurring_items%rowtype;
  v_last_day int;
  v_tx_id uuid;
begin
  select * into v_item from public.recurring_items where id = p_item_id;
  if not found then
    raise exception 'invalid_recurring_item';
  end if;

  if extract(day from p_month) <> 1
     or p_month < v_item.start_month
     or (v_item.end_month is not null and p_month > v_item.end_month) then
    raise exception 'recurring_not_in_month';
  end if;

  if p_amount is not null and p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  v_last_day := extract(day from (p_month + interval '1 month' - interval '1 day'))::int;

  begin
    insert into public.transactions (
      household_id, type, amount, occurred_on, category_id, merchant, payment_method_id,
      scope, member_slot, source, recurring_item_id, recurring_month, created_by, updated_by
    )
    select
      v_item.household_id, 'expense', coalesce(p_amount, v_item.amount),
      p_month + (least(v_item.day_of_month, v_last_day) - 1),
      v_item.category_id, v_item.name, v_item.payment_method_id,
      v_item.scope, v_item.member_slot, 'recurring', v_item.id, p_month, m.id, m.id
    from public.members m
    where m.user_id = auth.uid()
    returning id into v_tx_id;
  exception when unique_violation then
    raise exception 'already_paid';
  end;

  return v_tx_id;
end;
$$;

-- RPC: 체크 해제 → 그 달 자동 내역을 소프트 삭제
create function public.uncheck_recurring(p_item_id uuid, p_month date)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.transactions
  set deleted_at = now()
  where recurring_item_id = p_item_id
    and recurring_month = p_month
    and deleted_at is null;
end;
$$;

revoke execute on function public.check_recurring(uuid, date, bigint) from public, anon;
revoke execute on function public.uncheck_recurring(uuid, date) from public, anon;
grant execute on function public.check_recurring(uuid, date, bigint) to authenticated;
grant execute on function public.uncheck_recurring(uuid, date) to authenticated;

alter publication supabase_realtime add table public.recurring_items;
