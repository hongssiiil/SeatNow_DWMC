-- ─────────────────────────────────────────────────────────
-- Likes & Reviews (run once in Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────

alter table public.cafes
  add column if not exists like_count int not null default 0;

create table if not exists public.likes (
  user_key text not null,
  cafe_id text not null references public.cafes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_key, cafe_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_id text not null references public.cafes(id) on delete cascade,
  user_key text not null,
  nickname text not null default '',
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reviews_cafe_created_idx
  on public.reviews (cafe_id, created_at desc);

alter table public.likes enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "likes_all" on public.likes;
create policy "likes_all" on public.likes for all using (true) with check (true);

drop policy if exists "reviews_all" on public.reviews;
create policy "reviews_all" on public.reviews for all using (true) with check (true);

-- Atomic like toggle: insert/delete + like_count ±1
create or replace function public.toggle_cafe_like(p_user_key text, p_cafe_id text)
returns json
language plpgsql
as $$
declare
  v_exists boolean;
  v_count int;
begin
  select exists(
    select 1 from public.likes
    where user_key = p_user_key and cafe_id = p_cafe_id
  ) into v_exists;

  if v_exists then
    delete from public.likes
    where user_key = p_user_key and cafe_id = p_cafe_id;

    update public.cafes
    set like_count = greatest(0, like_count - 1)
    where id = p_cafe_id
    returning like_count into v_count;

    return json_build_object('liked', false, 'like_count', coalesce(v_count, 0));
  else
    insert into public.likes (user_key, cafe_id)
    values (p_user_key, p_cafe_id);

    update public.cafes
    set like_count = like_count + 1
    where id = p_cafe_id
    returning like_count into v_count;

    return json_build_object('liked', true, 'like_count', coalesce(v_count, 0));
  end if;
end;
$$;

grant execute on function public.toggle_cafe_like(text, text) to anon, authenticated;
