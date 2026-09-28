-- 공유 메모 (F-18, 사용자 요청 2026-09-28)
-- 글 메모와 체크리스트 메모. 체크리스트 항목은 items(jsonb 배열)에 [{id, text, done}]로 둔다.
-- 항목 체크는 toggle_note_item()으로 한 항목만 바꿔 두 사람이 동시에 체크해도 서로 덮어쓰지 않는다.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'checklist')),
  body text not null default '' check (char_length(body) <= 5000),
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 100),
  is_pinned boolean not null default false,
  created_by uuid not null references public.members (id) on delete cascade,
  updated_by uuid not null references public.members (id) on delete cascade,
  -- 어떤 변경이든 (고정·체크 포함). 목록 정렬용
  updated_at timestamptz not null default now(),
  -- 내용(글·종류·항목 글자)이 바뀐 때만. 알림은 이 값이 바뀔 때 간다
  edited_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index notes_household_idx on public.notes (household_id, deleted_at, updated_at desc);

-- 항목에서 체크 여부를 뺀 모습 (내용이 바뀌었는지 비교용)
create function public.note_items_content(p_items jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(e - 'done' order by o), '[]'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as t(e, o);
$$;

-- ─────────────────────────────────────────────
-- 쓰기 전 규칙: 가구·작성자·수정자·시각은 DB가 채운다 (화면 값은 믿지 않음)
-- ─────────────────────────────────────────────

create function public.notes_before_write()
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
    new.edited_at := now();
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.body is distinct from old.body
       or new.kind is distinct from old.kind
       or public.note_items_content(new.items) is distinct from public.note_items_content(old.items) then
      new.edited_at := now();
    else
      new.edited_at := old.edited_at;
    end if;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger notes_before_write
before insert or update on public.notes
for each row execute function public.notes_before_write();

-- ─────────────────────────────────────────────
-- RLS: 같은 가구는 조회·추가·수정. 삭제는 deleted_at으로만 (진짜 삭제 금지).
-- ─────────────────────────────────────────────

alter table public.notes enable row level security;

create policy "notes: 같은 가구 조회" on public.notes
  for select to authenticated
  using (household_id = (select public.my_household_id()));

create policy "notes: 같은 가구 추가" on public.notes
  for insert to authenticated
  with check (household_id = (select public.my_household_id()));

create policy "notes: 같은 가구 수정" on public.notes
  for update to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

revoke delete on public.notes from authenticated, anon;

-- ─────────────────────────────────────────────
-- RPC: 체크리스트 항목 하나만 체크/해제. security invoker라 RLS·트리거가 그대로 적용된다.
-- ─────────────────────────────────────────────

create function public.toggle_note_item(p_note_id uuid, p_item_id text, p_done boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.notes
  set items = (
    select jsonb_agg(
      case when e->>'id' = p_item_id then jsonb_set(e, '{done}', to_jsonb(p_done)) else e end
      order by o
    )
    from jsonb_array_elements(items) with ordinality as t(e, o)
  )
  where id = p_note_id and deleted_at is null and kind = 'checklist'
    and exists (select 1 from jsonb_array_elements(items) e where e->>'id' = p_item_id);

  if not found then
    raise exception 'invalid_note';
  end if;
end;
$$;

revoke execute on function public.toggle_note_item(uuid, text, boolean) from public, anon;
grant execute on function public.toggle_note_item(uuid, text, boolean) to authenticated;

-- ─────────────────────────────────────────────
-- 알림 (F-17 확장): 상대가 메모를 쓰거나(내용) 고치거나 지우거나 되돌리면.
-- 고정·체크만 바뀐 것은 알림 없음 (edited_at이 그대로).
-- ─────────────────────────────────────────────

alter table public.notifications
  add column note_id uuid references public.notes (id) on delete cascade,
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored'
  ));

-- 메모 알림 문장에 쓸 짧은 이름: 첫 줄, 없으면 첫 항목, 30자까지
create function public.note_subject(p_body text, p_items jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(coalesce(
    nullif(btrim(split_part(p_body, E'\n', 1)), ''),
    nullif(btrim(p_items->0->>'text'), ''),
    '제목 없는 메모'
  ), 30);
$$;

create function public.notify_note_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_actor uuid;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := 'note_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_kind := 'note_deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_kind := 'note_restored';
  elsif old.deleted_at is not null then
    return null;
  elsif new.edited_at is distinct from old.edited_at then
    v_kind := 'note_updated';
  else
    return null; -- 고정·체크만 바뀜
  end if;

  v_actor := new.updated_by;
  select id into v_recipient from public.members
  where household_id = new.household_id and id <> v_actor;
  if v_recipient is null then
    return null;
  end if;

  -- 같은 메모를 여러 번 고치면 안 읽은 "고침" 알림 하나를 새로 고친다
  if v_kind = 'note_updated' then
    update public.notifications
    set created_at = now(), subject = public.note_subject(new.body, new.items)
    where recipient_id = v_recipient and note_id = new.id and kind = 'note_updated' and read_at is null;
    if found then
      return null;
    end if;
  end if;

  insert into public.notifications (household_id, recipient_id, actor_id, kind, note_id, subject)
  values (new.household_id, v_recipient, v_actor, v_kind, new.id, public.note_subject(new.body, new.items));

  return null;
end;
$$;

create trigger notes_notify
after insert or update on public.notes
for each row execute function public.notify_note_changed();

revoke execute on function public.notify_note_changed() from public, anon, authenticated;

alter publication supabase_realtime add table public.notes;
