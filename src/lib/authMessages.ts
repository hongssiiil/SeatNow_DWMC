import type { AuthFailureReason, Provider } from './auth';

/**
 * AuthError를 사용자에게 보여줄 문구로 바꾼다.
 * `auth.ts`는 인증 수행만, 화면은 렌더링만 담당하도록 문구를 여기에 모았다.
 */

const PROVIDER_LABEL: Record<Provider, string> = {
  kakao: '카카오',
  apple: 'Apple',
};

/** AuthError가 아닐 수도 있는 값에서 reason을 안전하게 꺼낸다. */
function reasonOf(error: unknown): AuthFailureReason | null {
  const reason = (error as { reason?: unknown } | null | undefined)?.reason;
  return typeof reason === 'string' ? (reason as AuthFailureReason) : null;
}

function messageOf(error: unknown): string {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : '';
}

export function describeAuthError(
  provider: Provider,
  error: unknown,
): { title: string; body: string } {
  const label = PROVIDER_LABEL[provider] ?? '소셜';
  const raw = messageOf(error);

  switch (reasonOf(error)) {
    case 'CANCELLED':
      return {
        title: '로그인 취소',
        body: `${label} 로그인을 취소했어요.`,
      };

    case 'UNSUPPORTED_PLATFORM':
      return {
        title: '지원하지 않는 로그인',
        body: 'Apple 로그인은 iOS에서만 사용할 수 있어요. 카카오로 로그인해 주세요.',
      };

    case 'NATIVE_MODULE_MISSING':
      return {
        title: '로그인을 사용할 수 없어요',
        body: `이 빌드에는 ${label} 로그인 모듈이 없어요. 개발 빌드에서 다시 시도해 주세요.`,
      };

    case 'NOT_CONFIGURED':
      return {
        title: '설정이 완료되지 않았어요',
        body: '카카오 앱 키가 설정되지 않았어요. .env의 KAKAO_NATIVE_APP_KEY를 확인해 주세요.',
      };

    case 'UNAVAILABLE':
      return {
        title: '로그인을 사용할 수 없어요',
        body: '이 기기에서 Apple 로그인을 사용할 수 없어요. 기기의 Apple 계정 로그인 상태를 확인해 주세요.',
      };

    // 원본 메시지를 그대로 노출한다. 원인 추적에 필요한 정보를 잃지 않기 위한 선택이다.
    case 'PROVIDER_ERROR':
      return {
        title: '로그인 실패',
        body: `${label} 로그인에 실패했어요.\n\n${raw}`,
      };

    // AuthError가 아닌 예기치 못한 에러
    default:
      return {
        title: '로그인 실패',
        body: raw
          ? `${label} 로그인에 실패했어요.\n\n${raw}`
          : `${label} 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.`,
      };
  }
}
