import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 네이티브 SDK 키 — 프로젝트 루트의 .env 파일에 채워 넣으세요. (SETUP.md 참고)
 * 값을 바꾼 뒤에는 `npx expo prebuild --clean` 후 다시 빌드해야 반영됩니다.
 */
const NAVER_MAP_CLIENT_ID =
  process.env.NAVER_MAP_CLIENT_ID || 'YOUR_NAVER_MAP_CLIENT_ID';
const KAKAO_NATIVE_APP_KEY =
  process.env.KAKAO_NATIVE_APP_KEY || 'YOUR_KAKAO_NATIVE_APP_KEY';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Take In',
  slug: config.slug ?? 'seatnow-app',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.seatnow.takein',
    usesAppleSignIn: true,
  },
  android: {
    ...config.android,
    package: 'com.seatnow.takein',
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      '@mj-studio/react-native-naver-map',
      {
        client_id: NAVER_MAP_CLIENT_ID,
        android: {
          ACCESS_FINE_LOCATION: true,
          ACCESS_COARSE_LOCATION: true,
        },
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://repository.map.naver.com/archive/maven',
            'https://devrepo.kakao.com/nexus/content/groups/public/',
          ],
        },
      },
    ],
    [
      '@react-native-kakao/core',
      {
        nativeAppKey: KAKAO_NATIVE_APP_KEY,
        android: { authCodeHandlerActivity: true },
        ios: { handleKakaoOpenUrl: true },
      },
    ],
    'expo-apple-authentication',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          '주변 카페의 빈자리를 보여주기 위해 현재 위치를 사용합니다.',
      },
    ],
  ],
  extra: {
    ...config.extra,
    kakaoNativeAppKey: KAKAO_NATIVE_APP_KEY,
  },
});
