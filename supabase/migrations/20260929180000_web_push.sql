-- 휴대폰 알림(웹 푸시) (F-57, 사용자 요청 2026-09-29)
-- 앱 안 알림(notifications)이 새로 생기면 운영 서버(/api/push)를 불러, 받는 사람의 폰들로 같은 알림을 보낸다.
-- DB는 알림 번호만 넘긴다. 서버가 알림을 다시 읽고 "2분 안에 생겼고 아직 안 보낸 것"만 보내므로 주소가 알려져도 스팸이 안 된다.
-- 같은 내역을 여러 번 고쳐 안 읽은 알림 하나를 새로 고칠 때(update)는 다시 보내지 않는다.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  -- 브라우저가 준 푸시 주소와 암호화 키
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  -- 어느 기기인지 보여주기용 (예: "iPhone · Safari")
  device text not null default '' check (char_length(device) <= 60),
  last_used_at timestamptz
);

create index push_subscriptions_member_idx on public.push_subscriptions (member_id);

-- 쓰기 규칙: 사람·가구는 로그인한 사람 기준
create function public.push_subscriptions_before_write()
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
  new.member_id := v_member.id;
  new.household_id := v_member.household_id;
  return new;
end;
$$;

create trigger push_subscriptions_before_write
before insert or update on public.push_subscriptions
for each row execute function public.push_subscriptions_before_write();

-- RLS: 본인 기기만 보고, 넣고, 지운다 (보내기는 서버가 서비스 키로)
alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: 내 기기 조회" on public.push_subscriptions
  for select to authenticated
  using (member_id = (select m.id from public.members m where m.user_id = (select auth.uid())));
create policy "push_subscriptions: 내 기기 추가" on public.push_subscriptions
  for insert to authenticated
  with check (member_id = (select m.id from public.members m where m.user_id = (select auth.uid())));
create policy "push_subscriptions: 내 기기 삭제" on public.push_subscriptions
  for delete to authenticated
  using (member_id = (select m.id from public.members m where m.user_id = (select auth.uid())));

-- 보낸 알림 표시 (두 번 보내지 않게)
alter table public.notifications add column pushed_at timestamptz;

-- 알림이 새로 생기면 운영 서버에 알림 번호를 넘긴다 (비동기, 실패해도 알림 저장은 그대로)
create function public.request_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://complex-henna-psi.vercel.app/api/push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

create trigger notifications_request_push
after insert on public.notifications
for each row execute function public.request_push();

revoke execute on function public.request_push() from public, anon, authenticated;
