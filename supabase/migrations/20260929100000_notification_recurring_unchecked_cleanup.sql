-- 알림 개선 (사용자 요청 2026-09-29)
-- 1) 정기지출 납부 체크를 풀면 "삭제했어요" 대신 "납부 체크를 풀었어요" (recurring_unchecked)
-- 2) 오래된 알림 자동 정리: 새 알림이 생길 때 90일 지난 알림을 지운다 (목록은 30일치만 보여줌)

alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check check (kind in (
    'created', 'updated', 'deleted', 'restored', 'recurring_paid', 'recurring_unchecked', 'sms_batch',
    'note_created', 'note_updated', 'note_deleted', 'note_restored',
    'event_created', 'event_updated', 'event_deleted', 'event_restored'
  ));

-- 내역 수정·삭제·되돌리기 알림: 정기지출과 연결된 내역을 지우면(체크 풀기) recurring_unchecked
create or replace function public.notify_transaction_updated()
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
    v_kind := case when new.recurring_item_id is not null then 'recurring_unchecked' else 'deleted' end;
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

-- ─────────────────────────────────────────────
-- 오래된 알림 정리: 알림이 새로 생길 때(문장 단위) 그 사람의 90일 지난 알림을 지운다.
-- 예약 작업(cron) 없이 동작. 받는 사람 + 만든 시각 인덱스를 탄다.
-- ─────────────────────────────────────────────

create function public.cleanup_old_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.recipient_id in (select distinct r.recipient_id from new_rows r)
    and n.created_at < now() - interval '90 days';
  return null;
end;
$$;

create trigger notifications_cleanup
after insert on public.notifications
referencing new table as new_rows
for each statement execute function public.cleanup_old_notifications();

revoke execute on function public.cleanup_old_notifications() from public, anon, authenticated;
