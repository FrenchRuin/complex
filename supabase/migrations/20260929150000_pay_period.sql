-- 한 달 기준(월급날 주기) (F-56, 사용자 결정 2026-09-29)
-- 기본값(1일)이면 지금처럼 달력의 한 달. 25일로 정하면 "10월" = 9월 25일 ~ 10월 24일 (이름 방식 'end').
-- 예산·용돈·정기지출 체크는 지금처럼 달 이름(yyyy-MM-01)으로 저장하므로 기존 데이터는 그대로 쓴다.
-- 기간 계산은 앱(lib/calc/period.ts)이 한다: 시작일 = 직접 고친 날 또는 월급날(주말·공휴일이면 앞 평일),
-- 종료일 = 다음 달 시작일 전날 (겹침·빈틈 없음).

alter table public.households
  add column period_start_day smallint not null default 1 check (period_start_day between 1 and 28),
  -- 기간 이름: 'start' 시작하는 달, 'end' 끝나는 달
  add column period_label text not null default 'end' check (period_label in ('start', 'end')),
  -- 월급날이 주말·공휴일이면 앞 평일로 당길지
  add column period_shift boolean not null default true;

-- 가구 설정은 직접 수정할 수 없으므로(조회 정책만) 함수로 바꾼다
create function public.set_period_settings(p_start_day int, p_label text, p_shift boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.my_household_id();
begin
  if v_household is null then
    raise exception 'not_member';
  end if;
  if p_start_day not between 1 and 28 or p_label not in ('start', 'end') then
    raise exception 'invalid_period';
  end if;
  update public.households
  set period_start_day = p_start_day, period_label = p_label, period_shift = p_shift
  where id = v_household;
end;
$$;

revoke execute on function public.set_period_settings(int, text, boolean) from public, anon;
grant execute on function public.set_period_settings(int, text, boolean) to authenticated;

-- 달마다 시작일 직접 고치기 (실제 월급이 다른 날 들어온 달)
create table public.period_overrides (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- 달 이름 (1일)
  month date not null check (extract(day from month) = 1),
  start_date date not null,
  updated_at timestamptz not null default now(),
  unique (household_id, month)
);

create function public.period_overrides_before_write()
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

create trigger period_overrides_before_write
before insert or update on public.period_overrides
for each row execute function public.period_overrides_before_write();

-- RLS: 설정값이라 "원래대로"는 행 삭제 (예산과 같음)
alter table public.period_overrides enable row level security;

create policy "period_overrides: 같은 가구 조회" on public.period_overrides
  for select to authenticated using (household_id = (select public.my_household_id()));
create policy "period_overrides: 같은 가구 추가" on public.period_overrides
  for insert to authenticated with check (household_id = (select public.my_household_id()));
create policy "period_overrides: 같은 가구 수정" on public.period_overrides
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy "period_overrides: 같은 가구 삭제" on public.period_overrides
  for delete to authenticated using (household_id = (select public.my_household_id()));

alter publication supabase_realtime add table public.period_overrides;
