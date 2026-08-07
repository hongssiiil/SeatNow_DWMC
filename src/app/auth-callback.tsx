import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { completeAppleWebAuth, isAppleWebAuthInFlight } from '../lib/appleAuth';
import { describeAuthError } from '../lib/authMessages';
import { useApp } from '../lib/store';
import { colors } from '../lib/theme';

/**
 * Apple 웹 OAuth 리다이렉트(`seatnowapp://auth-callback`) 착지 화면.
 *
 * 이 라우트가 없으면 expo-router가 "Unmatched Route" 오류 화면을 띄운다.
 *
 * 두 경우를 나눠 처리한다.
 * - 로그인 창을 기다리는 중이면(앱이 살아 있던 경우) appleAuth.ts가 코드 교환을
 *   끝내고 화면을 옮긴다. 여기서는 아무것도 하지 않는다 — 코드는 일회용이라
 *   양쪽이 교환하면 늦은 쪽이 실패한다.
 * - 앱이 백그라운드에서 종료돼 콜드 스타트로 돌아온 경우에는 기다리는 쪽이
 *   없으므로 여기서 직접 교환해 로그인을 완성한다.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { login } = useApp();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // 기다리는 쪽이 있으면 그쪽이 끝낸다. 이 화면은 곧 대체된다.
    if (isAppleWebAuthInFlight()) return;

    const errorMessage = params.error_description ?? params.error;
    if (errorMessage) {
      Alert.alert('Apple 로그인 실패', String(errorMessage));
      router.replace('/');
      return;
    }

    const code = params.code;
    if (!code) {
      // 코드도 오류도 없이 들어온 딥링크 — 로그인 화면으로 되돌린다.
      router.replace('/');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { sub, email } = await completeAppleWebAuth(String(code));
        if (cancelled) return;
        // 웹 OAuth는 사용자 이름을 제공하지 않는다(Apple 사양).
        login('apple', { id: `apple:${sub}`, name: 'Apple 사용자', email });
        // 콜백 화면이 스택에 남으면 뒤로가기가 로그인 화면으로 돌아간다
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home');
      } catch (e) {
        if (cancelled) return;
        const { title, body } = describeAuthError('apple', e);
        Alert.alert(title, body);
        router.replace('/');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, login, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.label}>로그인 중이에요…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.bg,
  },
  label: {
    fontSize: 15,
    color: colors.sub,
  },
});
