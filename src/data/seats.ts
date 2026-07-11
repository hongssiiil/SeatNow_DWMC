// Floor-map seat data for CafeDetailScreen. x/y/w/h are percentages within
// the floor-map container. Shared with SeatBottomSheet via the Seat type.

export type SeatStatus = 'available' | 'occupied' | 'checking';

export interface Seat {
  id: string;
  label: string;
  status: SeatStatus;
  capacity: string;
  hasOutlet: boolean;
  isSofa: boolean;
  tableHeight: '' | 'high' | 'low';
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SEATS: Seat[] = [
  { id: 'T1', label: 'T1', status: 'available', capacity: '2', hasOutlet: true, isSofa: false, tableHeight: '', zone: '창가석', x: 3, y: 8, w: 17, h: 14 },
  { id: 'T2', label: 'T2', status: 'occupied', capacity: '2', hasOutlet: false, isSofa: false, tableHeight: '', zone: '창가석', x: 3, y: 25, w: 17, h: 14 },
  { id: 'T3', label: 'T3', status: 'available', capacity: '1', hasOutlet: false, isSofa: false, tableHeight: '', zone: '창가석', x: 3, y: 42, w: 17, h: 14 },
  { id: 'T4', label: 'T4', status: 'available', capacity: '2', hasOutlet: true, isSofa: false, tableHeight: '', zone: '중앙석', x: 25, y: 8, w: 19, h: 14 },
  { id: 'T5', label: 'T5', status: 'occupied', capacity: '2', hasOutlet: false, isSofa: false, tableHeight: '', zone: '중앙석', x: 46, y: 8, w: 19, h: 14 },
  { id: 'T6', label: 'T6', status: 'checking', capacity: '2', hasOutlet: false, isSofa: false, tableHeight: '', zone: '중앙석', x: 25, y: 26, w: 19, h: 14 },
  { id: 'T7', label: 'T7', status: 'available', capacity: '4', hasOutlet: true, isSofa: false, tableHeight: '', zone: '중앙석', x: 46, y: 26, w: 19, h: 14 },
  { id: 'T8', label: 'T8', status: 'occupied', capacity: '2', hasOutlet: false, isSofa: false, tableHeight: 'high', zone: '중앙석', x: 25, y: 44, w: 19, h: 14 },
  { id: 'T9', label: 'T9', status: 'available', capacity: '1', hasOutlet: false, isSofa: false, tableHeight: 'high', zone: '중앙석', x: 46, y: 44, w: 19, h: 14 },
  { id: 'T10', label: 'T10', status: 'occupied', capacity: '1', hasOutlet: true, isSofa: false, tableHeight: 'high', zone: '카운터석', x: 71, y: 8, w: 13, h: 10 },
  { id: 'T11', label: 'T11', status: 'available', capacity: '1', hasOutlet: true, isSofa: false, tableHeight: 'high', zone: '카운터석', x: 71, y: 21, w: 13, h: 10 },
  { id: 'T12', label: 'T12', status: 'available', capacity: '1', hasOutlet: false, isSofa: false, tableHeight: 'high', zone: '카운터석', x: 71, y: 34, w: 13, h: 10 },
  { id: 'T13', label: 'T13', status: 'available', capacity: '4', hasOutlet: false, isSofa: true, tableHeight: 'low', zone: '소파석', x: 3, y: 65, w: 30, h: 16 },
  { id: 'T14', label: 'T14', status: 'occupied', capacity: '4', hasOutlet: false, isSofa: true, tableHeight: 'low', zone: '소파석', x: 36, y: 65, w: 30, h: 16 },
];

export const SEAT_FILTERS = ['전체', '콘센트', '소파석', '1인석', '4인석'];

export const SEAT_STYLE: Record<SeatStatus, { bg: string; text: string; sub: string }> = {
  available: { bg: '#EEFFC4', text: '#4B6B00', sub: '#7A9A20' },
  occupied: { bg: '#F1F1F1', text: '#A8A8A8', sub: '#C0C0C0' },
  checking: { bg: '#FFF5D6', text: '#8A6500', sub: '#B08A30' },
};

export function matchSeatFilter(seat: Seat, f: string) {
  if (f === '전체') return true;
  if (f === '콘센트') return seat.hasOutlet;
  if (f === '소파석') return seat.isSofa;
  if (f === '1인석') return seat.capacity === '1';
  if (f === '4인석') return seat.capacity === '4';
  return true;
}

export function seatAttrLine(seat: Seat) {
  const p: string[] = [`${seat.capacity}인`];
  if (seat.hasOutlet) p.push('콘센트');
  if (seat.isSofa) p.push('소파');
  if (seat.tableHeight === 'high') p.push('H');
  if (seat.tableHeight === 'low') p.push('L');
  return p.slice(0, 2).join(' · ');
}
