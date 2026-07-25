-- ─────────────────────────────────────────────────────────
-- Seats zone / table metadata (AI팀 공유 스키마 제안)
-- 기존 seats 테이블에 컬럼 추가. 여러 번 실행해도 안전.
-- 테이크인(reserved) 컬럼·RPC는 seat_reservations.sql 참고.
--
-- TODO(AI팀 요청):
-- 1) 실시간 좌석 피드에 zone / capacity(1|2|4) / has_outlet / label 포함
--    (status만 오면 앱은 "전체 좌석" 단일 그룹으로 폴백)
-- 2) capacity=2 및 카페 태그 "2인석" 포함
--    (src/lib/cafes.json에는 2인 관련 필드가 현재 없음)
-- ─────────────────────────────────────────────────────────

alter table public.seats
  add column if not exists zone text not null default '기타';

alter table public.seats
  add column if not exists capacity int not null default 2
    check (capacity in (1, 2, 4));

alter table public.seats
  add column if not exists has_outlet boolean not null default false;

alter table public.seats
  add column if not exists label text; -- 표시용 (예: T1). null이면 seat_no 기반

comment on column public.seats.zone is '구역명: 창가석 / 중앙석 / 카운터석 / 기타';
comment on column public.seats.capacity is '테이블 인원: 1 | 2 | 4';
comment on column public.seats.has_outlet is '콘센트 유무';
comment on column public.seats.label is 'UI 라벨 (T1…). null이면 T{seat_no}';

/*
═══════════════════════════════════════════════════════════
AI / CCTV 팀 REQUIRED coordination (handoff)
═══════════════════════════════════════════════════════════

status values (English names — use consistently):
  available   — 여유 (#6FCF97)
  reserved    — 테이크인중 (#5B8DEF)  ※ 앱 유저가 좌석 점유 예정
  needs_check — 확인중 (#F2C94C)
  occupied    — 사용중, CCTV 실착석 (#EB5757)
  unavailable — 사용 불가 (UI상 사용중과 동일 처리 가능)

Suggested row shape:
{
  cafe_id: string;
  seat_no: number;
  status: 'available' | 'reserved' | 'occupied' | 'needs_check' | 'unavailable';
  zone: string;                 // "창가석" | "중앙석" | "카운터석" | "기타"
  capacity: 1 | 2 | 4;
  has_outlet: boolean;
  label?: string | null;        // "T1"
  reserved_by?: string | null;  // user_key when status=reserved (내부용, UI 비노출)
  reserved_at?: string | null;  // ISO timestamptz — 노쇼 타임아웃 기준
}

Ownership of status transitions:
  [App]
    - take-in → status=reserved, set reserved_by / reserved_at
    - cancel-takein-btn / timeout → status=available, clear reserved_*
    - RESERVATION_TIMEOUT_MINUTES (default 10, tunable by product/ops)

  [AI / CCTV — REQUIRED]
    - When CCTV recognizes a person at a reserved table:
        MUST set status = 'occupied'
        SHOULD clear reserved_by / reserved_at (or keep for audit — team choice)
    - App does NOT perform reserved → occupied.
    - Without this handoff, reserved seats only expire back to available.

Privacy:
  - Other users must only see status label "테이크인중".
  - Never expose reserved_by / nickname on table-card UI.

Check-in vs Take-in (do not conflate):
  - check-in (GPS): "나 이 카페에 있어요" → 리뷰 작성 자격
  - take-in (reserved): "나 이 좌석 쓸 거예요" → 실시간 좌석 현황
  - Currently independent; linking is a product decision for later.

RPC (see seat_reservations.sql):
  release_expired_seat_reservations(p_timeout_minutes)
  take_in_seat(p_cafe_id, p_seat_no, p_user_key, p_timeout_minutes)
  cancel_take_in_seat(p_cafe_id, p_seat_no, p_user_key)
*/
