import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { initKakao } from '../lib/auth';
import {
  cafeIdFromNotification,
  configureNotificationHandler,
} from '../lib/pushToken';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

configureNotificationHandler();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initKakao();
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
