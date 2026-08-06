import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 네이티브 SDK 키 — 로컬은 .env, EAS 빌드는 환경변수(production 환경)에서 주입된다.
 * app.json은 정적이라 키를 담을 수 없으므로 네이티브 플러그인 설정은 전부 여기서 얹는다.
 * 값을 바꾼 뒤에는 `npx expo prebuild --clean` 후 다시 빌드해야 반영된다.
 */
const NAVER_MAP_CLIENT_ID =
  process.env.NAVER_MAP_CLIENT_ID || 'YOUR_NAVER_MAP_CLIENT_ID';
const KAKAO_NATIVE_APP_KEY =
  process.env.KAKAO_NATIVE_APP_KEY || 'YOUR_KAKAO_NATIVE_APP_KEY';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Sitnow',
  slug: config.slug ?? 'seatnow-app',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.sitnow.app',
    usesAppleSignIn: true,
  },
  android: {
    ...config.android,
    package: 'com.sitnow.app',
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
