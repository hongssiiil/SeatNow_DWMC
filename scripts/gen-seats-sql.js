// supabase/seats.sql 생성기 — 좌석 테이블 + 카운트 동기화 트리거 + 시드
// 사용법: node scripts/gen-seats-sql.js
const fs = require('fs');
const path = require('path');

const cafes = require('../src/lib/cafes.json');

// setup.sql과 동일한 결정적 좌석 수 로직
function seedFrom(placeId) {
  let h = 0;
  for (let i = 0; i < placeId.length; i++) h = (h * 31 + placeId.charCodeAt(i)) >>> 0;
  return h;
}

const rows = [];
for (const raw of cafes) {
  const seed = seedFrom(String(raw.placeId));
  const seatsTotal = 8 + (seed % 13);
  const seatsAvailable = (seed >>> 3) % (seatsTotal + 1);
  for (let n = 1; n <= seatsTotal; n++) {
    const status = n <= seatsAvailable ? 'available' : 'occupied';
    rows.push(`('${raw.id}',${n},'${status}')`);
  }
}

const sql = `-- ─────────────────────────────────────────────────────────
-- Take In 좌석(seats) 테이블 — 좌석별 실시간 상태
-- Supabase 대시보드 → SQL Editor에 전체 붙여넣고 Run
-- 여러 번 실행해도 안전 (idempotent)
-- ─────────────────────────────────────────────────────────

-- 1. 좌석 테이블
create table if not exists public.seats (
  id bigint generated always as identity primary key,
  cafe_id text not null references public.cafes(id) on delete cascade,
  seat_no int not null,
  status text not null default 'available'
    check (status in ('available','occupied','needs_check','unavailable')),
  updated_at timestamptz not null default now(),
  unique (cafe_id, seat_no)
);

create index if not exists seats_cafe_idx on public.seats(cafe_id);

-- 2. RLS: 누구나 조회 가능 (변경은 사장님 앱/대시보드에서)
alter table public.seats enable row level security;
drop policy if exists "seats_select_all" on public.seats;
create policy "seats_select_all" on public.seats for select using (true);

-- 3. 좌석 변경 시 cafes 카운트 자동 동기화 트리거
create or replace function public.sync_cafe_seat_count()
returns trigger
language plpgsql
security definer
as $$
declare
  target_cafe text := coalesce(new.cafe_id, old.cafe_id);
begin
  update public.cafes c set
    seats_total = (select count(*) from public.seats s where s.cafe_id = target_cafe),
    seats_available = (select count(*) from public.seats s
                       where s.cafe_id = target_cafe and s.status = 'available'),
    last_updated = now()
  where c.id = target_cafe;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_seats_sync on public.seats;
create trigger trg_seats_sync
after insert or update or delete on public.seats
for each row execute function public.sync_cafe_seat_count();

-- 4. updated_at 자동 갱신
create or replace function public.touch_seat_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_seats_touch on public.seats;
create trigger trg_seats_touch
before update on public.seats
for each row execute function public.touch_seat_updated_at();

-- 5. Realtime 활성화
do $$
begin
  alter publication supabase_realtime add table public.seats;
exception when duplicate_object then null;
end $$;

-- 6. 좌석 시드 (${rows.length}석 — 카페 129곳, 기존 seats_available와 일치)
insert into public.seats (cafe_id, seat_no, status)
values
${rows.join(',\n')}
on conflict (cafe_id, seat_no) do nothing;
`;

const out = path.join(__dirname, '..', 'supabase', 'seats.sql');
fs.writeFileSync(out, sql);
console.log('wrote', out, `(${rows.length} seats)`);
