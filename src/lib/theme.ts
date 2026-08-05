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
 * 좌석 현황은 사장님이 알려준 "자리 있음 / 만석" 2단계와,
 * 아직 알려주지 않은 'unknown'으로 판단한다.
 * 중간 단계(보통·혼잡)를 두면 기준이 자의적이고, 사용자가 실제로 알고 싶은 건
 * "지금 가면 앉을 수 있나"뿐이라 이분법으로 통일했다.
 * 'unknown'을 '자리 있음'으로 뭉개지 않는 이유: 사장님이 한 번도 설정하지 않은
 * 가게를 근거 없이 긍정 표시하면 헛걸음을 유발한다.
 */
export type SeatStatus = 'available' | 'full' | 'unknown';

/** DB cafes.congestion 컬럼 값. null이면 사장님이 아직 설정하지 않았다는 뜻. */
export type Congestion = 'available' | 'full' | null;

/**
 * 좌석 현황의 단일 판정 기준.
 * seats_available 집계 대신 congestion 컬럼을 신뢰한다 — 좌석 수는 사장님 앱이
 * 관리하지 않아 실시간성이 없고, congestion과 어긋날 수 있다.
 */
export function seatStatus(congestion: Congestion | undefined): SeatStatus {
  if (congestion === 'full') return 'full';
  if (congestion === 'available') return 'available';
  return 'unknown';
}

/** 정렬용 가중치 — 자리 있음 > 정보 없음 > 만석 */
export function seatStatusRank(s: SeatStatus): number {
  if (s === 'available') return 1;
  if (s === 'unknown') return 0.5;
  return 0;
}

export function statusLabel(s: SeatStatus): string {
  if (s === 'available') return '자리 있음';
  if (s === 'full') return '만석';
  return '정보 없음';
}

export function statusColors(s: SeatStatus) {
  if (s === 'available')
    return { bg: colors.goodBg, text: colors.goodText, bar: colors.barGreen };
  if (s === 'full')
    return { bg: colors.badBg, text: colors.badText, bar: colors.badBar };
  // 정보 없음 — 긍정도 부정도 아닌 중성 색
  return { bg: colors.divider, text: colors.sub, bar: colors.sage };
}
