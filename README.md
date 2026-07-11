# SeatNow (React Native / Expo)

카페 방문 전 실시간 빈자리를 확인하는 앱. 원본 웹 버전(React + Vite, `../app_test`)을 React Native(Expo)로 이식한 프로젝트입니다.

## 기술 스택

- **Expo SDK 57** + **expo-router** (파일 기반 라우팅)
- **NativeWind** (Tailwind className) — 라이트 전용
- **Moti** / **react-native-reanimated** (애니메이션·제스처)
- **@gorhom/bottom-sheet** (지도 3단 스냅 시트)
- **lucide-react-native** (아이콘), **react-native-svg** (커스텀 SVG)

## 실행 방법

```bash
npm install
npm run start      # Expo 개발 서버 (QR로 Expo Go 연결)
npm run web        # 웹 미리보기 (http://localhost:8081)
npm run android    # Android 에뮬레이터/기기
npm run ios        # iOS 시뮬레이터 (macOS 필요)
```

## 화면 흐름

```
splash → login → (email-login / sign-up → preferences) → map
map → cafe/[id] (상세) · saved (저장 목록)
```

## 구조

```
src/
  app/          expo-router 라우트 (얇은 래퍼 — 화면에 네비게이션 콜백 주입)
  screens/      실제 화면 UI 컴포넌트
  components/   공유 컴포넌트 (로고, 입력, 바텀시트 등)
  context/      SessionProvider (로그인 상태 · 저장 목록)
  data/         목 데이터 (카페 · 좌석)
  global.css    NativeWind 진입점
```

변환 과정과 결정 사항은 [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md) 참고.
