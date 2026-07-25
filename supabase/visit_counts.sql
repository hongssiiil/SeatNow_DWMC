-- ─────────────────────────────────────────────────────────
-- visitCounts: 유저별 카페 테이크인 횟수 누적
--
-- 완료(completed) 기준 (현재 PoC):
--   take_in_seat 성공 시 +1 / cancel_take_in_seat 성공 시 -1
--   (reserved→occupied 는 AI/CCTV 담당. 파이프라인 안정화 후
--    occupied 전환 트리거로 옮기고 take_in 쪽 ±1 제거 권장)
-- ─────────────────────────────────────────────────────────

create table if not exists public.visit_counts (
  user_key text not null,
  cafe_id text not null references public.cafes(id) on delete cascade,
  visit_count int not null default 0 check (visit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_key, cafe_id)
);

create index if not exists visit_counts_user_idx on public.visit_counts (user_key);

alter table public.visit_counts enable row level security;
drop policy if exists "visit_counts_all" on public.visit_counts;
create policy "visit_counts_all" on public.visit_counts
  for all using (true) with check (true);

create or replace function public.increment_visit_count(
  p_user_key text,
  p_cafe_id text,
  p_delta int default 1
)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  if p_user_key is null or length(trim(p_user_key)) = 0 then
    return 0;
  end if;
  if p_delta = 0 then
    select visit_count into v_count
    from public.visit_counts
    where user_key = p_user_key and cafe_id = p_cafe_id;
    return coalesce(v_count, 0);
  end if;

  insert into public.visit_counts (user_key, cafe_id, visit_count, updated_at)
  values (p_user_key, p_cafe_id, greatest(0, p_delta), now())
  on conflict (user_key, cafe_id) do update
    set visit_count = greatest(0, public.visit_counts.visit_count + excluded.visit_count),
        updated_at = now()
  returning visit_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_visit_count(text, text, int) to anon, authenticated;

-- take_in_seat / cancel 에 방문 카운트 연동 (기존 함수 교체)
create or replace function public.take_in_seat(
  p_cafe_id text,
  p_seat_no int,
  p_user_key text,
  p_timeout_minutes int default 10
)
returns jsonb
language plpgsql
security definer
as $$
declare
  row_seat public.seats%rowtype;
begin
  if p_user_key is null or length(trim(p_user_key)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'login_required');
  end if;

  perform public.release_expired_seat_reservations(p_timeout_minutes);

  if exists (
    select 1 from public.seats
    where cafe_id = p_cafe_id
      and status = 'reserved'
      and reserved_by = p_user_key
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_reserved');
  end if;

  update public.seats
  set
    status = 'reserved',
    reserved_by = p_user_key,
    reserved_at = now()
  where cafe_id = p_cafe_id
    and seat_no = p_seat_no
    and status = 'available'
  returning * into row_seat;

  if row_seat.id is null then
    return jsonb_build_object('ok', false, 'error', 'seat_unavailable');
  end if;

  -- completed(PoC): 테이크인 버튼 성공 = 방문 카운트 +1
  perform public.increment_visit_count(p_user_key, p_cafe_id, 1);

  return jsonb_build_object(
    'ok', true,
    'seat_no', row_seat.seat_no,
    'reserved_at', row_seat.reserved_at
  );
end;
$$;

create or replace function public.cancel_take_in_seat(
  p_cafe_id text,
  p_seat_no int,
  p_user_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  row_seat public.seats%rowtype;
begin
  update public.seats
  set
    status = 'available',
    reserved_by = null,
    reserved_at = null
  where cafe_id = p_cafe_id
    and seat_no = p_seat_no
    and status = 'reserved'
    and reserved_by = p_user_key
  returning * into row_seat;

  if row_seat.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- 취소된 테이크인은 completed 아님 → 카운트 -1
  perform public.increment_visit_count(p_user_key, p_cafe_id, -1);

  return jsonb_build_object('ok', true, 'seat_no', row_seat.seat_no);
end;
$$;

/*
-- 향후 AI/CCTV가 reserved→occupied 전환할 때 카운트하려면:
-- take_in_seat 의 increment 제거하고, 아래 트리거로 이동.

create or replace function public.on_seat_occupied_bump_visit()
returns trigger language plpgsql security definer as $$
begin
  if old.status = 'reserved'
     and new.status = 'occupied'
     and old.reserved_by is not null then
    perform public.increment_visit_count(old.reserved_by, old.cafe_id, 1);
  end if;
  return new;
end;
$$;
*/
