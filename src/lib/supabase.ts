import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Congestion } from './theme';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * .env에 키가 없으면 null — 앱은 목업 데이터로 동작한다.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // 자체 세션 미사용 (카카오/Apple 네이티브 로그인 사용)
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

/** DB row → 앱 Cafe 매핑에 쓰는 타입 */
export type CafeRow = {
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
  /** 사장님 앱이 쓰는 좌석 현황. 'full'=만석, 'available'=자리 있음, null=미설정 */
  congestion?: string | null;
  /** 사장님 앱의 리마인더 기준값 — 고객 앱은 읽기만 한다 */
  congestion_updated_at?: string | null;
};
