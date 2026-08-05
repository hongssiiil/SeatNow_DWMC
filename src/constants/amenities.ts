import type { Cafe } from '../lib/data';
import { seatStatus } from '../lib/theme';

/** Amenity category keys (English layer names) */
export type AmenityCategory =
  | 'seat-type'
  | 'noise-level'
  | 'facility'
  | 'time-limit'
  | 'congestion-filter';

export type Amenity = {
  id: string;
  label: string;
  category: AmenityCategory;
  /** tag string on cafe.tags, or noise/congestion match key */
  match: string;
  icon?: string;
  iconSet?: 'ion' | 'mci';
  /** congestion chip accent */
  accent?: string;
};

/**
 * 실제 데이터 전수 조사 결과 (supabase/setup.sql 시드 + data.ts TAG_POOL)
 * tags: 1인석, 4인석, 소파석, 콘센트, 내부 화장실, 조용한, 주차 가능, 시간제한 없음, 노트북 작업
 * noise: 조용함, 보통, 활기참
 *
 * NOTE (AI팀 요청):
 * - `src/lib/cafes.json`에는 편의시설/`2인` 관련 필드가 없음 (id/name/address/…만 존재).
 * - 좌석 유형에 "2인석" UI는 추가했으나, 카페 태그·좌석 capacity 데이터에
 *   2인석 정보가 없으면 필터/상세에 노출되지 않음 → AI팀에 좌석 capacity=2 및
 *   카페 태그 "2인석" 포함 요청 필요.
 */
export const AMENITIES: Amenity[] = [
  // seat-type — 표시 순서: 1인석 / 2인석 / 4인석 / 소파석
  {
    id: 'seat-1',
    label: '1인석',
    category: 'seat-type',
    match: '1인석',
    icon: 'person-outline',
    iconSet: 'ion',
  },
  {
    id: 'seat-2',
    label: '2인석',
    category: 'seat-type',
    match: '2인석',
    icon: 'people-outline',
    iconSet: 'ion',
  },
  {
    id: 'seat-4',
    label: '4인석',
    category: 'seat-type',
    match: '4인석',
    icon: 'people-outline',
    iconSet: 'ion',
  },
  {
    id: 'seat-sofa',
    label: '소파석',
    category: 'seat-type',
    match: '소파석',
    icon: 'sofa-outline',
    iconSet: 'mci',
  },

  // noise-level (cafe.noise) — 태그 '조용한'도 조용함으로 매칭
  {
    id: 'noise-quiet',
    label: '조용함',
    category: 'noise-level',
    match: '조용함',
    icon: 'moon-outline',
    iconSet: 'ion',
  },
  {
    id: 'noise-normal',
    label: '보통',
    category: 'noise-level',
    match: '보통',
    icon: 'volume-medium-outline',
    iconSet: 'ion',
  },
  {
    id: 'noise-lively',
    label: '활기참',
    category: 'noise-level',
    match: '활기참',
    icon: 'musical-notes-outline',
    iconSet: 'ion',
  },

  // facility / outlet & extras
  {
    id: 'outlet',
    label: '콘센트',
    category: 'facility',
    match: '콘센트',
    icon: 'power-plug-outline',
    iconSet: 'mci',
  },
  {
    id: 'toilet',
    label: '내부 화장실',
    category: 'facility',
    match: '내부 화장실',
    icon: 'human-male-female',
    iconSet: 'mci',
  },
  {
    id: 'parking',
    label: '주차 가능',
    category: 'facility',
    match: '주차 가능',
    icon: 'parking',
    iconSet: 'mci',
  },
  {
    id: 'laptop',
    label: '노트북 작업',
    category: 'facility',
    match: '노트북 작업',
    icon: 'laptop-outline',
    iconSet: 'ion',
  },

  // time-limit
  {
    id: 'no-time-limit',
    label: '시간제한 없음',
    category: 'time-limit',
    match: '시간제한 없음',
    icon: 'time-outline',
    iconSet: 'ion',
  },

  // congestion-filter (seatStatus) — 자리 있음 / 만석 2단계
  {
    id: 'congestion-good',
    label: '자리 있음',
    category: 'congestion-filter',
    match: 'available',
    accent: '#6FCF97',
  },
  {
    id: 'congestion-bad',
    label: '만석',
    category: 'congestion-filter',
    match: 'full',
    accent: '#EB5757',
  },
];

/** mock 시드용 태그 풀 (noise/congestion 제외) */
export const TAG_POOL = AMENITIES.filter(
  (a) => a.category !== 'noise-level' && a.category !== 'congestion-filter'
).map((a) => a.match);

export function cafeHasAmenity(cafe: Cafe, amenity: Amenity): boolean {
  if (amenity.category === 'congestion-filter') {
    return seatStatus(cafe.congestion) === amenity.match;
  }
  if (amenity.category === 'noise-level') {
    if (cafe.noise === amenity.match) return true;
    // 시드 태그 '조용한' ↔ noise '조용함'
    if (amenity.match === '조용함' && cafe.tags.includes('조용한')) return true;
    return false;
  }
  return cafe.tags.includes(amenity.match);
}

/** CafeDetail 편의시설에 노출할 태그 (혼잡도 제외) */
export function getCafeAmenityTags(cafe: Cafe): Amenity[] {
  return AMENITIES.filter(
    (a) => a.category !== 'congestion-filter' && cafeHasAmenity(cafe, a)
  );
}
