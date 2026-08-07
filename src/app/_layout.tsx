import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { initKakao } from '../lib/auth';
import {
  cafeIdFromNotification,
  configureNotificationHandler,
} from '../lib/pushToken';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

configureNotificationHandler();

/**
 * 스플래시를 로고가 읽힐 만큼만 띄운다.
 *
 * 기본 동작은 JS가 준비되는 즉시 사라지는 것이라, 기기가 빠르면 로고가
 * 번쩍이고 만다. 자동 숨김을 막아두고 아래에서 직접 내린다.
 */
const SPLASH_MIN_MS = 1200;
SplashScreen.preventAutoHideAsync().catch(() => {
  // 이미 숨겨졌거나 스플래시가 없는 환경 — 무시해도 앱 동작에 영향 없다
});
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initKakao();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // 알림 탭 → 해당 카페 상세로 이동.
  // 앱이 종료된 상태에서 알림으로 실행된 경우도 처리해야 하므로
  // 마지막 응답을 먼저 확인한 뒤 리스너를 건다.
  useEffect(() => {
    let cancelled = false;

    const openCafe = (data: unknown) => {
      const cafeId = cafeIdFromNotification(data);
      if (cafeId) router.push(`/cafe/${cafeId}`);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      openCafe(response.notification.request.content.data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      openCafe(r.notification.request.content.data);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" />
          {/* 하단 탭바 제거 — 홈/마이페이지는 스택 스크린이고,
              마이페이지는 홈 검색바의 프로필 버튼으로 진입한다 */}
          <Stack.Screen name="home" />
          <Stack.Screen name="mypage" />
          <Stack.Screen name="search" />
          <Stack.Screen name="cafe/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy" />
          {/* Apple 웹 OAuth 리다이렉트 착지 지점 — 없으면 Unmatched Route가 뜬다 */}
          <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
