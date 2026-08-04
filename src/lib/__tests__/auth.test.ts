/**
 * auth.ts의 실패 경로 검증.
 *
 * 핵심 회귀 방지선: signInWithKakao / signInWithApple은 어떤 입력에도 null을
 * 반환하지 않는다. 실패는 전부 AuthError로 표면화되어야 한다.
 */

type Reason = string;

/** 모듈 부재를 흉내내는 mock 팩토리 — require 시점에 throw한다. */
const throwOnRequire = () => {
  throw new Error('Cannot find module');
};

function setup(opts: {
  platform?: 'ios' | 'android';
  kakaoKey?: string;
  kakaoUser?: Record<string, unknown> | 'missing';
  apple?: Record<string, unknown> | 'missing';
}) {
  jest.resetModules();

  jest.doMock('react-native', () => ({
    Platform: { OS: opts.platform ?? 'ios' },
  }));

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: { kakaoNativeAppKey: opts.kakaoKey } } },
  }));

  jest.doMock('@react-native-kakao/core', () => ({
    initializeKakaoSDK: jest.fn(),
  }));

  if (opts.kakaoUser === 'missing') {
    jest.doMock('@react-native-kakao/user', throwOnRequire);
  } else if (opts.kakaoUser) {
    jest.doMock('@react-native-kakao/user', () => opts.kakaoUser);
  }

  if (opts.apple === 'missing') {
    jest.doMock('expo-apple-authentication', throwOnRequire);
  } else if (opts.apple) {
    const apple = opts.apple;
    jest.doMock('expo-apple-authentication', () => ({
      AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
      ...apple,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../auth');
}

/** 호출이 AuthError로 실패하는지 확인하고 reason을 돌려준다. null 반환은 실패로 처리. */
async function expectFailure(call: () => Promise<unknown>): Promise<Reason> {
  let result: unknown;
  try {
    result = await call();
  } catch (e: any) {
    expect(e.name).toBe('AuthError');
    return e.reason;
  }
  throw new Error(
    `throw를 기대했지만 값이 반환되었다: ${JSON.stringify(result)} — 조용한 실패 경로가 남아 있다`,
  );
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('signInWithApple', () => {
  it('Android에서는 UNSUPPORTED_PLATFORM으로 실패한다', async () => {
    const { signInWithApple } = setup({ platform: 'android' });
    expect(await expectFailure(signInWithApple)).toBe('UNSUPPORTED_PLATFORM');
  });

  it('네이티브 모듈이 없으면 NATIVE_MODULE_MISSING으로 실패한다', async () => {
    const { signInWithApple } = setup({ platform: 'ios', apple: 'missing' });
    expect(await expectFailure(signInWithApple)).toBe('NATIVE_MODULE_MISSING');
  });

  it('isAvailableAsync가 false면 UNAVAILABLE로 실패한다', async () => {
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: { isAvailableAsync: async () => false, signInAsync: jest.fn() },
    });
    expect(await expectFailure(signInWithApple)).toBe('UNAVAILABLE');
  });

  it('사용자가 취소하면 CANCELLED로 실패한다', async () => {
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: {
        isAvailableAsync: async () => true,
        signInAsync: async () => {
          const e: any = new Error('The user canceled the authorization attempt');
          e.code = 'ERR_REQUEST_CANCELED';
          throw e;
        },
      },
    });
    expect(await expectFailure(signInWithApple)).toBe('CANCELLED');
  });

  it('SDK가 실패하면 PROVIDER_ERROR로 실패하고 원본 메시지를 유지한다', async () => {
    const raw = '잘못된 클라이언트 ID를 지정';
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: {
        isAvailableAsync: async () => true,
        signInAsync: async () => {
          const e: any = new Error(raw);
          e.code = 'ERR_REQUEST_UNKNOWN';
          throw e;
        },
      },
    });
    await expect(signInWithApple()).rejects.toThrow(raw);
  });

  it('credential에 user가 없으면 PROVIDER_ERROR로 실패한다 (목업 키 폴백 방지)', async () => {
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: {
        isAvailableAsync: async () => true,
        signInAsync: async () => ({ user: null, fullName: null, email: null }),
      },
    });
    expect(await expectFailure(signInWithApple)).toBe('PROVIDER_ERROR');
  });

  it('성공하면 apple: 접두사가 붙은 id를 반환한다', async () => {
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: {
        isAvailableAsync: async () => true,
        signInAsync: async () => ({
          user: 'ABC123',
          fullName: { givenName: '준영', familyName: '김' },
          email: 'a@b.com',
        }),
      },
    });
    await expect(signInWithApple()).resolves.toEqual({
      id: 'apple:ABC123',
      name: '김준영',
      email: 'a@b.com',
    });
  });

  it('이름이 없어도 기본 이름으로 성공한다', async () => {
    const { signInWithApple } = setup({
      platform: 'ios',
      apple: {
        isAvailableAsync: async () => true,
        signInAsync: async () => ({ user: 'ABC123', fullName: null, email: null }),
      },
    });
    const result = await signInWithApple();
    expect(result.id).toBe('apple:ABC123');
    expect(result.name.trim().length).toBeGreaterThan(0);
    expect(result.email).toBeUndefined();
  });
});

describe('signInWithKakao', () => {
  const KEY = 'realkey123';

  it('네이티브 모듈이 없으면 NATIVE_MODULE_MISSING으로 실패한다', async () => {
    const { signInWithKakao } = setup({ kakaoKey: KEY, kakaoUser: 'missing' });
    expect(await expectFailure(signInWithKakao)).toBe('NATIVE_MODULE_MISSING');
  });

  it('키가 없으면 NOT_CONFIGURED로 실패한다', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: undefined,
      kakaoUser: { login: jest.fn(), me: jest.fn() },
    });
    expect(await expectFailure(signInWithKakao)).toBe('NOT_CONFIGURED');
  });

  it('키가 YOUR_ 플레이스홀더면 NOT_CONFIGURED로 실패한다', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: 'YOUR_KAKAO_NATIVE_APP_KEY',
      kakaoUser: { login: jest.fn(), me: jest.fn() },
    });
    expect(await expectFailure(signInWithKakao)).toBe('NOT_CONFIGURED');
  });

  it('사용자가 취소하면 CANCELLED로 실패한다', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: KEY,
      kakaoUser: {
        login: async () => {
          const e: any = new Error('user cancelled login');
          e.code = 'E_CANCELLED';
          throw e;
        },
        me: jest.fn(),
      },
    });
    expect(await expectFailure(signInWithKakao)).toBe('CANCELLED');
  });

  it('SDK가 실패하면 PROVIDER_ERROR로 실패한다', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: KEY,
      kakaoUser: {
        login: async () => {
          throw new Error('network down');
        },
        me: jest.fn(),
      },
    });
    expect(await expectFailure(signInWithKakao)).toBe('PROVIDER_ERROR');
  });

  it('프로필에 id가 없으면 PROVIDER_ERROR로 실패한다 (목업 키 폴백 방지)', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: KEY,
      kakaoUser: {
        login: async () => undefined,
        me: async () => ({ nickname: '준영', id: null }),
      },
    });
    expect(await expectFailure(signInWithKakao)).toBe('PROVIDER_ERROR');
  });

  it('성공하면 kakao: 접두사가 붙은 id를 반환한다', async () => {
    const { signInWithKakao } = setup({
      kakaoKey: KEY,
      kakaoUser: {
        login: async () => undefined,
        me: async () => ({ id: 12345, nickname: '준영', email: 'a@b.com' }),
      },
    });
    await expect(signInWithKakao()).resolves.toEqual({
      id: 'kakao:12345',
      name: '준영',
      email: 'a@b.com',
    });
  });
});
