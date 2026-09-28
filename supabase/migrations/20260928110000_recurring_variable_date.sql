-- 정기지출 결제일도 매달 달라질 수 있음 (F-30, F-31 개선, 2026-09-28)

alter table public.recurring_items
  add column has_variable_date boolean not null default false;

-- check_recurring에 p_occurred_on 추가: 없으면 기존처럼 그 달 결제일(없으면 말일)로 계산
drop function if exists public.check_recurring(uuid, date, bigint);

create function public.check_recurring(
  p_item_id uuid,
  p_month date,
  p_amount bigint default null,
  p_occurred_on date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_item public.recurring_items%rowtype;
  v_last_day int;
  v_tx_id uuid;
begin
  select * into v_item from public.recurring_items where id = p_item_id;
  if not found then
    raise exception 'invalid_recurring_item';
  end if;

  if extract(day from p_month) <> 1
     or p_month < v_item.start_month
     or (v_item.end_month is not null and p_month > v_item.end_month) then
    raise exception 'recurring_not_in_month';
  end if;

  if p_amount is not null and p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  v_last_day := extract(day from (p_month + interval '1 month' - interval '1 day'))::int;

  begin
    insert into public.transactions (
      household_id, type, amount, occurred_on, category_id, merchant, payment_method_id,
      scope, member_slot, source, recurring_item_id, recurring_month, created_by, updated_by
    )
    select
      v_item.household_id, 'expense', coalesce(p_amount, v_item.amount),
      coalesce(p_occurred_on, p_month + (least(v_item.day_of_month, v_last_day) - 1)),
      v_item.category_id, v_item.name, v_item.payment_method_id,
      v_item.scope, v_item.member_slot, 'recurring', v_item.id, p_month, m.id, m.id
    from public.members m
    where m.user_id = auth.uid()
    returning id into v_tx_id;
  exception when unique_violation then
    raise exception 'already_paid';
  end;

  return v_tx_id;
end;
$$;

revoke execute on function public.check_recurring(uuid, date, bigint, date) from public, anon;
grant execute on function public.check_recurring(uuid, date, bigint, date) to authenticated;
