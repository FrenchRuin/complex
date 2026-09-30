-- 대출 계산 (F-43) 수정: 사람·자산을 지울 때 DB가 연쇄로 바꾸는 값(updated_by, asset_id → null)은
-- 로그인한 사람이 없어(auth.uid() null) 쓰기 전 규칙이 not_member로 막아 삭제 전체가 실패했다.
-- 다른 트리거·외래 키 동작이 부른 변경(pg_trigger_depth() > 1)은 그대로 통과시킨다.

create or replace function public.loan_profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;
  if tg_op = 'UPDATE' then
    new.household_id := old.household_id;
  else
    new.household_id := v_member.household_id;
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.loan_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_member public.members%rowtype;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  select * into v_member from public.members where user_id = auth.uid();
  if not found then
    raise exception 'not_member';
  end if;
  if tg_op = 'UPDATE' then
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.household_id := v_member.household_id;
    new.created_by := v_member.id;
    new.created_at := now();
  end if;
  new.updated_by := v_member.id;
  new.updated_at := now();
  return new;
end;
$$;
