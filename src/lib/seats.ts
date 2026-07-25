import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bumpVisitCount } from './social';
import { supabase } from './supabase';

/**
 * 테이크인(reserved) 후 CCTV가 occupied로 바꾸지 않으면 available로 되돌리는 분 단위 타임아웃.
 * 카페 이용 패턴에 따라 팀이 조정 가능 (기본 10).
 * App 책임: reserved→available (timeout / cancel-takein-btn)
 * AI/CCTV 책임: reserved→occupied (실착석 감지 시 — 앱이 수행하지 않음)
 */
export const RESERVATION_TIMEOUT_MINUTES = 10;

/** 테이크인중 좌석 색 (여유/확인중/사용중과 구분되는 파란 계열) */
export const RESERVED_SEAT_COLOR = '#5B8DEF';

export type SeatStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'needs_check'
  | 'unavailable';

export type SeatCapacity = 1 | 2 | 4;

export type Seat = {
  seatNo: number;
  status: SeatStatus;
  /** 구역 — 없으면 "기타" */
  zone: string;
  /** 테이블 인원 */
  capacity: SeatCapacity;
  /** 콘센트 */
  hasOutlet: boolean;
  /** 표시 라벨 (T1…) */
  label: string;
  /** 테이크인한 user_key */
  reservedBy: string | null;
  /** 테이크인 시각(ms). 노쇼 타임아웃 기준 */
  reservedAt: number | null;
};

type SeatRow = {
  cafe_id: string;
  seat_no: number;
  status: SeatStatus;
  zone?: string | null;
  capacity?: number | null;
  has_outlet?: boolean | null;
  label?: string | null;
  reserved_by?: string | null;
  reserved_at?: string | null;
};

type SeatPartial = {
  seatNo: number;
  status: SeatStatus;
  zone?: string | null;
  capacity?: number | null;
  hasOutlet?: boolean | null;
  label?: string | null;
  reservedBy?: string | null;
  reservedAt?: number | null;
};

const ZONES = ['창가석', '중앙석', '카운터석'] as const;
const CAPACITIES: SeatCapacity[] = [1, 2, 4];
/** zone 메타 없을 때 UI 단일 그룹명 */
export const FALLBACK_ZONE = '전체 좌석';
const SEAT_SELECT =
  'seat_no,status,zone,capacity,has_outlet,label,reserved_by,reserved_at';

/**
 * TODO(AI팀): 실시간 좌석을 zone / capacity(1|2|4) / has_outlet / label 과 함께 내려주세요.
 * status만 오면 앱은 "전체 좌석" 단일 그룹으로 폴백합니다. capacity=2·태그 "2인석"도 포함 요청.
 * 제안 DDL: supabase/seats_zones.sql
 */

function normalizeCapacity(value: number | null | undefined, index: number): SeatCapacity {
  if (value === 1 || value === 2 || value === 4) return value;
  return CAPACITIES[index % CAPACITIES.length];
}

function parseReservedAt(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** reservedAt + timeout 지난 좌석을 available로 */
export function applyReservationTimeout(
  seats: Seat[],
  now = Date.now(),
  timeoutMinutes = RESERVATION_TIMEOUT_MINUTES
): Seat[] {
  const limitMs = timeoutMinutes * 60 * 1000;
  let changed = false;
  const next = seats.map((s) => {
    if (s.status !== 'reserved' || s.reservedAt == null) return s;
    if (now - s.reservedAt < limitMs) return s;
    changed = true;
    return { ...s, status: 'available' as const, reservedBy: null, reservedAt: null };
  });
  return changed ? next : seats;
}

/**
 * seatNo 순 정렬 후 라벨 부여.
 * inventZones=true(목업): 창가/중앙/카운터 샘플 구역
 * inventZones=false(실데이터 zone 없음): "전체 좌석" 단일 그룹
 */
export function enrichSeats(
  partials: SeatPartial[],
  opts?: { inventZones?: boolean }
): Seat[] {
  const sorted = [...partials].sort((a, b) => a.seatNo - b.seatNo);
  const total = sorted.length;
  const perZone = Math.max(1, Math.ceil(total / ZONES.length));
  const invent = opts?.inventZones === true;

  return applyReservationTimeout(
    sorted.map((partial, index) => {
      const trimmed = partial.zone?.trim();
      let zone: string;
      if (trimmed) zone = trimmed;
      else if (invent) zone = ZONES[Math.min(Math.floor(index / perZone), ZONES.length - 1)];
      else zone = FALLBACK_ZONE;

      return {
        seatNo: partial.seatNo,
        status: partial.status,
        zone,
        capacity: normalizeCapacity(partial.capacity, index),
        hasOutlet: partial.hasOutlet ?? index % 2 === 0,
        label: partial.label?.trim() || `T${index + 1}`,
        reservedBy: partial.reservedBy ?? null,
        reservedAt: partial.reservedAt ?? null,
      };
    })
  );
}

function rowToPartial(row: SeatRow): SeatPartial {
  return {
    seatNo: row.seat_no,
    status: row.status,
    zone: row.zone,
    capacity: row.capacity,
    hasOutlet: row.has_outlet,
    label: row.label,
    reservedBy: row.reserved_by ?? null,
    reservedAt: parseReservedAt(row.reserved_at),
  };
}

function seatToPartial(s: Seat): SeatPartial {
  return {
    seatNo: s.seatNo,
    status: s.status,
    zone: s.zone,
    capacity: s.capacity,
    hasOutlet: s.hasOutlet,
    label: s.label,
    reservedBy: s.reservedBy,
    reservedAt: s.reservedAt,
  };
}

export function groupSeatsByZone(seats: Seat[]): { zone: string; seats: Seat[] }[] {
  const list = Array.isArray(seats) ? seats : [];
  // zone 정보가 없거나 실질적으로 전부 동일하면 "전체 좌석" 단일 그룹
  const distinct = new Set(list.map((s) => s.zone || FALLBACK_ZONE));
  if (
    distinct.size <= 1 &&
    (distinct.has(FALLBACK_ZONE) || distinct.has('기타') || distinct.size === 0)
  ) {
    return [
      {
        zone: FALLBACK_ZONE,
        seats: [...list].sort((a, b) => a.seatNo - b.seatNo),
      },
    ];
  }

  const order = ['창가석', '중앙석', '카운터석', FALLBACK_ZONE, '기타'];
  const map = new Map<string, Seat[]>();
  for (const s of list) {
    const z = s.zone || FALLBACK_ZONE;
    const list = map.get(z) ?? [];
    list.push(s);
    map.set(z, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return keys.map((zone) => ({
    zone,
    seats: (map.get(zone) ?? []).sort((a, b) => a.seatNo - b.seatNo),
  }));
}

export function seatFeatureLabel(seat: Seat): string {
  const parts = [`${seat.capacity}인`];
  if (seat.hasOutlet) parts.push('콘센트');
  return parts.join(' · ');
}

export function findMyReservation(seats: Seat[], userKey: string | undefined): Seat | null {
  if (!userKey) return null;
  return (
    seats.find((s) => s.status === 'reserved' && s.reservedBy === userKey) ?? null
  );
}

export function pickFirstAvailableSeat(seats: Seat[]): Seat | null {
  return seats.find((s) => s.status === 'available') ?? null;
}

function buildMockSeats(total: number, available: number): Seat[] {
  return enrichSeats(
    Array.from({ length: total }, (_, i) => {
      const seatNo = i + 1;
      let status: SeatStatus;
      if (i < available) {
        status = i % 7 === 0 && i > 0 ? 'needs_check' : 'available';
      } else {
        status = 'occupied';
      }
      return { seatNo, status };
    }),
    { inventZones: true }
  );
}

/** DB에 만료 reserved 정리 요청 (실패해도 무시) */
export async function releaseExpiredReservationsRemote(
  timeoutMinutes = RESERVATION_TIMEOUT_MINUTES
): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('release_expired_seat_reservations', {
    p_timeout_minutes: timeoutMinutes,
  });
}

export type TakeInResult =
  | { ok: true; seatNo: number }
  | { ok: false; error: 'login_required' | 'already_reserved' | 'seat_unavailable' | 'unknown' };

/**
 * 좌석 테이크인 (GPS 체크인과 별개 — 좌석 현황용 reserved)
 */
export async function takeInSeat(
  cafeId: string,
  seatNo: number,
  userKey: string,
  localSeats?: Seat[]
): Promise<{ result: TakeInResult; seats?: Seat[] }> {
  if (!userKey) return { result: { ok: false, error: 'login_required' } };

  if (!supabase) {
    if (!localSeats) return { result: { ok: false, error: 'unknown' } };
    const timed = applyReservationTimeout(localSeats);
    if (findMyReservation(timed, userKey)) {
      return { result: { ok: false, error: 'already_reserved' }, seats: timed };
    }
    const target = timed.find((s) => s.seatNo === seatNo);
    if (!target || target.status !== 'available') {
      return { result: { ok: false, error: 'seat_unavailable' }, seats: timed };
    }
    const now = Date.now();
    const seats = timed.map((s) =>
      s.seatNo === seatNo
        ? {
            ...s,
            status: 'reserved' as const,
            reservedBy: userKey,
            reservedAt: now,
          }
        : s
    );
    await bumpVisitCount(cafeId, userKey, 1);
    return { result: { ok: true, seatNo }, seats };
  }

  const { data, error } = await supabase.rpc('take_in_seat', {
    p_cafe_id: cafeId,
    p_seat_no: seatNo,
    p_user_key: userKey,
    p_timeout_minutes: RESERVATION_TIMEOUT_MINUTES,
  });

  if (error) {
    console.warn('[takein] rpc failed:', error.message);
    return { result: { ok: false, error: 'unknown' } };
  }

  const payload = data as { ok?: boolean; error?: string; seat_no?: number } | null;
  if (!payload?.ok) {
    const err = payload?.error;
    if (err === 'already_reserved' || err === 'seat_unavailable' || err === 'login_required') {
      return { result: { ok: false, error: err } };
    }
    return { result: { ok: false, error: 'unknown' } };
  }

  return { result: { ok: true, seatNo: payload.seat_no ?? seatNo } };
}

export async function cancelTakeInSeat(
  cafeId: string,
  seatNo: number,
  userKey: string,
  localSeats?: Seat[]
): Promise<{ ok: boolean; seats?: Seat[] }> {
  if (!userKey) return { ok: false };

  if (!supabase) {
    if (!localSeats) return { ok: false };
    const seats = localSeats.map((s) =>
      s.seatNo === seatNo && s.status === 'reserved' && s.reservedBy === userKey
        ? { ...s, status: 'available' as const, reservedBy: null, reservedAt: null }
        : s
    );
    const changed = seats.some(
      (s, i) => s.status !== localSeats[i].status || s.reservedBy !== localSeats[i].reservedBy
    );
    if (changed) await bumpVisitCount(cafeId, userKey, -1);
    return { ok: changed, seats };
  }

  const { data, error } = await supabase.rpc('cancel_take_in_seat', {
    p_cafe_id: cafeId,
    p_seat_no: seatNo,
    p_user_key: userKey,
  });
  if (error) {
    console.warn('[takein] cancel rpc failed:', error.message);
    return { ok: false };
  }
  const payload = data as { ok?: boolean } | null;
  return { ok: !!payload?.ok };
}

export type UseSeatsResult = {
  seats: Seat[];
  myReservation: Seat | null;
  takeIn: (seatNo: number, userKey: string) => Promise<TakeInResult>;
  cancelTakeIn: (userKey: string) => Promise<boolean>;
};

/**
 * 카페의 좌석별 상태.
 * - Supabase: DB 로드 + realtime
 * - 목업: 로컬 상태 (테이크인/취소/타임아웃 반영)
 *
 * 참고: GPS 체크인(방문 인증)과 테이크인(좌석 reserved)은 별개.
 */
export function useSeats(
  cafeId: string | undefined,
  fallback: { total: number; available: number },
  userKey?: string
): UseSeatsResult {
  const [seats, setSeats] = useState<Seat[]>(() =>
    buildMockSeats(fallback.total, fallback.available)
  );
  const seatsRef = useRef(seats);
  seatsRef.current = seats;

  // cafe / fallback 변경 시 목업 재생성 (라이브 로드 전)
  useEffect(() => {
    if (!cafeId) return;
    if (supabase) return;
    setSeats(buildMockSeats(fallback.total, fallback.available));
  }, [cafeId, fallback.total, fallback.available]);

  useEffect(() => {
    if (!cafeId || !supabase) return;
    let cancelled = false;

    (async () => {
      await releaseExpiredReservationsRemote();
      if (cancelled) return;

      const { data, error } = await supabase
        .from('seats')
        .select(SEAT_SELECT)
        .eq('cafe_id', cafeId)
        .order('seat_no');

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        if (error) {
          const retry = await supabase
            .from('seats')
            .select('seat_no,status')
            .eq('cafe_id', cafeId)
            .order('seat_no');
          if (cancelled || retry.error || !retry.data || retry.data.length === 0) return;
          setSeats(
            enrichSeats(
              retry.data.map((r) => ({
                seatNo: r.seat_no,
                status: r.status as SeatStatus,
              }))
            )
          );
        }
        return;
      }
      setSeats(enrichSeats((data as SeatRow[]).map(rowToPartial)));
    })();

    const channel = supabase
      .channel(`seats-${cafeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `cafe_id=eq.${cafeId}`,
        },
        (payload) => {
          const row = payload.new as SeatRow;
          if (!row?.seat_no) return;
          console.log(`[supabase] 좌석 ${row.seat_no}번 → ${row.status}`);
          setSeats((prev) => {
            const nextPartials = prev.map((s) =>
              s.seatNo === row.seat_no ? rowToPartial(row) : seatToPartial(s)
            );
            // 신규 seat_no면 추가
            if (!prev.some((s) => s.seatNo === row.seat_no)) {
              nextPartials.push(rowToPartial(row));
            }
            return enrichSeats(nextPartials);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, [cafeId]);

  // 클라이언트 노쇼 타임아웃 폴링 (목업 + UI 즉시 반영)
  useEffect(() => {
    const tick = () => {
      setSeats((prev) => applyReservationTimeout(prev));
    };
    const id = setInterval(tick, 15_000);
    tick();
    return () => clearInterval(id);
  }, []);

  // 라이브: 주기적으로 DB 만료 스캔 (pg_cron 없을 때 보완)
  useEffect(() => {
    if (!supabase) return;
    const id = setInterval(() => {
      releaseExpiredReservationsRemote().catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const takeIn = useCallback(
    async (seatNo: number, key: string): Promise<TakeInResult> => {
      if (!cafeId) return { ok: false, error: 'unknown' };
      const { result, seats: next } = await takeInSeat(
        cafeId,
        seatNo,
        key,
        seatsRef.current
      );
      if (next) setSeats(next);
      else if (result.ok) {
        const now = Date.now();
        setSeats((prev) =>
          applyReservationTimeout(
            prev.map((s) =>
              s.seatNo === seatNo
                ? {
                    ...s,
                    status: 'reserved' as const,
                    reservedBy: key,
                    reservedAt: now,
                  }
                : s
            )
          )
        );
      }
      return result;
    },
    [cafeId]
  );

  const cancelTakeIn = useCallback(
    async (key: string): Promise<boolean> => {
      if (!cafeId) return false;
      const mine = findMyReservation(seatsRef.current, key);
      if (!mine) return false;
      const { ok, seats: next } = await cancelTakeInSeat(
        cafeId,
        mine.seatNo,
        key,
        seatsRef.current
      );
      if (next) setSeats(next);
      else if (ok) {
        setSeats((prev) =>
          prev.map((s) =>
            s.seatNo === mine.seatNo
              ? { ...s, status: 'available', reservedBy: null, reservedAt: null }
              : s
          )
        );
      }
      return ok;
    },
    [cafeId]
  );

  const myReservation = useMemo(
    () => findMyReservation(seats, userKey),
    [seats, userKey]
  );

  return { seats, myReservation, takeIn, cancelTakeIn };
}
