import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isSeatAlertEnabled, setSeatAlertEnabled } from './pushPrefs';
import { supabase } from './supabase';

/**
 * 사장님 앱의 "자리 있어요" 푸시를 받기 위한 토큰 등록.
 *
 * 발송은 Supabase Edge Function 전용이다 — 이 앱에서 Expo Push API를 직접
 * 호출하지 않는다. 여기서는 push_tokens 테이블에 토큰을 넣고 지우는 일만 한다.
 *
 * user_key는 favorites.user_key와 반드시 같은 값이어야 한다(store.tsx의 login에서
 * 만든 키). Edge Function이 favorites → user_key → 토큰으로 조인하기 때문에,
 * 키 규칙이 어긋나면 찜한 카페의 푸시가 도달하지 않는다.
 */

/** 안드로이드 heads-up 알림용 채널 */
const CHANNEL_ID = 'seat-available';

/** 마지막으로 등록한 토큰 — 로그아웃 시 이 값으로 행을 지운다 */
let registeredToken: string | null = null;

/** 포그라운드에서도 알림을 표시한다 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '자리 알림',
    importance: Notifications.AndroidImportance.HIGH,
    // sound는 지정하지 않는다 — 문자열을 주면 그 이름의 커스텀 사운드 파일을
    // 찾다가 실패해 에러 로그가 남는다. 생략하면 시스템 기본 알림음.
  });
}

/**
 * 권한을 확인하고 필요하면 한 번만 요청한다.
 * 거부 상태에서 반복 요청하면 iOS에서는 아무 효과 없이 사용자만 괴롭히므로
 * canAskAgain이 false면 조용히 포기한다.
 */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function getProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? null;
}

/**
 * 푸시 토큰을 발급받아 push_tokens에 upsert한다.
 * 실패는 조용히 넘긴다 — 알림은 부가 기능이고, 로그인 흐름을 막아선 안 된다.
 */
export async function registerPushToken(userKey: string): Promise<void> {
  try {
    // 사용자가 설정에서 끈 상태면 등록하지 않는다
    if (!isSeatAlertEnabled()) return;
    // 시뮬레이터·에뮬레이터는 푸시 토큰을 발급받을 수 없다
    if (!Device.isDevice) return;
    if (!supabase) return; // 목업 모드

    const projectId = getProjectId();
    if (!projectId) {
      console.log('[push] projectId 없음 — eas init이 필요합니다');
      return;
    }

    await ensureAndroidChannel();
    if (!(await ensurePermission())) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token) return;

    const { error } = await supabase.from('push_tokens').upsert({
      user_key: userKey,
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.log('[push] 토큰 등록 실패:', error.message);
      return;
    }
    registeredToken = token;
    console.log('[push] 토큰 등록 완료');
  } catch (e: any) {
    console.log('[push] 토큰 등록 중 오류:', e?.message ?? e);
  }
}

/**
 * 로그아웃 시 이 기기의 토큰 행을 지운다.
 * 안 지우면 로그아웃한 기기로 계속 푸시가 간다.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!supabase || !registeredToken) return;
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', registeredToken);
    if (error) {
      console.log('[push] 토큰 삭제 실패:', error.message);
      return;
    }
    registeredToken = null;
    console.log('[push] 토큰 삭제 완료');
  } catch (e: any) {
    console.log('[push] 토큰 삭제 중 오류:', e?.message ?? e);
  }
}

/**
 * 설정 화면의 "빈자리 알림" 스위치가 호출한다.
 *
 * 켜기: 설정을 저장하고 토큰을 등록한다. OS 알림 권한이 거부돼 있으면 등록이
 *       불가능하므로 false를 돌려주고, 호출부가 사용자에게 안내한다.
 * 끄기: 설정을 저장하고 이 기기의 토큰 행을 지운다.
 */
export async function setSeatAlert(
  enabled: boolean,
  userKey: string | null
): Promise<boolean> {
  setSeatAlertEnabled(enabled);
  if (!enabled) {
    await unregisterPushToken();
    return true;
  }
  if (!userKey) return true; // 로그인 후 login()에서 등록된다
  await registerPushToken(userKey);
  // 실기기에서 권한이 없으면 토큰이 없다 → 켜지 못한 것으로 알린다
  if (Device.isDevice && !registeredToken) {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      setSeatAlertEnabled(false);
      return false;
    }
  }
  return true;
}

/** 사장님 앱 Edge Function이 보내는 payload */
export type SeatAvailablePayload = {
  type?: string;
  cafeId?: string;
};

/** 알림 payload에서 이동할 카페 id를 꺼낸다 */
export function cafeIdFromNotification(data: unknown): string | null {
  const d = data as SeatAvailablePayload | undefined;
  if (!d || d.type !== 'seat_available') return null;
  return typeof d.cafeId === 'string' && d.cafeId ? d.cafeId : null;
}
