-- ─────────────────────────────────────────────────────────
-- Seat take-in (reserved) + no-show auto release
-- Supabase SQL Editor에 붙여넣고 Run (idempotent)
--
-- English names: reserved, reserved_by, reserved_at,
--   RESERVATION_TIMEOUT_MINUTES (app const, default 10)
--
-- AI / CCTV REQUIRED handoff:
--   When CCTV sees a person at a reserved table → set status='occupied'
--   (clear reserved_by/reserved_at preferred). App never does reserved→occupied.
--   App only does reserved→available on timeout or cancel_take_in_seat.
-- Privacy: reserved_by is internal; UI shows only "테이크인중".
-- Full schema notes: seats_zones.sql
-- ─────────────────────────────────────────────────────────

-- 1. reserved 메타 컬럼
alter table public.seats
  add column if not exists reserved_by text;

alter table public.seats
  add column if not exists reserved_at timestamptz;

comment on column public.seats.reserved_by is
  '테이크인한 user_key (status=reserved). UI 비노출 — 내부/본인 취소용';
comment on column public.seats.reserved_at is
  '테이크인 시각. RESERVATION_TIMEOUT_MINUTES(기본 10, 팀 조정 가능) 노쇼 기준. CCTV가 occupied로 바꾸면 clear 권장';

-- 2. status 체크에 reserved 추가
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.seats'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if cname is not null then
    execute format('alter table public.seats drop constraint %I', cname);
  end if;
end $$;

alter table public.seats
  add constraint seats_status_check
  check (status in ('available', 'occupied', 'needs_check', 'unavailable', 'reserved'));

-- 3. 만료된 reserved → available
create or replace function public.release_expired_seat_reservations(
  p_timeout_minutes int default 10
)
returns int
language plpgsql
security definer
as $$
declare
  released int;
begin
  update public.seats
  set
    status = 'available',
    reserved_by = null,
    reserved_at = null
  where status = 'reserved'
    and reserved_at is not null
    and reserved_at < now() - make_interval(mins => p_timeout_minutes);

  get diagnostics released = row_count;
  return released;
end;
$$;

-- 4. 테이크인: available → reserved (원자적)
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

  -- 이미 이 카페에 활성 테이크인이 있으면 거부
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

  return jsonb_build_object(
    'ok', true,
    'seat_no', row_seat.seat_no,
    'reserved_at', row_seat.reserved_at
  );
end;
$$;

-- 5. 테이크인 취소: 본인 reserved만 available로
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

  return jsonb_build_object('ok', true, 'seat_no', row_seat.seat_no);
end;
$$;

grant execute on function public.release_expired_seat_reservations(int) to anon, authenticated;
grant execute on function public.take_in_seat(text, int, text, int) to anon, authenticated;
grant execute on function public.cancel_take_in_seat(text, int, text) to anon, authenticated;

-- 선택: pg_cron이 있으면 환경이면 1분마다 만료 스캔
-- select cron.schedule('release-expired-seat-reservations', '* * * * *',
--   $$select public.release_expired_seat_reservations(10)$$);
