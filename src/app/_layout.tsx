import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/context/session';
import '@/global.css';

// Root navigator. SeatNow is a light-only stack app (no tabs, no dark mode).
// GestureHandlerRootView is required for the gorhom bottom sheet used in Phase 5.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#ffffff' },
            }}
          >
            {/* Splash fades rather than slides */}
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
          </Stack>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
