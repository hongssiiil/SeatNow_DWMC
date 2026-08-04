export type Provider = 'kakao' | 'apple';

export type AuthFailureReason =
  /** 사용자가 직접 취소 */
  | 'CANCELLED'
  /** 해당 플랫폼에서 지원하지 않는 로그인 */
  | 'UNSUPPORTED_PLATFORM'
  /** Expo Go 등 네이티브 모듈 부재 */
  | 'NATIVE_MODULE_MISSING'
  /** SDK 키 또는 Supabase 미설정 */
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

/** AuthError가 아닐 수도 있는 값에서 reason을 안전하게 꺼낸다. */
export function reasonOf(error: unknown): AuthFailureReason | null {
  const reason = (error as { reason?: unknown } | null | undefined)?.reason;
  return typeof reason === 'string' ? (reason as AuthFailureReason) : null;
}

/**
 * 로그인 실패는 전부 이 함수를 통해 표면화된다. 조용히 null을 반환하는 경로는 없다.
 * 진단 로그를 남긴 뒤 AuthError를 던진다.
 */
export function fail(
  provider: Provider,
  reason: AuthFailureReason,
  message: string,
  cause?: unknown,
): never {
  console.error('[auth]', { provider, reason, message, cause });
  throw new AuthError(reason, message, cause);
}
