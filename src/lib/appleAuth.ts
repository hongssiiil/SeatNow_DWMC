import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { fail } from './authError';
import { supabase } from './supabase';

/**
 * Apple 로그인 웹 OAuth 경로.
 *
 * Apple은 client secret을 .p8로 서명한 JWT로 요구하므로 앱에서 직접 코드 교환을
 * 할 수 없다. Supabase Auth를 OAuth 중개자로 사용해 서명과 교환을 위임한다.
 *
 * 앱의 사용자 키는 기존과 동일하게 `apple:{sub}`를 유지한다. Service ID가
 * primary App ID(`com.sitnow.app`)에 연결되어 있으면 Apple이 같은 팀 그룹에
 * 동일한 user identifier를 주기 때문에, iOS 네이티브 경로의 `credential.user`와
 * 같은 값이 된다.
 */

/** 딥링크 경로. Supabase 대시보드의 Redirect URLs에 `seatnowapp://**`가 등록되어야 한다. */
const REDIRECT_PATH = 'auth-callback';

/** Supabase 세션의 사용자 객체에서 Apple의 sub를 찾는다. */
export function appleSubFromUser(user: unknown): string | null {
  const u = user as
    | {
        identities?: { provider?: string; id?: string }[] | null;
        user_metadata?: { sub?: unknown; provider_id?: unknown } | null;
      }
    | null
    | undefined;

  const identity = u?.identities?.find((i) => i?.provider === 'apple');
  if (identity?.id) return identity.id;

  // identities가 비어 있는 경우를 위한 폴백
  const meta = u?.user_metadata;
  for (const candidate of [meta?.provider_id, meta?.sub]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }

  return null;
}

/**
 * 웹 로그인 창을 띄워두고 결과를 기다리는 중인지.
 *
 * 리다이렉트(`seatnowapp://auth-callback`)는 딥링크라서 expo-router의 화면
 * 이동도 함께 일으킨다. 콜백 화면(app/auth-callback.tsx)은 이 플래그를 보고,
 * 진행 중이면 아무것도 하지 않고 여기서 코드 교환을 끝내도록 양보한다.
 * 앱이 백그라운드에서 종료돼 콜드 스타트로 돌아온 경우에는 기다리는 쪽이
 * 없으므로 콜백 화면이 직접 교환한다.
 */
let webAuthInFlight = false;

export function isAppleWebAuthInFlight(): boolean {
  return webAuthInFlight;
}

/** 웹 OAuth로 Apple에 로그인하고 Apple sub를 반환한다. 실패는 전부 throw한다. */
export async function signInWithAppleWeb(): Promise<{ sub: string; email?: string }> {
  if (!supabase) {
    fail(
      'apple',
      'NOT_CONFIGURED',
      'Supabase가 설정되지 않아 Apple 웹 로그인을 사용할 수 없습니다.',
    );
  }

  const redirectTo = makeRedirectUri({ scheme: 'seatnowapp', path: REDIRECT_PATH });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    fail('apple', 'PROVIDER_ERROR', error.message, error);
  }
  if (!data?.url) {
    fail('apple', 'PROVIDER_ERROR', 'Apple 로그인 주소를 받지 못했습니다.');
  }

  let result;
  try {
    webAuthInFlight = true;
    result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  } finally {
    webAuthInFlight = false;
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    fail('apple', 'CANCELLED', '사용자가 Apple 로그인을 취소했습니다.', result);
  }
  if (result.type !== 'success' || !result.url) {
    fail('apple', 'PROVIDER_ERROR', 'Apple 로그인 창이 결과를 반환하지 않았습니다.', result);
  }

  const params = Linking.parse(result.url).queryParams ?? {};
  // Apple/Supabase가 오류를 쿼리로 되돌려주는 경우
  if (typeof params.error_description === 'string') {
    fail('apple', 'PROVIDER_ERROR', params.error_description);
  }
  if (typeof params.error === 'string') {
    fail('apple', 'PROVIDER_ERROR', params.error);
  }

  const code = params.code;
  if (typeof code !== 'string' || !code) {
    fail('apple', 'PROVIDER_ERROR', 'Apple 로그인 응답에 인증 코드가 없습니다.', params);
  }

  return completeAppleWebAuth(code);
}

/**
 * 인증 코드를 세션으로 교환하고 Apple sub를 꺼낸다.
 *
 * 코드는 일회용이므로 한 번만 호출해야 한다. 웹 로그인 창을 기다리는 경로와
 * 콜백 화면 중 하나만 호출한다 ([[isAppleWebAuthInFlight]] 참고).
 */
export async function completeAppleWebAuth(
  code: string,
): Promise<{ sub: string; email?: string }> {
  if (!supabase) {
    fail(
      'apple',
      'NOT_CONFIGURED',
      'Supabase가 설정되지 않아 Apple 웹 로그인을 사용할 수 없습니다.',
    );
  }

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    fail('apple', 'PROVIDER_ERROR', exchange.error.message, exchange.error);
  }

  const user = exchange.data?.session?.user;
  const sub = appleSubFromUser(user);
  if (!sub) {
    // 여기서 조용히 넘어가면 사용자 키가 엉뚱한 값이 되어 데이터가 섞인다.
    fail('apple', 'PROVIDER_ERROR', 'Apple 사용자 식별자를 확인할 수 없습니다.', user);
  }

  const email = typeof user?.email === 'string' && user.email ? user.email : undefined;
  return { sub, email };
}
