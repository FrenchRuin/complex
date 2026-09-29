-- 공휴일 직접 관리 (F-55, 사용자 요청 2026-09-29)
-- 기본 공휴일은 라이브러리(@hyunbinseo/holidays-kr, 정부 월력요항)에서 온다.
-- 여기에는 가구마다 고친 것만 둔다:
--   add    : 라이브러리에 없는 쉬는 날 (임시공휴일, 회사 휴무 등)
--   remove : 라이브러리에는 있지만 우리에게는 쉬는 날이 아닌 날
-- 월급날 계산(주말·공휴일이면 앞 평일)과 일정 달력의 공휴일 표시에 쓴다.

create table public.custom_holidays (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('add', 'remove')),
  -- add일 때 보여줄 이름 (remove는 비워 둔다)
  name text not null default '' check (char_length(name) <= 20),
  created_by uuid not null references public.members (id) on delete cascade,
  deleted_at timestamptz,
  constraint custom_holidays_add_name check (kind <> 'add' or char_length(btrim(name)) >= 1)
);

-- 같은 날짜에는 살아 있는 설정이 하나만
create unique index custom_holidays_one_per_day
  on public.custom_holidays (household_id, date)
  where deleted_at is null;

-- 쓰기 규칙: 가구·작성자는 DB가 채운다
create function public.custom_holidays_before_write()
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
  if tg_op = 'INSERT' then
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.date := old.date;
    new.kind := old.kind;
  end if;
  new.name := btrim(new.name);
  return new;
end;
$$;

create trigger custom_holidays_before_write
before insert or update on public.custom_holidays
for each row execute function public.custom_holidays_before_write();

-- RLS: 같은 가구 조회·추가·수정. 삭제는 deleted_at으로만.
alter table public.custom_holidays enable row level security;

create policy "custom_holidays: 같은 가구 조회" on public.custom_holidays
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "custom_holidays: 같은 가구 추가" on public.custom_holidays
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "custom_holidays: 같은 가구 수정" on public.custom_holidays
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.custom_holidays from authenticated, anon;

alter publication supabase_realtime add table public.custom_holidays;
