import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initKakao } from '../lib/auth';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    initKakao();
  }, []);

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
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
