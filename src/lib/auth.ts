import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AuthResult = {
  /** 즐겨찾기·예약 저장에 쓰는 안정적인 사용자 키 (예: kakao:12345) */
  id?: string;
  name: string;
  email?: string;
};

/**
 * 네이티브 모듈이 없는 환경(Expo Go)에서만 null을 반환하고,
 * 호출부에서 목업 로그인으로 폴백한다.
 * dev build에서 실제 로그인이 실패하면 에러를 던져 UI에 표시한다.
 */

let kakaoInitialized = false;

export function initKakao() {
  if (kakaoInitialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeKakaoSDK } = require('@react-native-kakao/core');
    const key = Constants.expoConfig?.extra?.kakaoNativeAppKey;
    if (key && !String(key).startsWith('YOUR_')) {
      initializeKakaoSDK(key);
      kakaoInitialized = true;
    }
  } catch {
    // Expo Go: 네이티브 모듈 없음 — 목업 로그인 사용
  }
}

function isCancelError(e: any): boolean {
  const msg = String(e?.message ?? '').toLowerCase();
  return (
    msg.includes('cancel') ||
    e?.code === 'E_CANCELLED' ||
    e?.code === 'ERR_REQUEST_CANCELED'
  );
}

export async function signInWithKakao(): Promise<AuthResult | null> {
  let kakaoUser: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kakaoUser = require('@react-native-kakao/user');
  } catch {
    return null; // Expo Go 폴백
  }
  initKakao();
  if (!kakaoInitialized) return null; // 키 미설정 폴백

  try {
    await kakaoUser.login();
    const profile = await kakaoUser.me();
    return {
      id: profile?.id != null ? `kakao:${profile.id}` : undefined,
      name: profile?.nickname || profile?.name || '카카오 사용자',
      email: profile?.email || undefined,
    };
  } catch (e: any) {
    if (isCancelError(e)) throw new Error('CANCELLED');
    // 실제 로그인 실패 — 목업으로 위장하지 않고 에러를 표시한다
    throw new Error(e?.message ?? '카카오 로그인에 실패했어요');
  }
}

export async function signInWithApple(): Promise<AuthResult | null> {
  if (Platform.OS !== 'ios') return null;
  let AppleAuthentication: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppleAuthentication = require('expo-apple-authentication');
  } catch {
    return null; // Expo Go 폴백
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return null;
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const name = credential.fullName?.givenName
      ? `${credential.fullName.familyName ?? ''}${credential.fullName.givenName}`
      : 'Apple 사용자';
    return {
      id: credential.user ? `apple:${credential.user}` : undefined,
      name,
      email: credential.email ?? undefined,
    };
  } catch (e: any) {
    if (isCancelError(e)) throw new Error('CANCELLED');
    throw new Error(e?.message ?? 'Apple 로그인에 실패했어요');
  }
}
