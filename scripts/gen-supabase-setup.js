// supabase/setup.sql 생성기 — 스키마 + RLS + Realtime + 카페 129곳 시드
// 사용법: node scripts/gen-supabase-setup.js
const fs = require('fs');
const path = require('path');

const cafes = require('../src/lib/cafes.json');

// src/lib/data.ts와 동일한 결정적 시드 로직 (초기 목업 좌석값)
function seedFrom(placeId) {
  let h = 0;
  for (let i = 0; i < placeId.length; i++) h = (h * 31 + placeId.charCodeAt(i)) >>> 0;
  return h;
}
const TAG_POOL = [
  '콘센트', '1인석', '소파석', '4인석', '내부 화장실',
  '조용한', '주차 가능', '시간제한 없음', '노트북 작업',
];
const HOURS = [
  { wd: '09:00 - 22:00', we: '10:00 - 22:00' },
  { wd: '08:30 - 21:00', we: '10:00 - 21:00' },
  { wd: '10:00 - 23:00', we: '10:00 - 23:00' },
  { wd: '11:00 - 21:00', we: '11:00 - 21:00' },
];
const NOISE = ['조용함', '보통', '활기참'];

const esc = (s) => String(s).replace(/'/g, "''");

const rows = cafes.map((raw) => {
  const seed = seedFrom(String(raw.placeId));
  const seatsTotal = 8 + (seed % 13);
  const seatsAvailable = (seed >>> 3) % (seatsTotal + 1);
  const tags = TAG_POOL.filter((_, i) => (seed >>> (i + 4)) & 1);
  if (tags.length === 0) tags.push('노트북 작업');
  const hours = HOURS[seed % HOURS.length];
  const noise = NOISE[seed % 3];
  const tagsArr = `ARRAY[${tags.map((t) => `'${esc(t)}'`).join(',')}]::text[]`;
  return `('${esc(raw.id)}','${esc(raw.name)}','${esc(raw.address)}','${esc(raw.category)}','${esc(raw.region)}',${raw.lat},${raw.lng},'${esc(raw.placeId)}','${esc(raw.naverMapUrl)}',${seatsTotal},${seatsAvailable},${tagsArr},'${noise}','${hours.wd}','${hours.we}',now())`;
});

const sql = `-- ─────────────────────────────────────────────────────────
-- Take In (자리나우) Supabase 초기 설정
-- Supabase 대시보드 → SQL Editor → New query에 전체 붙여넣고 Run
-- 여러 번 실행해도 안전 (idempotent)
-- ─────────────────────────────────────────────────────────

-- 1. 테이블
create table if not exists public.cafes (
  id text primary key,
  name text not null,
  address text not null,
  category text not null default '카페',
  region text not null default '',
  lat double precision not null,
  lng double precision not null,
  place_id text not null,
  naver_map_url text not null,
  seats_total int not null default 10,
  seats_available int not null default 0,
  tags text[] not null default '{}',
  noise text not null default '보통',
  hours_weekday text not null default '09:00 - 22:00',
  hours_weekend text not null default '10:00 - 22:00',
  last_updated timestamptz not null default now()
);

create table if not exists public.favorites (
  user_key text not null,
  cafe_id text not null references public.cafes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_key, cafe_id)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  user_name text not null default '',
  cafe_id text not null references public.cafes(id) on delete cascade,
  seat_no int,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

-- 2. RLS
alter table public.cafes enable row level security;
alter table public.favorites enable row level security;
alter table public.reservations enable row level security;

-- 카페: 누구나 조회 가능
drop policy if exists "cafes_select_all" on public.cafes;
create policy "cafes_select_all" on public.cafes for select using (true);

-- MVP 단계: 즐겨찾기/예약은 anon으로 읽기·쓰기 허용
-- TODO: Supabase Auth 도입 시 user_key = auth.uid() 조건으로 강화
drop policy if exists "favorites_all" on public.favorites;
create policy "favorites_all" on public.favorites for all using (true) with check (true);

drop policy if exists "reservations_all" on public.reservations;
create policy "reservations_all" on public.reservations for all using (true) with check (true);

-- 3. Realtime 활성화 (cafes 변경을 앱이 실시간 구독)
do $$
begin
  alter publication supabase_realtime add table public.cafes;
exception when duplicate_object then null;
end $$;

-- 4. 카페 시드 데이터 (서울대입구·낙성대 100곳 + 대학동 29곳)
insert into public.cafes
  (id, name, address, category, region, lat, lng, place_id, naver_map_url,
   seats_total, seats_available, tags, noise, hours_weekday, hours_weekend, last_updated)
values
${rows.join(',\n')}
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  category = excluded.category,
  region = excluded.region,
  lat = excluded.lat,
  lng = excluded.lng,
  place_id = excluded.place_id,
  naver_map_url = excluded.naver_map_url;
-- (좌석 수는 운영 데이터라 재실행 시 덮어쓰지 않음)
`;

const out = path.join(__dirname, '..', 'supabase', 'setup.sql');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql);
console.log('wrote', out, `(${cafes.length} cafes)`);
