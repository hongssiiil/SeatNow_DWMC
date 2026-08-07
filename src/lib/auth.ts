import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { signInWithAppleWeb } from './appleAuth';
import { fail, reasonOf } from './authError';

export { AuthError } from './authError';
export type { AuthFailureReason, Provider } from './authError';

export type AuthResult = {
  /** 즐겨찾기·예약 저장에 쓰는 안정적인 사용자 키 (예: kakao:12345) */
  id: string;
  name: string;
  email?: string;
};

let kakaoInitialized = false;

/**
 * 앱 시작 시 호출된다(`_layout.tsx`). 여기서는 던지지 않는다 — 키 미설정이나
 * 모듈 부재는 실제 로그인 시도 시점에 NOT_CONFIGURED / NATIVE_MODULE_MISSING으로
 * 보고된다.
 */
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
    // 네이티브 모듈 부재 — signInWithKakao가 보고한다
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

export async function signInWithKakao(): Promise<AuthResult> {
  let kakaoUser: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kakaoUser = require('@react-native-kakao/user');
  } catch (e) {
    fail(
      'kakao',
      'NATIVE_MODULE_MISSING',
      '카카오 로그인 네이티브 모듈을 불러올 수 없습니다.',
      e,
    );
  }

  initKakao();
  if (!kakaoInitialized) {
    fail('kakao', 'NOT_CONFIGURED', '카카오 네이티브 앱 키가 설정되지 않았습니다.');
  }

  let profile: any;
  try {
    await kakaoUser.login();
    profile = await kakaoUser.me();
  } catch (e: any) {
    if (isCancelError(e)) {
      fail('kakao', 'CANCELLED', '사용자가 카카오 로그인을 취소했습니다.', e);
    }
    fail('kakao', 'PROVIDER_ERROR', e?.message ?? '카카오 로그인에 실패했습니다.', e);
  }

  // id가 없으면 사용자를 식별할 수 없다. 공용 키로 폴백하지 않고 실패로 처리한다.
  if (profile?.id == null) {
    fail('kakao', 'PROVIDER_ERROR', '카카오가 사용자 식별자를 반환하지 않았습니다.');
  }

  return {
    id: `kakao:${profile.id}`,
    name: profile?.nickname || profile?.name || '카카오 사용자',
    email: profile?.email || undefined,
  };
}

/**
 * Apple 로그인 (하이브리드).
 *
 * iOS는 네이티브 시트를 우선 시도한다. UX가 좋고 사용자 이름을 받을 수 있다.
 * 네이티브가 취소 외의 이유로 실패하면 웹 OAuth로 폴백한다 — 네이티브 경로가
 * 막혀도 로그인이 가능해야 하기 때문이다. Android는 네이티브 구현이 없어 곧바로
 * 웹 OAuth를 쓴다.
 *
 * 어느 경로든 사용자 키는 `apple:{sub}`로 동일하다. Service ID가 primary App ID에
 * 연결되어 있으면 Apple이 같은 팀 그룹에 같은 식별자를 주기 때문이다.
 */
export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    return appleWebResult();
  }

  try {
    return await signInWithAppleNative();
  } catch (e) {
    // 사용자가 스스로 취소한 것은 폴백 대상이 아니다.
    if (reasonOf(e) === 'CANCELLED') throw e;
    console.error('[auth] 네이티브 Apple 로그인 실패 — 웹 OAuth로 폴백합니다', e);
    return appleWebResult();
  }
}

async function appleWebResult(): Promise<AuthResult> {
  const { sub, email } = await signInWithAppleWeb();
  // 웹 OAuth는 사용자 이름을 제공하지 않는다(Apple 사양).
  return { id: `apple:${sub}`, name: 'Apple 사용자', email };
}

async function signInWithAppleNative(): Promise<AuthResult> {
  let AppleAuthentication: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    fail(
      'apple',
      'NATIVE_MODULE_MISSING',
      'Apple 로그인 네이티브 모듈을 불러올 수 없습니다.',
      e,
    );
  }

  let available = false;
  try {
    available = await AppleAuthentication.isAvailableAsync();
  } catch (e) {
    fail('apple', 'UNAVAILABLE', 'Apple 로그인 사용 가능 여부를 확인할 수 없습니다.', e);
  }
  if (!available) {
    fail('apple', 'UNAVAILABLE', '이 기기에서 Apple 로그인을 사용할 수 없습니다.');
  }

  let credential: any;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e: any) {
    if (isCancelError(e)) {
      fail('apple', 'CANCELLED', '사용자가 Apple 로그인을 취소했습니다.', e);
    }
    fail('apple', 'PROVIDER_ERROR', e?.message ?? 'Apple 로그인에 실패했습니다.', e);
  }

  if (!credential?.user) {
    fail('apple', 'PROVIDER_ERROR', 'Apple이 사용자 식별자를 반환하지 않았습니다.');
  }

  const name = credential.fullName?.givenName
    ? `${credential.fullName.familyName ?? ''}${credential.fullName.givenName}`
    : 'Apple 사용자';

  return {
    id: `apple:${credential.user}`,
    name,
    email: credential.email ?? undefined,
  };
}
