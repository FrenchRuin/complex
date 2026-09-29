-- 공휴일 최신화 (F-55 보완, 사용자 요청 2026-09-29)
-- 설치된 라이브러리(@hyunbinseo/holidays-kr)는 배포해야 새 해가 들어온다.
-- 대신 라이브러리가 올려 두는 파일(https://holidays.hyunbin.page/basic.json)을 받아 여기에 저장하고,
-- 저장된 해는 이 데이터를, 없는 해는 라이브러리를 쓴다. 가구와 관계없는 공통 데이터라 모두 같이 쓴다.
-- 쓰기는 서버(서비스 키)만 한다.

create table public.holiday_presets (
  date date primary key,
  year smallint not null,
  names text[] not null check (cardinality(names) between 1 and 5),
  fetched_at timestamptz not null default now()
);

create index holiday_presets_year_idx on public.holiday_presets (year);

-- 마지막으로 받으러 간 시각 (자동 받기를 하루 한 번으로 줄이려고)
create table public.holiday_sync (
  id smallint primary key default 1 check (id = 1),
  checked_at timestamptz,
  fetched_at timestamptz
);

insert into public.holiday_sync (id) values (1);

alter table public.holiday_presets enable row level security;
alter table public.holiday_sync enable row level security;

create policy "holiday_presets: 로그인하면 조회" on public.holiday_presets
  for select to authenticated using (true);
create policy "holiday_sync: 로그인하면 조회" on public.holiday_sync
  for select to authenticated using (true);

revoke insert, update, delete on public.holiday_presets from authenticated, anon;
revoke insert, update, delete on public.holiday_sync from authenticated, anon;
