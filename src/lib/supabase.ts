import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Congestion } from './theme';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * .env에 키가 없으면 null — 앱은 목업 데이터로 동작한다.
 *
 * Supabase Auth는 Apple 웹 OAuth의 중개자로만 쓴다 (앱에 .p8 키를 넣을 수 없어
 * client secret 서명과 코드 교환을 위임한다). 앱의 사용자 키는 여전히
 * `apple:{sub}` / `kakao:{id}`이고 `user_key` 스킴은 그대로다.
 *
 * PKCE 흐름이라 authorize와 exchangeCodeForSession 사이에 code verifier가
 * 유지되어야 한다. 그래서 persistSession과 AsyncStorage가 필요하다.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          // 딥링크는 appleAuth.ts가 직접 처리한다.
          detectSessionInUrl: false,
          flowType: 'pkce',
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
