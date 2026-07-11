// Shared mock cafe data. Used by SavedScreen (Phase 4) and MapScreen (Phase 5)
// so the list isn't duplicated across screens. `mx`/`my` are the fake-map pixel
// coordinates the MapScreen positions markers at.

export type CafeStatus = 'available' | 'normal' | 'crowded' | 'unknown';

export interface Cafe {
  id: string;
  name: string;
  walkMin: number;
  tableCount: number;
  totalTables: number;
  status: CafeStatus;
  lastUpdated: string;
  tags: string[];
  photo: string; // hex color placeholder for the thumbnail
  mx: number;
  my: number;
}

export const CAFES: Cafe[] = [
  { id: '1', name: '카페 온더웨이', walkMin: 5, tableCount: 4, totalTables: 10, status: 'available', lastUpdated: '30초 전', tags: ['콘센트', '1인석'], photo: '#B5CDA8', mx: 160, my: 110 },
  { id: '2', name: '스터디카페 집중', walkMin: 8, tableCount: 2, totalTables: 15, status: 'normal', lastUpdated: '1분 전', tags: ['콘센트'], photo: '#B0A8C5', mx: 248, my: 162 },
  { id: '3', name: '감성커피 낙성대점', walkMin: 12, tableCount: 0, totalTables: 8, status: 'crowded', lastUpdated: '방금 전', tags: ['소파석'], photo: '#C5BCA8', mx: 280, my: 72 },
  { id: 'error', name: '커피빈 서울대입구역점', walkMin: 3, tableCount: 0, totalTables: 20, status: 'unknown', lastUpdated: '10분 전', tags: ['콘센트'], photo: '#C4C4C4', mx: 108, my: 198 },
];

export const STATUS: Record<CafeStatus, { bg: string; text: string; label: string; shadow: string }> = {
  available: { bg: '#E2FF8C', text: '#2A3D00', label: '여유', shadow: 'rgba(160,200,0,0.18)' },
  normal: { bg: '#FFE599', text: '#4A3300', label: '보통', shadow: 'rgba(180,130,0,0.15)' },
  crowded: { bg: '#FF6B6B', text: '#FFFFFF', label: '혼잡', shadow: 'rgba(220,60,60,0.20)' },
  unknown: { bg: '#E8E8E8', text: '#8A8A8A', label: '확인불가', shadow: 'rgba(0,0,0,0.10)' },
};

export function getCafe(id: string | undefined): Cafe | undefined {
  return CAFES.find((c) => c.id === id);
}
