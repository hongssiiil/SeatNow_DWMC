-- 사용자 데이터 테이블의 RLS 정책 복구
--
-- 증상 1: 카페를 저장하고 로그아웃 → 다시 로그인하면 저장한 카페가 사라진다.
-- 증상 2: 푸시 토큰이 등록되지 않아 빈자리 알림이 발송되지 않는다.
--   [push] 토큰 등록 실패: new row violates row-level security policy
--
-- 진단 (anon 키로 REST API 직접 호출):
--   favorites  INSERT(return=minimal)      → 201 성공
--   favorites  INSERT(return=representation) → 42501 RLS 위반
--   favorites  SELECT                       → 200이지만 항상 0행
--   likes / visit_counts / reviews / seats / cafes SELECT → 정상적으로 행이 나옴
--
-- 즉 favorites는 쓰기만 되고 **읽기가 막혀 있다.** loadBookmarks()가 늘 빈 배열을
-- 받으므로 재로그인하면 저장 목록이 비어 보인다. 데이터가 지워진 게 아니라
-- 읽지 못하는 것이다. profiles(닉네임), reservations, push_tokens도 같은 상태다.
--
-- setup.sql에는 favorites_all / reservations_all이 `for all using (true)`로
-- 적혀 있지만 실제 DB와 다르다. 콘솔에서 정책이 바뀐 것으로 보인다.
--
-- ── 보안에 관한 판단 ──────────────────────────────────────────────────
-- 이 앱은 Supabase Auth 세션을 쓰지 않는다. 사용자 식별자는 앱이 만든
-- user_key(`kakao:123` / `apple:xxx`)이고 클라이언트는 anon 키만 가진다.
-- 따라서 auth.uid() 기반의 사용자별 RLS를 걸 수 없고, 앱이 읽으려면
-- `using (true)`가 될 수밖에 없다. likes·visit_counts·reviews는 이미 그렇다.
--
-- 이 SQL은 나머지 테이블을 같은 수준으로 맞춰 기능을 복구한다.
-- push_tokens만은 예외로 SELECT를 열지 않는다 — 앱이 읽을 일이 없고,
-- 개인정보처리방침 8항에서 "앱에서 조회할 수 없도록 차단"한다고 밝혔기 때문이다.
--
-- ⚠️ 개인정보처리방침 8항의 "이용자별 데이터가 임의로 조회되지 않도록" 문구는
-- 이 상태를 정확히 설명하지 못한다. 근본 해결(사용자별 RLS)은 소셜 로그인을
-- Supabase Auth 세션과 연결해야 가능하다. 출시 후 과제로 남긴다.
--
-- 실행: Supabase 대시보드 → SQL Editor에 붙여넣고 Run.

-- ── favorites: 저장한 카페 ────────────────────────────────────────────
alter table public.favorites enable row level security;

drop policy if exists "favorites_all" on public.favorites;
drop policy if exists "favorites_select" on public.favorites;
drop policy if exists "favorites_insert" on public.favorites;
drop policy if exists "favorites_delete" on public.favorites;

create policy "favorites_select" on public.favorites for select using (true);
create policy "favorites_insert" on public.favorites for insert with check (true);
create policy "favorites_delete" on public.favorites for delete using (true);

-- ── profiles: 닉네임 ──────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true) with check (true);
create policy "profiles_delete" on public.profiles for delete using (true);

-- ── reservations: 테이크인 내역 ───────────────────────────────────────
alter table public.reservations enable row level security;

drop policy if exists "reservations_all" on public.reservations;
drop policy if exists "reservations_select" on public.reservations;
drop policy if exists "reservations_insert" on public.reservations;
drop policy if exists "reservations_update" on public.reservations;
drop policy if exists "reservations_delete" on public.reservations;

create policy "reservations_select" on public.reservations for select using (true);
create policy "reservations_insert" on public.reservations for insert with check (true);
create policy "reservations_update" on public.reservations for update using (true) with check (true);
create policy "reservations_delete" on public.reservations for delete using (true);

-- ── push_tokens: 알림 토큰 (SELECT는 열지 않는다) ─────────────────────
alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_insert" on public.push_tokens;
drop policy if exists "push_tokens_update" on public.push_tokens;
drop policy if exists "push_tokens_delete" on public.push_tokens;

create policy "push_tokens_insert" on public.push_tokens for insert with check (true);
create policy "push_tokens_update" on public.push_tokens for update using (true) with check (true);
create policy "push_tokens_delete" on public.push_tokens for delete using (true);

-- ── 확인 ──────────────────────────────────────────────────────────────
-- select tablename, polname, cmd from pg_policies
--  where tablename in ('favorites','profiles','reservations','push_tokens')
--  order by tablename, cmd;
