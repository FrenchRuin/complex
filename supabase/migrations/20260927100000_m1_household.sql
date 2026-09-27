-- M1: 가구, 구성원, 초대, 카테고리, 결제수단 (SPEC §5.1, §5.4, §7)

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '우리 둘 가계부' check (char_length(name) between 1 and 30),
  settlement_share_a int not null default 50 check (settlement_share_a between 0 and 100)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  slot text not null check (slot in ('a', 'b')),
  display_name text not null check (char_length(display_name) between 1 and 10),
  unique (household_id, slot)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.members (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

create index invites_household_id_idx on public.invites (household_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  name text not null check (char_length(name) between 1 and 12),
  icon text not null,
  sort_order int not null default 0,
  is_hidden boolean not null default false,
  unique (household_id, type, name)
);

create index categories_household_order_idx on public.categories (household_id, type, sort_order);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  kind text not null check (kind in ('card', 'account', 'cash', 'other')),
  owner text not null check (owner in ('joint', 'a', 'b')),
  sms_aliases text[] not null default '{}',
  sort_order int not null default 0,
  is_hidden boolean not null default false
);

create index payment_methods_household_order_idx on public.payment_methods (household_id, sort_order);

-- ─────────────────────────────────────────────
-- 헬퍼: 현재 로그인한 사람의 가구
-- security definer: members의 RLS를 다시 타지 않게 한다 (재귀 방지)
-- ─────────────────────────────────────────────

create function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.members where user_id = (select auth.uid())
$$;

revoke execute on function public.my_household_id() from public, anon;
grant execute on function public.my_household_id() to authenticated;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;

-- 가구: 내 가구만 조회. 생성은 create_household()로만.
create policy "households: 내 가구 조회" on public.households
  for select to authenticated
  using (id = (select public.my_household_id()));

-- 구성원: 같은 가구만 조회, 내 표시 이름만 수정
create policy "members: 같은 가구 조회" on public.members
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "members: 내 행 수정" on public.members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 표시 이름 외의 컬럼(slot, household_id 등)은 바꿀 수 없다
revoke update on public.members from authenticated, anon;
grant update (display_name) on public.members to authenticated;

-- 초대: 같은 가구만 조회. 생성·수락은 RPC로만.
create policy "invites: 같은 가구 조회" on public.invites
  for select to authenticated
  using (household_id = (select public.my_household_id()));

-- 카테고리·결제수단: 같은 가구는 조회·추가·수정. 삭제 대신 숨기기.
create policy "categories: 같은 가구 조회" on public.categories
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "categories: 같은 가구 추가" on public.categories
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "categories: 같은 가구 수정" on public.categories
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

create policy "payment_methods: 같은 가구 조회" on public.payment_methods
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "payment_methods: 같은 가구 추가" on public.payment_methods
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "payment_methods: 같은 가구 수정" on public.payment_methods
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

-- ─────────────────────────────────────────────
-- RPC: 가구 만들기 (F-02)
-- 가구 + A 구성원 + 기본 카테고리(§7) + 기본 결제수단 "현금"
-- 오류는 코드 문자열로 raise 하고, 서버 액션에서 문구로 바꾼다.
-- ─────────────────────────────────────────────

create function public.create_household(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.members where user_id = v_uid) then
    raise exception 'already_member';
  end if;

  insert into public.households default values
  returning id into v_household_id;

  insert into public.members (household_id, user_id, slot, display_name)
  values (v_household_id, v_uid, 'a', trim(p_display_name));

  insert into public.categories (household_id, type, name, icon, sort_order)
  select v_household_id, c.type, c.name, c.icon, c.ord::int
  from (
    values
      ('expense', '식비', 'utensils'),
      ('expense', '카페·간식', 'coffee'),
      ('expense', '배달', 'bike'),
      ('expense', '생활·마트', 'shopping-cart'),
      ('expense', '주거·관리비', 'house'),
      ('expense', '통신', 'smartphone'),
      ('expense', '교통', 'bus'),
      ('expense', '쇼핑', 'shopping-bag'),
      ('expense', '의료', 'pill'),
      ('expense', '보험', 'shield'),
      ('expense', '구독', 'square-play'),
      ('expense', '경조사', 'gift'),
      ('expense', '데이트·여가', 'film'),
      ('expense', '여행', 'train-front'),
      ('expense', '기타', 'circle-ellipsis'),
      ('income', '급여', 'wallet'),
      ('income', '부수입', 'coins'),
      ('income', '용돈·선물', 'gift'),
      ('income', '환불', 'undo-2'),
      ('income', '기타수입', 'circle-plus')
  ) with ordinality as c(type, name, icon, ord);

  insert into public.payment_methods (household_id, name, kind, owner, sort_order)
  values (v_household_id, '현금', 'cash', 'joint', 1);

  return v_household_id;
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 초대 링크 만들기 (F-02). 7일 유효, 1회용. 2명이면 만들 수 없다.
-- ─────────────────────────────────────────────

create function public.create_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
  v_token text;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;

  if (select count(*) from public.members where household_id = v_member.household_id) >= 2 then
    raise exception 'household_full';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.invites (household_id, token, created_by)
  values (v_member.household_id, v_token, v_member.id);

  return v_token;
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 초대 정보 보기. 아직 가구에 없는 사람도 토큰으로 볼 수 있다.
-- status: valid | not_found | used | expired | full | joined(이미 이 가구) | already_member(다른 가구)
-- ─────────────────────────────────────────────

create function public.get_invite(p_token text)
returns table (status text, inviter_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invite public.invites%rowtype;
  v_inviter text;
  v_my_household uuid;
begin
  select * into v_invite from public.invites where token = p_token;
  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  select display_name into v_inviter from public.members where id = v_invite.created_by;
  select household_id into v_my_household from public.members where user_id = auth.uid();

  if v_my_household = v_invite.household_id then
    return query select 'joined'::text, v_inviter;
  elsif v_my_household is not null then
    return query select 'already_member'::text, v_inviter;
  elsif v_invite.used_at is not null then
    return query select 'used'::text, v_inviter;
  elsif v_invite.expires_at < now() then
    return query select 'expired'::text, v_inviter;
  elsif (select count(*) from public.members where household_id = v_invite.household_id) >= 2 then
    return query select 'full'::text, v_inviter;
  else
    return query select 'valid'::text, v_inviter;
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- RPC: 초대 수락 → 비어 있는 자리(b)로 합류
-- ─────────────────────────────────────────────

create function public.accept_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.invites%rowtype;
  v_slot text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.members where user_id = v_uid) then
    raise exception 'already_member';
  end if;

  select * into v_invite from public.invites where token = p_token for update;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_invite.used_at is not null then
    raise exception 'invite_used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  -- 같은 가구에 동시에 합류하는 것을 막는다
  perform 1 from public.households where id = v_invite.household_id for update;

  select s into v_slot
  from (values ('a'), ('b')) as t(s)
  where s not in (select slot from public.members where household_id = v_invite.household_id)
  order by s
  limit 1;

  if v_slot is null then
    raise exception 'household_full';
  end if;

  insert into public.members (household_id, user_id, slot, display_name)
  values (v_invite.household_id, v_uid, v_slot, trim(p_display_name));

  update public.invites set used_at = now() where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
revoke execute on function public.accept_invite(text, text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
