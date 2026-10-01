-- 오늘 기분 (F-04, 사용자 요청 2026-10-01)
-- 사람·한국 날짜마다 한 줄. 쓰기는 set_my_mood / clear_my_mood 함수로만 (날짜는 DB가 정한다).

create table public.moods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  mood_date date not null,
  mood text not null check (mood in (
    'good', 'happy', 'excited', 'calm', 'meh', 'tired', 'busy', 'annoyed', 'sad', 'sick', 'hungry', 'celebrate'
  )),
  note text check (note is null or char_length(note) between 1 and 20),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (member_id, mood_date)
);

create index moods_household_idx on public.moods (household_id, mood_date);

alter table public.moods enable row level security;

create policy "moods: 같은 가구 조회" on public.moods
  for select to authenticated
  using (household_id = (select public.my_household_id()));

revoke insert, update, delete on public.moods from authenticated, anon;

create function public.set_my_mood(p_mood text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;
  insert into public.moods (household_id, member_id, mood_date, mood, note)
  values (v_member.household_id, v_member.id, (now() at time zone 'Asia/Seoul')::date, p_mood,
          nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (member_id, mood_date) do update
    set mood = excluded.mood, note = excluded.note, deleted_at = null, updated_at = now();
end;
$$;

create function public.clear_my_mood()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moods
  set deleted_at = now(), updated_at = now()
  where member_id = (select id from public.members where user_id = auth.uid())
    and mood_date = (now() at time zone 'Asia/Seoul')::date
    and deleted_at is null;
end;
$$;

revoke execute on function public.set_my_mood(text, text) from public, anon;
revoke execute on function public.clear_my_mood() from public, anon;
grant execute on function public.set_my_mood(text, text) to authenticated;
grant execute on function public.clear_my_mood() to authenticated;

-- ─────────────────────────────────────────────
-- 알림 (F-17 확장): 상대가 기분을 정하거나 바꾸면
-- ─────────────────────────────────────────────

alter table public.notifications
  add column mood text,
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'recurring_unchecked', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored',
    'event_created', 'event_updated', 'event_deleted', 'event_restored',
    'event_occurrence_deleted', 'event_occurrence_restored',
    'mood_set'
  ));

create function public.notify_mood_changed()
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
  where recipient_id = v_recipient and actor_id = new.member_id and kind = 'mood_set' and read_at is null;
  if found then
    return null;
  end if;

  insert into public.notifications (household_id, recipient_id, actor_id, kind, mood, subject, occurred_on)
  values (new.household_id, v_recipient, new.member_id, 'mood_set', new.mood, new.note, new.mood_date);
  return null;
end;
$$;

create trigger moods_notify
after insert or update on public.moods
for each row execute function public.notify_mood_changed();

revoke execute on function public.notify_mood_changed() from public, anon, authenticated;

alter publication supabase_realtime add table public.moods;
