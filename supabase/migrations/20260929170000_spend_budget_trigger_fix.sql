-- 통장·카드 예산 쓰기 규칙 고침 (F-21)
-- 두 표가 함께 쓰던 트리거 함수가 금액 표(spend_budget_amounts)에서도 new.payment_method_id를 읽으려다
-- "record new has no field payment_method_id" 오류가 났다. plpgsql은 and 뒤 조건도 필드를 확인하므로 표마다 나눈다.

create or replace function public.spend_budget_children_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.household_id := public.my_household_id();
  if new.household_id is null then
    raise exception 'not_member';
  end if;
  if not exists (select 1 from public.spend_budgets where id = new.budget_id and household_id = new.household_id) then
    raise exception 'invalid_spend_budget';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 금액 표는 위 함수 그대로, 결제수단 연결 표는 결제수단 검사를 더한 함수로
create function public.spend_budget_methods_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.household_id := public.my_household_id();
  if new.household_id is null then
    raise exception 'not_member';
  end if;
  if not exists (select 1 from public.spend_budgets where id = new.budget_id and household_id = new.household_id) then
    raise exception 'invalid_spend_budget';
  end if;
  if not exists (
    select 1 from public.payment_methods where id = new.payment_method_id and household_id = new.household_id
  ) then
    raise exception 'invalid_payment_method';
  end if;
  return new;
end;
$$;

drop trigger spend_budget_methods_before_write on public.spend_budget_methods;
create trigger spend_budget_methods_before_write
before insert or update on public.spend_budget_methods
for each row execute function public.spend_budget_methods_before_write();
