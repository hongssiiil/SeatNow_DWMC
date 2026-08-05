# Sitnow — 네이티브 연동 설정 가이드

네이버 지도 SDK, 카카오 로그인, Apple 로그인은 **네이티브 모듈**이라 Expo Go에서는 동작하지 않습니다.
아래 키를 채운 뒤 **development build**로 실행해야 합니다.
(Expo Go로 실행하면 목업 지도 + 목업 로그인으로 자동 폴백되어 앱 자체는 계속 사용 가능합니다.)

---

## ✅ 채워야 할 것 (체크리스트)

`.env` 파일 (`cp .env.example .env` 후 편집):

| 키 | 어디서 발급받나 |
|----|----------------|
| `NAVER_MAP_CLIENT_ID` | [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com) → **Services → Maps** → Application 등록 → **Mobile Dynamic Map** 선택 → Client ID 복사 |
| `KAKAO_NATIVE_APP_KEY` | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → **앱 키 → 네이티브 앱 키** |

---

## 1. 네이버 지도 (NCP)

1. https://console.ncloud.com → **Services → AI·NAVER API → Maps** (신규 콘솔은 Maps 단독 메뉴)
2. Application 등록 → **Mobile Dynamic Map** 체크
3. 앱 패키지 등록 (아래 값 그대로):
   - iOS Bundle ID: `com.sitnow.app`
   - Android 패키지명: `com.sitnow.app`
4. 발급된 **Client ID**를 `.env`의 `NAVER_MAP_CLIENT_ID`에 입력

## 2. 카카오 로그인

1. https://developers.kakao.com → 애플리케이션 추가
2. **앱 키 → 네이티브 앱 키**를 `.env`의 `KAKAO_NATIVE_APP_KEY`에 입력
3. **플랫폼 등록**:
   - iOS: 번들 ID `com.sitnow.app`
   - Android: 패키지명 `com.sitnow.app`, 키 해시 등록
     (디버그 키 해시 구하기: `keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android | openssl sha1 -binary | openssl base64`)
4. **제품 설정 → 카카오 로그인 → 활성화 ON**
5. 동의항목: 닉네임(필수), 이메일(선택) 설정

## 3. Apple 로그인 (iOS만)

1. Apple Developer Program 계정 필요 (유료)
2. https://developer.apple.com → Certificates, Identifiers & Profiles → Identifiers
   → `com.sitnow.app` App ID에 **Sign in with Apple** capability 추가
3. Xcode 자동 서명을 쓰면 `npx expo run:ios` 시 자동 처리됨 (팀 선택만 필요)
4. 코드/키 발급은 따로 필요 없음 (`expo-apple-authentication`이 처리)

> 시뮬레이터에서도 Apple 로그인 테스트 가능 (iOS 시뮬레이터에 Apple ID 로그인 필요)

## 4. 빌드 & 실행

```bash
# 키 입력 후 네이티브 프로젝트 생성
npx expo prebuild --clean

# iOS (Mac + Xcode 필요)
npx expo run:ios          # 시뮬레이터
npx expo run:ios --device # 실기기

# Android (Android Studio 필요)
npx expo run:android
```

이후 개발 중에는 `npx expo start`로 시작하고, Expo Go 대신 **설치된 development build 앱**으로 열면 됩니다.

### EAS 클라우드 빌드를 쓰는 경우 (로컬 Xcode/Android Studio 없이)

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
```

`.env`는 git에 올라가지 않으므로, EAS 빌드 시에는 `eas env` 또는 `eas.json`의 `env`로 두 키를 등록하세요.

---

## 동작 방식 요약

| 환경 | 지도 | 카카오/Apple 로그인 |
|------|------|--------------------|
| Expo Go | 목업 지도 (연녹색, 안내 배너 표시) | 목업 프로필로 로그인 |
| Development build + 키 입력 | **실제 네이버 지도** (카페 129곳 마커, 현재 위치) | **실제 로그인** |

- 카페 데이터: `src/lib/cafes.json` (서울대입구·낙성대 100곳 + 대학동 29곳, 실좌표/placeId 포함)
- 좌석 수·태그·영업시간은 아직 목업(placeId 기반 결정적 생성) → Supabase 연동 시 `src/lib/data.ts`만 교체
- 카페 상세의 "길찾기"는 실제 네이버 지도 장소 페이지(`naverMapUrl`)를 엽니다
