-- M2: 내역 (SPEC §5.1 transactions, F-10~F-14)
-- 정기지출(recurring_*)·가져오기(import_batch_id) 컬럼은 해당 기능 마일스톤에서 추가한다.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null check (amount > 0),
  occurred_on date not null,
  occurred_time time,
  category_id uuid not null references public.categories (id),
  merchant text check (char_length(merchant) <= 50),
  memo text check (char_length(memo) <= 200),
  payment_method_id uuid references public.payment_methods (id),
  scope text not null check (scope in ('joint', 'personal')),
  member_slot text not null check (member_slot in ('a', 'b')),
  source text not null default 'manual' check (source in ('manual', 'sms', 'recurring', 'import')),
  created_by uuid not null references public.members (id) on delete cascade,
  updated_by uuid not null references public.members (id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index transactions_household_date_idx on public.transactions (household_id, occurred_on);
create index transactions_household_deleted_idx on public.transactions (household_id, deleted_at);

-- ─────────────────────────────────────────────
-- 쓰기 전 규칙: 가구·작성자·수정자는 로그인한 사람 기준으로 DB가 채운다 (화면 값은 믿지 않음).
-- 카테고리·결제수단은 같은 가구 것이어야 하고, 카테고리 종류는 내역 유형과 같아야 한다.
-- ─────────────────────────────────────────────

create function public.transactions_before_write()
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

  return new;
end;
$$;

create trigger transactions_before_write
before insert or update on public.transactions
for each row execute function public.transactions_before_write();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구는 조회·추가·수정. 삭제는 deleted_at으로만 (진짜 삭제 금지).
-- ─────────────────────────────────────────────

alter table public.transactions enable row level security;

create policy "transactions: 같은 가구 조회" on public.transactions
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "transactions: 같은 가구 추가" on public.transactions
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "transactions: 같은 가구 수정" on public.transactions
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.transactions from authenticated, anon;

-- ─────────────────────────────────────────────
-- 실시간 동기화 (F-14)
-- ─────────────────────────────────────────────

alter publication supabase_realtime add table public.transactions;
