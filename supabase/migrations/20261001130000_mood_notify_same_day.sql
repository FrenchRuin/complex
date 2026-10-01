-- 오늘 기분 알림(F-04): 안 읽은 알림을 고치는 것은 같은 날 것만.
-- 어제 안 읽은 기분 알림을 고치면 새 행이 안 생겨 휴대폰 알림(after insert)이 가지 않았다 (2026-10-01 검토).

create or replace function public.notify_mood_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  if new.deleted_at is not null then
    return null; -- 지우기는 알림 없음
  end if;
  if tg_op = 'UPDATE' and old.deleted_at is null
     and (old.mood, old.note) is not distinct from (new.mood, new.note) then
    return null; -- 같은 값으로 다시 저장
  end if;

  select id into v_recipient from public.members
  where household_id = new.household_id and id <> new.member_id;
  if v_recipient is null then
    return null;
  end if;

  update public.notifications
  set created_at = now(), mood = new.mood, subject = new.note, occurred_on = new.mood_date
  where recipient_id = v_recipient and actor_id = new.member_id and kind = 'mood_set'
    and occurred_on = new.mood_date and read_at is null;
  if found then
    return null;
  end if;

  insert into public.notifications (household_id, recipient_id, actor_id, kind, mood, subject, occurred_on)
  values (new.household_id, v_recipient, new.member_id, 'mood_set', new.mood, new.note, new.mood_date);
  return null;
end;
$$;
