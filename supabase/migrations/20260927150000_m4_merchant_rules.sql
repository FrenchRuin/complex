-- M4: 가맹점 → 카테고리 규칙 (SPEC §5.2 merchant_rules, F-16)

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- 정규화한 가맹점: 소문자 + 공백 제거 (lib/calc/merchant.ts normalizeMerchant와 같아야 한다)
  merchant_key text not null check (char_length(merchant_key) between 1 and 50),
  category_id uuid not null references public.categories (id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (household_id, merchant_key)
);

create function public.normalize_merchant(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(p, ''), '\s', '', 'g'))
$$;

alter table public.merchant_rules enable row level security;

create policy "merchant_rules: 같은 가구 조회" on public.merchant_rules
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "merchant_rules: 같은 가구 추가" on public.merchant_rules
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "merchant_rules: 같은 가구 수정" on public.merchant_rules
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.merchant_rules from authenticated, anon;

-- 내역을 저장하면(직접 입력·문자) 가맹점 → 카테고리 규칙을 기록한다.
-- 정기지출 자동 내역, 가져오기, 삭제는 규칙을 바꾸지 않는다.
create function public.transactions_remember_merchant()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_key text := public.normalize_merchant(new.merchant);
begin
  if new.deleted_at is null
     and new.source in ('manual', 'sms')
     and v_key <> ''
     and char_length(v_key) <= 50 then
    insert into public.merchant_rules (household_id, merchant_key, category_id)
    values (new.household_id, v_key, new.category_id)
    on conflict (household_id, merchant_key)
    do update set category_id = excluded.category_id, updated_at = now();
  end if;
  return null;
end;
$$;

create trigger transactions_remember_merchant
after insert or update of merchant, category_id on public.transactions
for each row execute function public.transactions_remember_merchant();
