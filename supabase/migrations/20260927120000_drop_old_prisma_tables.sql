-- 이전 Prisma 앱이 남긴 테이블 삭제 (사용자 결정 2026-09-27)
-- RLS가 꺼져 있어 공개 키로 누구나 읽고 쓸 수 있는 상태였다. 이 앱은 쓰지 않는다.
-- 삭제 전 데이터는 로컬 tmp/old-prisma-backup-20260927.json 에 백업했다 (저장소에는 올리지 않음).

drop table if exists public."TripItem" cascade;
drop table if exists public."Trip" cascade;
drop table if exists public."Event" cascade;
drop table if exists public."Transaction" cascade;
drop table if exists public."Category" cascade;
drop table if exists public."Couple" cascade;
drop table if exists public."Profile" cascade;
drop table if exists public."_prisma_migrations" cascade;
