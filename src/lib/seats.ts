import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type SeatStatus = 'available' | 'occupied' | 'needs_check' | 'unavailable';

export type Seat = {
  seatNo: number;
  status: SeatStatus;
};

type SeatRow = {
  cafe_id: string;
  seat_no: number;
  status: SeatStatus;
};

/**
 * 카페의 좌석별 상태. Supabase 연결 시 DB에서 로드하고 실시간 구독,
 * 목업 모드에서는 좌석 수 기반으로 생성한다.
 */
export function useSeats(
  cafeId: string | undefined,
  fallback: { total: number; available: number }
): Seat[] {
  const [seats, setSeats] = useState<Seat[] | null>(null);

  useEffect(() => {
    if (!cafeId || !supabase) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('seats')
        .select('seat_no,status')
        .eq('cafe_id', cafeId)
        .order('seat_no');
      if (cancelled || error || !data || data.length === 0) return;
      setSeats(data.map((r) => ({ seatNo: r.seat_no, status: r.status as SeatStatus })));
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
            if (!prev) return prev;
            return prev.map((s) =>
              s.seatNo === row.seat_no ? { ...s, status: row.status } : s
            );
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, [cafeId]);

  if (seats) return seats;

  // 목업 폴백: 앞에서부터 available 채움
  return Array.from({ length: fallback.total }, (_, i) => ({
    seatNo: i + 1,
    status: (i < fallback.available ? 'available' : 'occupied') as SeatStatus,
  }));
}
