-- ─────────────────────────────────────────────────────────
-- User profiles (nickname)
-- ─────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_key text primary key,
  nickname text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_all" on public.profiles for all using (true) with check (true);
