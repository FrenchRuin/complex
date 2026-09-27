-- 서비스 사용량 (F-54): DB 전체 용량 + 우리 가구 데이터 개수·마지막 사용 시각
-- security definer: pg_database_size 권한 때문. 가구 구성원만 부를 수 있다.

create function public.get_usage()
returns table (
  db_size_bytes bigint,
  transaction_count bigint,
  recurring_count bigint,
  last_activity timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_household uuid := public.my_household_id();
begin
  if v_household is null then
    raise exception 'not_member';
  end if;

  return query
  select
    pg_database_size(current_database()),
    (select count(*) from public.transactions where household_id = v_household and deleted_at is null),
    (select count(*) from public.recurring_items where household_id = v_household),
    (select max(updated_at) from public.transactions where household_id = v_household);
end;
$$;

revoke execute on function public.get_usage() from public, anon;
grant execute on function public.get_usage() to authenticated;
