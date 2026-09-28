-- 프로필 사진 (F-03 개선, 2026-09-28)

alter table public.members
  add column avatar_path text null;

grant update (avatar_path) on public.members to authenticated;

-- 사진 파일: 버킷 하나, 파일 이름 = "{내 members.id}-{시각}" (새로 올릴 때마다 새 이름, 이전 파일은 서버에서 지움)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: 공개 읽기"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "avatars: 본인 사진만 올리기"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like (select id::text from public.members where user_id = (select auth.uid())) || '-%'
);

create policy "avatars: 본인 사진만 바꾸기"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like (select id::text from public.members where user_id = (select auth.uid())) || '-%'
)
with check (
  bucket_id = 'avatars'
  and name like (select id::text from public.members where user_id = (select auth.uid())) || '-%'
);

create policy "avatars: 본인 사진만 지우기"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name like (select id::text from public.members where user_id = (select auth.uid())) || '-%'
);
