export const colors = {
  // 배경/서피스
  bg: '#F4F3EC',
  card: '#FFFFFF',
  border: '#E8E6DA',
  divider: '#F0EEE4',

  // 텍스트
  ink: '#1F3A2D', // 진한 녹색 (제목)
  text: '#2E4A3A',
  sub: '#7C9484', // 연한 세이지 서브텍스트
  muted: '#9FAF9F',

  // 브랜드 그린
  green: '#2F5D46',
  greenBright: '#3FA968',
  sage: '#A9BFAD',
  avatarBg: '#8FAD91',

  // 상태 배지
  goodBg: '#E5F0E0',
  goodText: '#3E7A52',
  goodDot: '#5CB878',
  midBg: '#FAF1D2',
  midText: '#A5822B',
  midBar: '#E8C84D',
  badBg: '#FADFDC',
  badText: '#C4574C',
  badBar: '#E08078',

  // 진행바
  track: '#EDEBE0',
  barGreen: '#79A985',

  // 지도
  mapBg: '#E8EFE2',
  mapRoad: '#F5F8F1',
  mapBlock: '#DFE9D8',
  mapWater: '#D8E6DC',
  mapLabel: '#8CA391',
  marker: '#3D7355',
  markerFull: '#B9C4BA',
  locationDot: '#4A7DF7',

  // 소셜 버튼
  kakao: '#FBE44D',
  apple: '#0E0E0E',

  white: '#FFFFFF',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

/**
 * 좌석 현황은 "자리 있음 / 만석" 2단계로만 판단한다.
 * 중간 단계(보통·혼잡)를 두면 기준이 자의적이고, 사용자가 실제로 알고 싶은 건
 * "지금 가면 앉을 수 있나"뿐이라 이분법으로 통일했다.
 */
export type SeatStatus = 'available' | 'full';

/** DB cafes.congestion 컬럼 값. 값이 없으면(null) 자리 있음으로 본다. */
export type Congestion = 'full' | null;

/**
 * 좌석 현황의 단일 판정 기준.
 * seats_available 집계 대신 congestion 컬럼을 신뢰한다 — 좌석 수는 실시간성이
 * 떨어져 congestion과 어긋날 수 있고, 이 버전에서는 congestion이 정답이다.
 */
export function seatStatus(congestion: Congestion | undefined): SeatStatus {
  return congestion === 'full' ? 'full' : 'available';
}

export function statusLabel(s: SeatStatus): string {
  return s === 'available' ? '자리 있음' : '만석';
}

export function statusColors(s: SeatStatus) {
  if (s === 'available')
    return { bg: colors.goodBg, text: colors.goodText, bar: colors.barGreen };
  return { bg: colors.badBg, text: colors.badText, bar: colors.badBar };
}
