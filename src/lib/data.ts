import rawCafes from './cafes.json';
import { TAG_POOL } from '../constants/amenities';
import type { Congestion } from './theme';

export type Cafe = {
  id: string;
  name: string;
  seatsTotal: number;
  seatsAvailable: number;
  walkMin: number;
  lastUpdated: number; // epoch ms
  tags: string[]; // 필터 태그
  address: string;
  category: string;
  region: string;
  lat: number;
  lng: number;
  placeId: string;
  naverMapUrl: string;
  hoursWeekday: string;
  hoursWeekend: string;
  noise: '조용함' | '보통' | '활기참';
  nearby: boolean; // 주변 카페 리스트 노출 여부
  likeCount: number;
  /** 좌석 현황 판정의 기준 (seatStatus). DB 미연결 시에는 항상 null */
  congestion: Congestion;
  /**
   * 영업 여부 (목업/API 매핑).
   * - true/false: 명시 상태
   * - null: 정보 없음 → CLOSED UI 미표시
   * - undefined: hoursWeekday/Weekend·businessHours로 계산
   */
  isOpen?: boolean | null;
  /** 0=Sun…6=Sat, null=그날 휴무 (API 연동 시) */
  businessHours?: (string | null)[] | null;
  /** 정기휴무 요일 */
  regularHoliday?: number[] | null;
  // 목업 지도용 위치 (% 좌표, Expo Go 폴백)
  mapX: number;
  mapY: number;
};

// 기준점: 서울대입구역 2호선
export const MAP_CENTER = { lat: 37.481247, lng: 126.952739 };

// 지도 초기 카메라 (전체 카페가 대략 들어오는 줌)
export const INITIAL_CAMERA = {
  latitude: MAP_CENTER.lat,
  longitude: MAP_CENTER.lng,
  zoom: 14.5,
};

const WALK_M_PER_MIN = 70; // 도보 속도 약 4.2km/h

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// placeId 기반 결정적 시드 (실제 좌석 데이터 연동 전 목업)
function seedFrom(placeId: string): number {
  let h = 0;
  for (let i = 0; i < placeId.length; i++) {
    h = (h * 31 + placeId.charCodeAt(i)) >>> 0;
  }
  return h;
}

const HOURS = [
  { wd: '09:00 - 22:00', we: '10:00 - 22:00' },
  { wd: '08:30 - 21:00', we: '10:00 - 21:00' },
  { wd: '10:00 - 23:00', we: '10:00 - 23:00' },
  { wd: '11:00 - 21:00', we: '11:00 - 21:00' },
];

const NOISE: Cafe['noise'][] = ['조용함', '보통', '활기참'];

// 목업 지도 좌표 정규화 범위
const LAT_MIN = 37.465;
const LAT_MAX = 37.486;
const LNG_MIN = 126.93;
const LNG_MAX = 126.97;

const now = Date.now();

export const INITIAL_CAFES: Cafe[] = (rawCafes as any[]).map((raw) => {
  const seed = seedFrom(String(raw.placeId));
  const seatsTotal = 8 + (seed % 13); // 8~20석
  const seatsAvailable = (seed >>> 3) % (seatsTotal + 1);
  const distM = haversineM(MAP_CENTER.lat, MAP_CENTER.lng, raw.lat, raw.lng);
  const walkMin = Math.max(1, Math.round(distM / WALK_M_PER_MIN));
  const tags = TAG_POOL.filter((_, i) => (seed >>> (i + 4)) & 1);
  if (tags.length === 0) tags.push('노트북 작업');
  const hours = HOURS[seed % HOURS.length];
  // 목업: ~1/7 휴무, ~1/17 정보없음, 나머지 영업중(명시)
  const isOpen: boolean | null =
    seed % 17 === 0 ? null : seed % 7 === 0 ? false : true;

  return {
    id: raw.id,
    name: raw.name,
    seatsTotal,
    seatsAvailable,
    walkMin,
    lastUpdated: now - (seed % 10) * 60 * 1000,
    tags,
    address: raw.address,
    category: raw.category,
    region: raw.region,
    lat: raw.lat,
    lng: raw.lng,
    placeId: String(raw.placeId),
    naverMapUrl: raw.naverMapUrl,
    hoursWeekday: hours.wd,
    hoursWeekend: hours.we,
    noise: NOISE[seed % 3],
    nearby: walkMin <= 10,
    likeCount: (seed >>> 5) % 24,
    // 목업에는 혼잡도 정보가 없다 → 전부 자리 있음으로 읽힌다
    congestion: null,
    isOpen,
    mapX: ((raw.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100,
    mapY: (1 - (raw.lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100,
  };
});

/** Supabase cafes 테이블 row → 앱 Cafe 변환 */
export function cafeFromRow(row: {
  id: string;
  name: string;
  address: string;
  category: string;
  region: string;
  lat: number;
  lng: number;
  place_id: string;
  naver_map_url: string;
  seats_total: number;
  seats_available: number;
  tags: string[];
  noise: '조용함' | '보통' | '활기참';
  hours_weekday: string;
  hours_weekend: string;
  last_updated: string;
  like_count?: number;
  congestion?: Congestion;
}): Cafe {
  const distM = haversineM(MAP_CENTER.lat, MAP_CENTER.lng, row.lat, row.lng);
  const walkMin = Math.max(1, Math.round(distM / WALK_M_PER_MIN));
  return {
    id: row.id,
    name: row.name,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    walkMin,
    lastUpdated: new Date(row.last_updated).getTime(),
    tags: row.tags ?? [],
    address: row.address,
    category: row.category,
    region: row.region,
    lat: row.lat,
    lng: row.lng,
    placeId: row.place_id,
    naverMapUrl: row.naver_map_url,
    hoursWeekday: row.hours_weekday,
    hoursWeekend: row.hours_weekend,
    noise: row.noise,
    nearby: walkMin <= 10,
    likeCount: row.like_count ?? 0,
    congestion: row.congestion ?? null,
    // 네이버 Place API 연동 전: 평일/주말 문자열로 유틸 계산 (isOpen undefined)
    isOpen: undefined,
    mapX: ((row.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100,
    mapY: (1 - (row.lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100,
  };
}

export function updatedLabel(lastUpdated: number, nowMs: number): string {
  const diffMin = Math.floor((nowMs - lastUpdated) / 60000);
  if (diffMin < 1) return '방금 전 업데이트';
  if (diffMin < 60) return `${diffMin}분 전 업데이트`;
  return `${Math.floor(diffMin / 60)}시간 전 업데이트`;
}
