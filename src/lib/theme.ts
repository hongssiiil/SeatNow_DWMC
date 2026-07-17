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

export type SeatStatus = 'good' | 'mid' | 'bad';

export function seatStatus(available: number, total: number): SeatStatus {
  if (available <= 0) return 'bad';
  if (available / total >= 0.3) return 'good';
  return 'mid';
}

export function statusLabel(s: SeatStatus): string {
  return s === 'good' ? '여유' : s === 'mid' ? '보통' : '혼잡';
}

export function statusColors(s: SeatStatus) {
  if (s === 'good')
    return { bg: colors.goodBg, text: colors.goodText, bar: colors.barGreen };
  if (s === 'mid')
    return { bg: colors.midBg, text: colors.midText, bar: colors.midBar };
  return { bg: colors.badBg, text: colors.badText, bar: colors.badBar };
}
