-- push_tokens RLS 정책
--
-- 증상: 실기기에서 로그인하면 다음 로그가 찍히고 토큰이 저장되지 않는다.
--   [push] 토큰 등록 실패: new row violates row-level security policy for table "push_tokens"
-- 토큰이 없으면 빈자리 알림이 한 건도 발송되지 않는다.
--
-- 원인: 테이블에 RLS가 켜져 있는데 정책이 하나도 없어 anon 키의 모든 쓰기가 막힌다.
-- (이 테이블은 저장소의 setup.sql에 정의가 없다 — 콘솔에서 직접 만든 것으로 보인다.)
--
-- 설계: 개인정보처리방침 8항의 "푸시 토큰 목록은 앱에서 조회할 수 없도록 차단하고,
-- 알림 발송 서버만 접근할 수 있게 관리합니다"를 지킨다.
--   - SELECT 정책은 만들지 않는다 → 앱은 토큰 목록을 읽을 수 없다.
--   - INSERT/UPDATE는 허용한다 → 기기가 자기 토큰을 등록·갱신할 수 있다.
--   - DELETE는 허용한다 → 로그아웃(unregisterPushToken)과 계정 삭제(account.ts)에 필요하다.
-- 발송 서버는 service_role 키를 쓰므로 RLS를 우회한다.
--
-- 주의: supabase-js의 upsert는 .select()를 붙이지 않으면 return=minimal이라
-- RETURNING이 없다. 그래서 SELECT 정책 없이도 동작한다 (pushToken.ts:95-100).
--
-- 실행: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_insert" on public.push_tokens;
create policy "push_tokens_insert"
  on public.push_tokens for insert
  with check (true);

drop policy if exists "push_tokens_update" on public.push_tokens;
create policy "push_tokens_update"
  on public.push_tokens for update
  using (true) with check (true);

drop policy if exists "push_tokens_delete" on public.push_tokens;
create policy "push_tokens_delete"
  on public.push_tokens for delete
  using (true);

-- 확인용 — 정책 3개(insert/update/delete)만 나와야 하고 select는 없어야 한다.
-- select polname, cmd from pg_policies where tablename = 'push_tokens';
