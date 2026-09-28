-- 알림 (F-17, 사용자 요청 2026-09-28)
-- 상대가 내역을 추가·수정·삭제하거나 정기지출을 납부 체크하면 나에게 알림이 쌓인다.
-- 알림은 내역이 바뀔 때 DB 트리거가 만든다 (직접 입력·문자·정기지출 어느 길로 바뀌어도 빠짐없이).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  recipient_id uuid not null references public.members (id) on delete cascade,
  actor_id uuid not null references public.members (id) on delete cascade,
  kind text not null check (kind in ('created', 'updated', 'deleted', 'restored', 'recurring_paid', 'sms_batch')),
  -- 문자 묶음(sms_batch)은 여러 건이라 비워 둔다
  transaction_id uuid references public.transactions (id) on delete cascade,
  -- 알림을 만든 때의 모습 (나중에 내역이 바뀌어도 알림 문장은 그대로)
  occurred_on date,
  subject text,
  amount bigint,
  tx_type text check (tx_type in ('expense', 'income')),
  count int not null default 1 check (count >= 1),
  read_at timestamptz
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ─────────────────────────────────────────────
-- RLS: 받는 사람만 보고, 읽음 표시(read_at)만 바꿀 수 있다. 만들기·지우기는 트리거만.
-- ─────────────────────────────────────────────

alter table public.notifications enable row level security;

create policy "notifications: 받는 사람만 조회" on public.notifications
  for select to authenticated
  using (recipient_id = (select m.id from public.members m where m.user_id = (select auth.uid())));

create policy "notifications: 받는 사람만 읽음 표시" on public.notifications
  for update to authenticated
  using (recipient_id = (select m.id from public.members m where m.user_id = (select auth.uid())))
  with check (recipient_id = (select m.id from public.members m where m.user_id = (select auth.uid())));

revoke insert, update, delete on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- ─────────────────────────────────────────────
-- 내역 추가: 문장 단위 트리거. 문자로 여러 건을 한 번에 저장하면 알림 하나로 묶는다.
-- security definer: 알림 표는 사용자가 직접 쓸 수 없으므로.
-- ─────────────────────────────────────────────

create function public.notify_transactions_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sms_count int;
begin
  select count(*) into v_sms_count from new_rows where source = 'sms';

  -- 한 건씩: 직접 입력·가져오기·정기지출, 그리고 문자 한 건만 저장한 경우
  insert into public.notifications (
    household_id, recipient_id, actor_id, kind, transaction_id, occurred_on, subject, amount, tx_type
  )
  select
    n.household_id, r.id, n.created_by,
    case when n.source = 'recurring' then 'recurring_paid' else 'created' end,
    n.id, n.occurred_on, coalesce(nullif(n.merchant, ''), c.name), n.amount, n.type
  from new_rows n
  join public.members r on r.household_id = n.household_id and r.id <> n.created_by
  left join public.categories c on c.id = n.category_id
  where n.source <> 'sms' or v_sms_count = 1;

  -- 문자 여러 건: 하나로 묶는다 (가장 이른 날짜, 지출 합계)
  if v_sms_count > 1 then
    insert into public.notifications (household_id, recipient_id, actor_id, kind, occurred_on, amount, count)
    select n.household_id, r.id, n.created_by, 'sms_batch', min(n.occurred_on),
           sum(n.amount) filter (where n.type = 'expense'), count(*)
    from new_rows n
    join public.members r on r.household_id = n.household_id and r.id <> n.created_by
    where n.source = 'sms'
    group by n.household_id, r.id, n.created_by;
  end if;

  return null;
end;
$$;

create trigger transactions_notify_insert
after insert on public.transactions
referencing new table as new_rows
for each statement execute function public.notify_transactions_inserted();

-- ─────────────────────────────────────────────
-- 내역 수정·삭제·되돌리기: 한 건씩.
-- 같은 내역을 여러 번 고치면 아직 안 읽은 "수정" 알림 하나를 새로 고친다 (알림이 쌓이지 않게).
-- ─────────────────────────────────────────────

create function public.notify_transaction_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_subject text;
  v_recipient uuid;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    v_kind := 'deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_kind := 'restored';
  elsif old.deleted_at is not null then
    return null; -- 이미 지운 내역을 또 건드린 경우
  elsif (old.type, old.amount, old.occurred_on, old.occurred_time, old.category_id, old.merchant,
         old.memo, old.payment_method_id, old.scope, old.member_slot)
        is not distinct from
        (new.type, new.amount, new.occurred_on, new.occurred_time, new.category_id, new.merchant,
         new.memo, new.payment_method_id, new.scope, new.member_slot) then
    return null; -- 실제로 바뀐 게 없음
  else
    v_kind := 'updated';
  end if;

  select id into v_recipient from public.members
  where household_id = new.household_id and id <> new.updated_by;
  if v_recipient is null then
    return null; -- 아직 혼자 쓰는 가구
  end if;

  select coalesce(nullif(new.merchant, ''), c.name) into v_subject
  from public.categories c where c.id = new.category_id;

  if v_kind = 'updated' then
    update public.notifications
    set created_at = now(), occurred_on = new.occurred_on, subject = v_subject,
        amount = new.amount, tx_type = new.type
    where recipient_id = v_recipient and transaction_id = new.id
      and kind = 'updated' and read_at is null;
    if found then
      return null;
    end if;
  end if;

  insert into public.notifications (
    household_id, recipient_id, actor_id, kind, transaction_id, occurred_on, subject, amount, tx_type
  ) values (
    new.household_id, v_recipient, new.updated_by, v_kind, new.id, new.occurred_on, v_subject, new.amount, new.type
  );

  return null;
end;
$$;

create trigger transactions_notify_update
after update on public.transactions
for each row execute function public.notify_transaction_updated();

revoke execute on function public.notify_transactions_inserted() from public, anon, authenticated;
revoke execute on function public.notify_transaction_updated() from public, anon, authenticated;

-- 실시간: 알림이 오면 종 배지가 바로 바뀐다
alter publication supabase_realtime add table public.notifications;
