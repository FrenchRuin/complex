-- 공유 일정 (F-19, 사용자 요청 2026-09-28)
-- 하루 종일 또는 시각이 있는 일정, 여러 날 일정, 매주·매달·매년 반복.
-- 반복은 한 행으로 저장하고, 화면에서 달마다 펼친다 (lib/calc/events.ts).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 50),
  memo text not null default '' check (char_length(memo) <= 1000),
  owner text not null default 'joint' check (owner in ('joint', 'a', 'b')),
  start_date date not null,
  end_date date not null,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  repeat text not null default 'none' check (repeat in ('none', 'weekly', 'monthly', 'yearly')),
  repeat_until date,
  created_by uuid not null references public.members (id) on delete cascade,
  updated_by uuid not null references public.members (id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 여러 날 일정은 31일까지
  constraint events_dates check (end_date >= start_date and end_date - start_date <= 30),
  -- 시각이 있는 일정은 시작 시각이 있어야 하고, 같은 날이면 끝이 시작보다 늦어야 한다
  constraint events_times check (
    (all_day and start_time is null and end_time is null)
    or (not all_day and start_time is not null
        and (end_time is null or end_date > start_date or end_time > start_time))
  ),
  constraint events_repeat_until check (repeat_until is null or (repeat <> 'none' and repeat_until >= start_date))
);

create index events_household_idx on public.events (household_id, deleted_at, start_date);

-- ─────────────────────────────────────────────
-- 쓰기 전 규칙: 가구·작성자·수정자·시각은 DB가 채운다
-- ─────────────────────────────────────────────

create function public.events_before_write()
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
  end if;
  new.title := btrim(new.title);
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_before_write
before insert or update on public.events
for each row execute function public.events_before_write();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구는 조회·추가·수정. 삭제는 deleted_at으로만.
-- ─────────────────────────────────────────────

alter table public.events enable row level security;

create policy "events: 같은 가구 조회" on public.events
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "events: 같은 가구 추가" on public.events
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "events: 같은 가구 수정" on public.events
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.events from authenticated, anon;

-- ─────────────────────────────────────────────
-- 알림 (F-17 확장): 상대가 일정을 추가·수정·삭제·되돌리면
-- ─────────────────────────────────────────────

alter table public.notifications
  add column event_id uuid references public.events (id) on delete cascade,
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored',
    'event_created', 'event_updated', 'event_deleted', 'event_restored'
  ));

create function public.notify_event_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := 'event_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_kind := 'event_deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_kind := 'event_restored';
  elsif old.deleted_at is not null then
    return null;
  elsif (old.title, old.memo, old.owner, old.start_date, old.end_date, old.all_day, old.start_time, old.end_time,
         old.repeat, old.repeat_until)
        is not distinct from
        (new.title, new.memo, new.owner, new.start_date, new.end_date, new.all_day, new.start_time, new.end_time,
         new.repeat, new.repeat_until) then
    return null; -- 실제로 바뀐 게 없음
  else
    v_kind := 'event_updated';
  end if;

  select id into v_recipient from public.members
  where household_id = new.household_id and id <> new.updated_by;
  if v_recipient is null then
    return null;
  end if;

  if v_kind = 'event_updated' then
    update public.notifications
    set created_at = now(), subject = new.title, occurred_on = new.start_date
    where recipient_id = v_recipient and event_id = new.id and kind = 'event_updated' and read_at is null;
    if found then
      return null;
    end if;
  end if;

  insert into public.notifications (household_id, recipient_id, actor_id, kind, event_id, subject, occurred_on)
  values (new.household_id, v_recipient, new.updated_by, v_kind, new.id, new.title, new.start_date);

  return null;
end;
$$;

create trigger events_notify
after insert or update on public.events
for each row execute function public.notify_event_changed();

revoke execute on function public.notify_event_changed() from public, anon, authenticated;

alter publication supabase_realtime add table public.events;
