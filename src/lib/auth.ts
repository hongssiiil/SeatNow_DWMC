import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AuthResult = {
  /** 즐겨찾기·예약 저장에 쓰는 안정적인 사용자 키 (예: kakao:12345) */
  id: string;
  name: string;
  email?: string;
};

export type Provider = 'kakao' | 'apple';

export type AuthFailureReason =
  /** 사용자가 직접 취소 */
  | 'CANCELLED'
  /** Android에서 Apple 로그인 호출 */
  | 'UNSUPPORTED_PLATFORM'
  /** Expo Go 등 네이티브 모듈 부재 */
  | 'NATIVE_MODULE_MISSING'
  /** SDK 키 미설정 */
  | 'NOT_CONFIGURED'
  /** 기기가 해당 로그인을 지원하지 않음 */
  | 'UNAVAILABLE'
  /** SDK·서버가 반환한 실패 */
  | 'PROVIDER_ERROR';

export class AuthError extends Error {
  readonly reason: AuthFailureReason;
  readonly cause?: unknown;

  constructor(reason: AuthFailureReason, message: string, cause?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.reason = reason;
    this.cause = cause;
    // Babel의 클래스 상속 변환에서 프로토타입이 끊기는 것을 방지
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * 로그인 실패는 전부 이 함수를 통해 표면화된다. 조용히 null을 반환하는 경로는 없다.
 * 진단 로그를 남긴 뒤 AuthError를 던진다.
 */
function fail(
  provider: Provider,
  reason: AuthFailureReason,
  message: string,
  cause?: unknown,
): never {
  console.error('[auth]', { provider, reason, message, cause });
  throw new AuthError(reason, message, cause);
}

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

export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    fail('apple', 'UNSUPPORTED_PLATFORM', 'Apple 로그인은 iOS에서만 지원됩니다.');
  }

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
