import { AuthError, type AuthFailureReason } from '../auth';
import { describeAuthError } from '../authMessages';

const ALL_REASONS: AuthFailureReason[] = [
  'CANCELLED',
  'UNSUPPORTED_PLATFORM',
  'NATIVE_MODULE_MISSING',
  'NOT_CONFIGURED',
  'UNAVAILABLE',
  'PROVIDER_ERROR',
];

describe('describeAuthError', () => {
  it.each(ALL_REASONS)('%s에 대해 비어 있지 않은 제목과 본문을 반환한다', (reason) => {
    const { title, body } = describeAuthError('kakao', new AuthError(reason, '원본'));
    expect(title.trim().length).toBeGreaterThan(0);
    expect(body.trim().length).toBeGreaterThan(0);
  });

  it('PROVIDER_ERROR는 SDK 원본 메시지를 본문에 포함한다', () => {
    const raw = '잘못된 클라이언트 ID를 지정';
    const { body } = describeAuthError('apple', new AuthError('PROVIDER_ERROR', raw));
    expect(body).toContain(raw);
  });

  it('UNSUPPORTED_PLATFORM은 Apple이 iOS 전용임을 알린다', () => {
    const { body } = describeAuthError('apple', new AuthError('UNSUPPORTED_PLATFORM', 'x'));
    expect(body).toContain('iOS');
  });

  it('NOT_CONFIGURED는 어떤 키가 빠졌는지 알린다', () => {
    const { body } = describeAuthError('kakao', new AuthError('NOT_CONFIGURED', 'x'));
    expect(body).toContain('KAKAO_NATIVE_APP_KEY');
  });

  it('AuthError가 아닌 에러도 문구로 변환하며 메시지를 잃지 않는다', () => {
    const { title, body } = describeAuthError('kakao', new Error('boom'));
    expect(title.trim().length).toBeGreaterThan(0);
    expect(body).toContain('boom');
  });

  it('에러가 아닌 값이 와도 예외를 던지지 않는다', () => {
    expect(() => describeAuthError('kakao', undefined)).not.toThrow();
    expect(() => describeAuthError('apple', 'just a string')).not.toThrow();
  });
});
