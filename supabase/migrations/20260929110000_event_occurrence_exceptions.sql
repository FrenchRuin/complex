-- 반복 일정 "이 일정만" 고치기·지우기 (F-19, 사용자 요청 2026-09-29)
-- - 이 일정만 지우기: 반복 일정의 skip_dates에 그 회차 시작 날짜를 넣는다 (되돌리기는 빼기)
-- - 이 일정만 고치기: 그 회차를 skip_dates에 넣고, 같은 내용의 한 번짜리 일정(detached_from = 반복 일정)을 만든 뒤
--   화면에서 고친 내용으로 그 일정을 저장한다. 떼어 내는 순간에는 알림을 보내지 않는다 (고친 내용만 "수정" 알림).

alter table public.events
  add column skip_dates date[] not null default '{}',
  add column detached_from uuid references public.events (id) on delete set null;

-- ─────────────────────────────────────────────
-- 알림 종류: 회차 하나 지우기·되돌리기
-- ─────────────────────────────────────────────

alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'recurring_unchecked', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored',
    'event_created', 'event_updated', 'event_deleted', 'event_restored',
    'event_occurrence_deleted', 'event_occurrence_restored'
  ));

create or replace function public.notify_event_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_recipient uuid;
  v_date date;
begin
  -- 회차 떼어 내기 중(detach_event_occurrence)에는 알림 없음
  if current_setting('app.event_detaching', true) = 'on' then
    return null;
  end if;

  v_date := new.start_date;
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
    -- 내용은 그대로, 건너뛴 날짜만 바뀜: 회차 하나 지우기·되돌리기
    select d into v_date from unnest(new.skip_dates) d where d <> all (old.skip_dates) limit 1;
    if v_date is not null then
      v_kind := 'event_occurrence_deleted';
    else
      select d into v_date from unnest(old.skip_dates) d where d <> all (new.skip_dates) limit 1;
      if v_date is null then
        return null; -- 실제로 바뀐 게 없음
      end if;
      v_kind := 'event_occurrence_restored';
    end if;
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
  values (new.household_id, v_recipient, new.updated_by, v_kind, new.id, new.title, v_date);

  return null;
end;
$$;

-- ─────────────────────────────────────────────
-- 회차 하나 건너뛰기·되돌리기. RLS가 그대로 적용된다 (invoker).
-- ─────────────────────────────────────────────

create function public.set_event_occurrence_skipped(p_event_id uuid, p_date date, p_skipped boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.events
  set skip_dates = case
    when p_skipped then (select array_agg(distinct d order by d) from unnest(array_append(skip_dates, p_date)) d)
    else array_remove(skip_dates, p_date)
  end
  where id = p_event_id and deleted_at is null and repeat <> 'none';
  if not found then
    raise exception 'event_not_found';
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- 회차 하나 떼어 내기: 반복에서 그 날짜를 빼고, 같은 내용의 한 번짜리 일정을 만들어 id를 돌려준다.
-- ─────────────────────────────────────────────

create function public.detach_event_occurrence(p_event_id uuid, p_date date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_id uuid;
begin
  select * into v_event from public.events
  where id = p_event_id and deleted_at is null and repeat <> 'none';
  if not found then
    raise exception 'event_not_found';
  end if;
  if p_date < v_event.start_date or (v_event.repeat_until is not null and p_date > v_event.repeat_until)
     or p_date = any (v_event.skip_dates) then
    raise exception 'occurrence_not_found';
  end if;

  -- 이 거래(요청) 안에서만: 알림 트리거가 건너뛴다
  perform set_config('app.event_detaching', 'on', true);

  update public.events set skip_dates = array_append(skip_dates, p_date) where id = p_event_id;

  insert into public.events (
    household_id, title, memo, owner, start_date, end_date, all_day, start_time, end_time,
    repeat, detached_from, created_by, updated_by
  ) values (
    v_event.household_id, v_event.title, v_event.memo, v_event.owner,
    p_date, p_date + (v_event.end_date - v_event.start_date), v_event.all_day, v_event.start_time, v_event.end_time,
    'none', v_event.id, v_event.created_by, v_event.updated_by
  )
  returning id into v_id;

  perform set_config('app.event_detaching', 'off', true);
  return v_id;
end;
$$;

revoke execute on function public.set_event_occurrence_skipped(uuid, date, boolean) from public, anon;
revoke execute on function public.detach_event_occurrence(uuid, date) from public, anon;
grant execute on function public.set_event_occurrence_skipped(uuid, date, boolean) to authenticated;
grant execute on function public.detach_event_occurrence(uuid, date) to authenticated;
