/**
 * Apple 웹 OAuth 경로 검증.
 *
 * signInWithAppleWeb은 성공 시 Apple sub를 반환하고, 실패는 전부 AuthError로
 * 표면화한다. 특히 sub를 확정할 수 없으면 반드시 실패해야 한다 — 여기서 조용히
 * 넘어가면 사용자 키가 엉뚱한 값이 되어 데이터가 섞인다.
 */

const REDIRECT = 'seatnowapp://auth-callback';

type AuthApi = {
  signInWithOAuth?: jest.Mock;
  exchangeCodeForSession?: jest.Mock;
};

function setup(opts: {
  supabase?: { auth: AuthApi } | null;
  browserResult?: unknown;
  parsedParams?: Record<string, unknown>;
}) {
  jest.resetModules();

  jest.doMock('expo-auth-session', () => ({
    makeRedirectUri: () => REDIRECT,
  }));

  jest.doMock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(async () => opts.browserResult),
  }));

  jest.doMock('expo-linking', () => ({
    parse: () => ({ queryParams: opts.parsedParams ?? {} }),
  }));

  jest.doMock('../supabase', () => ({
    supabase: opts.supabase === undefined ? defaultSupabase() : opts.supabase,
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../appleAuth');
}

function defaultSupabase(session: unknown = { user: {} }) {
  return {
    auth: {
      signInWithOAuth: jest.fn(async () => ({
        data: { url: 'https://appleid.apple.com/auth/authorize?x=1' },
        error: null,
      })),
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session },
        error: null,
      })),
    },
  };
}

async function expectFailure(call: () => Promise<unknown>): Promise<string> {
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

describe('appleSubFromUser', () => {
  it('identities에서 apple 공급자의 id를 찾는다', () => {
    const { appleSubFromUser } = setup({});
    expect(
      appleSubFromUser({
        identities: [
          { provider: 'google', id: 'G1' },
          { provider: 'apple', id: 'A1' },
        ],
      }),
    ).toBe('A1');
  });

  it('identities가 없으면 user_metadata.provider_id로 폴백한다', () => {
    const { appleSubFromUser } = setup({});
    expect(appleSubFromUser({ user_metadata: { provider_id: 'A2' } })).toBe('A2');
  });

  it('provider_id가 없으면 user_metadata.sub로 폴백한다', () => {
    const { appleSubFromUser } = setup({});
    expect(appleSubFromUser({ user_metadata: { sub: 'A3' } })).toBe('A3');
  });

  it('찾을 수 없으면 null을 반환한다', () => {
    const { appleSubFromUser } = setup({});
    expect(appleSubFromUser(null)).toBeNull();
    expect(appleSubFromUser({})).toBeNull();
    expect(appleSubFromUser({ identities: [{ provider: 'google', id: 'G1' }] })).toBeNull();
  });
});

describe('signInWithAppleWeb', () => {
  it('Supabase가 없으면 NOT_CONFIGURED로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({ supabase: null });
    expect(await expectFailure(signInWithAppleWeb)).toBe('NOT_CONFIGURED');
  });

  it('signInWithOAuth가 오류를 반환하면 PROVIDER_ERROR로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({
      supabase: {
        auth: {
          signInWithOAuth: jest.fn(async () => ({
            data: null,
            error: { message: 'provider not enabled' },
          })),
        },
      },
    });
    expect(await expectFailure(signInWithAppleWeb)).toBe('PROVIDER_ERROR');
  });

  it('브라우저에서 취소하면 CANCELLED로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({ browserResult: { type: 'cancel' } });
    expect(await expectFailure(signInWithAppleWeb)).toBe('CANCELLED');
  });

  it('브라우저를 닫으면(dismiss) CANCELLED로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({ browserResult: { type: 'dismiss' } });
    expect(await expectFailure(signInWithAppleWeb)).toBe('CANCELLED');
  });

  it('리다이렉트에 error_description이 오면 그 메시지로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({
      browserResult: { type: 'success', url: `${REDIRECT}?error=x` },
      parsedParams: { error_description: 'invalid_client' },
    });
    await expect(signInWithAppleWeb()).rejects.toThrow('invalid_client');
  });

  it('인증 코드가 없으면 PROVIDER_ERROR로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({
      browserResult: { type: 'success', url: REDIRECT },
      parsedParams: {},
    });
    expect(await expectFailure(signInWithAppleWeb)).toBe('PROVIDER_ERROR');
  });

  it('코드 교환이 실패하면 PROVIDER_ERROR로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({
      supabase: {
        auth: {
          signInWithOAuth: jest.fn(async () => ({ data: { url: 'https://x' }, error: null })),
          exchangeCodeForSession: jest.fn(async () => ({
            data: null,
            error: { message: 'bad code verifier' },
          })),
        },
      },
      browserResult: { type: 'success', url: REDIRECT },
      parsedParams: { code: 'CODE' },
    });
    await expect(signInWithAppleWeb()).rejects.toThrow('bad code verifier');
  });

  it('세션에서 sub를 찾을 수 없으면 PROVIDER_ERROR로 실패한다', async () => {
    const { signInWithAppleWeb } = setup({
      supabase: defaultSupabase({ user: { identities: [] } }),
      browserResult: { type: 'success', url: REDIRECT },
      parsedParams: { code: 'CODE' },
    });
    expect(await expectFailure(signInWithAppleWeb)).toBe('PROVIDER_ERROR');
  });

  it('성공하면 Apple sub와 이메일을 반환한다', async () => {
    const { signInWithAppleWeb } = setup({
      supabase: defaultSupabase({
        user: {
          email: 'a@b.com',
          identities: [{ provider: 'apple', id: 'APPLESUB' }],
        },
      }),
      browserResult: { type: 'success', url: REDIRECT },
      parsedParams: { code: 'CODE' },
    });
    await expect(signInWithAppleWeb()).resolves.toEqual({
      sub: 'APPLESUB',
      email: 'a@b.com',
    });
  });

  it('이메일이 없어도 성공한다 (Apple 이메일 가리기)', async () => {
    const { signInWithAppleWeb } = setup({
      supabase: defaultSupabase({
        user: { identities: [{ provider: 'apple', id: 'APPLESUB' }] },
      }),
      browserResult: { type: 'success', url: REDIRECT },
      parsedParams: { code: 'CODE' },
    });
    await expect(signInWithAppleWeb()).resolves.toEqual({
      sub: 'APPLESUB',
      email: undefined,
    });
  });
});
