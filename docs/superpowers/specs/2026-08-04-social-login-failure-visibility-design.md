# 소셜 로그인: 조용한 실패 제거 설계

작성일: 2026-08-04
브랜치: `add_like_review`

## 배경

카카오·Apple 로그인이 실패해도 사용자가 모르는 채 앱에 진입하는 경로가 존재한다.

`src/lib/auth.ts`의 `signInWithKakao` / `signInWithApple`은 실패 상황에서 두 가지로 갈린다.

- **throw** — `src/app/index.tsx`의 `catch`가 Alert를 띄우고 `router.replace`가 실행되지 않아 진입이 차단된다. 올바른 동작이다.
- **`null` 반환** — `login(provider, result ?? undefined)`로 이어져 목업 사용자(`mock:kakao` / `mock:apple`, 이름 "테이크인 회원")로 **로그인 처리되고 홈에 진입한다.** Alert가 없고 `isGuest=false`라 정식 회원으로 취급된다.

`null`이 반환되는 조건:

| 함수 | 조건 | 위치 |
|---|---|---|
| `signInWithApple` | `Platform.OS !== 'ios'` | `auth.ts:70` |
| | `expo-apple-authentication` require 실패 | `auth.ts:75` |
| | `isAvailableAsync()`가 false | `auth.ts:81` |
| `signInWithKakao` | `@react-native-kakao/user` require 실패 | `auth.ts:49` |
| | 키 미설정 또는 `YOUR_`로 시작 | `auth.ts:52` |

Expo Go 대응용으로 의도된 설계이나(주석에 명시) 실제 빌드에서도 그대로 동작한다.

추가로 두 가지 결함이 있다.

1. **Android에 Apple 버튼이 노출된다.** `index.tsx`에 `Platform` 검사가 없어 "Apple로 계속하기"가 Android에도 렌더링되고, 누르면 `Platform.OS !== 'ios'` → `null` → 인증 없이 회원 진입한다.
2. **`AuthResult.id`가 optional이다.** SDK가 id를 주지 않으면 `store.tsx`의 `const key = profile?.id ?? \`mock:${provider}\``가 공용 키로 떨어져, 즐겨찾기·방문기록이 사용자 간에 섞인다. 에러 없이 로그인은 성공한 것처럼 보인다.

## 목표

모든 로그인 실패를 사용자에게 표면화한다. 사용자 취소도 포함한다.

## 범위

이 스펙은 실패의 **가시성**만 다룬다. 실제 로그인 성공률 개선(Android의 Apple 로그인 지원, 검증된 세션 도입)은 후속 하위 프로젝트의 몫이다.

- **하위 프로젝트 2** — Supabase Auth 도입. Apple 하이브리드(iOS 네이티브 + 웹 OAuth 폴백), Android 웹 OAuth, 카카오 네이티브 토큰을 Edge Function으로 Supabase 세션과 교환
- **하위 프로젝트 3** — `user_key` → `auth.uid()` 마이그레이션 및 RLS 강화 (테이블 7개, 소스 6개 파일 88개 참조)

## 설계

### 에러 모델

`auth.ts`의 함수는 `null`을 반환하지 않는다. 성공 시 `AuthResult`, 실패 시 항상 throw.

```ts
export type AuthFailureReason =
  | 'CANCELLED'             // 사용자가 직접 취소
  | 'UNSUPPORTED_PLATFORM'  // Android에서 Apple 호출
  | 'NATIVE_MODULE_MISSING' // Expo Go 등 네이티브 모듈 부재
  | 'NOT_CONFIGURED'        // SDK 키 미설정
  | 'UNAVAILABLE'           // isAvailableAsync() === false
  | 'PROVIDER_ERROR';       // SDK·서버가 반환한 실패

export class AuthError extends Error {
  constructor(
    readonly reason: AuthFailureReason,
    message: string,
    readonly cause?: unknown,
  );
}
```

반환 타입이 `Promise<AuthResult | null>` → `Promise<AuthResult>`로 바뀌고, 기존 `null` 반환 5곳이 모두 throw가 된다.

`AuthResult.id`는 **필수**로 바꾼다. SDK가 id를 주지 않으면 `PROVIDER_ERROR`로 throw한다.

취소 정규화(`isCancelError`)는 유지한다. 카카오와 Apple이 취소를 각각 다르게 표현하기 때문이다. Apple은 `ERR_REQUEST_CANCELED`, 카카오는 `E_CANCELLED` 및 메시지 문자열을 사용한다.

모든 throw 직전에 `console.error('[auth]', { provider, reason, cause })`를 남긴다. 원인 미확정 상태인 Apple 로그인 문제를 계속 추적해야 한다.

### 사용자 문구

`src/lib/authMessages.ts`를 신설한다. `describeAuthError(provider, error) → { title, body }`. `auth.ts`는 인증 수행만, `index.tsx`는 렌더링만 담당한다.

| reason | 문구 |
|---|---|
| `CANCELLED` | 로그인 취소 / 로그인을 취소했어요. |
| `UNSUPPORTED_PLATFORM` | Apple 로그인은 iOS에서만 사용할 수 있어요. |
| `NATIVE_MODULE_MISSING` | 이 빌드에 로그인 모듈이 없어요. 개발 빌드에서 시도해 주세요. |
| `NOT_CONFIGURED` | 카카오 앱 키가 설정되지 않았어요. (`.env`의 `KAKAO_NATIVE_APP_KEY`) |
| `UNAVAILABLE` | 이 기기에서 Apple 로그인을 쓸 수 없어요. Apple 계정 로그인 상태를 확인해 주세요. |
| `PROVIDER_ERROR` | 로그인 실패 / **SDK 원본 메시지 포함** |

`PROVIDER_ERROR`는 원본 메시지를 본문에 포함한다. 원인 추적에 필요한 정보를 잃지 않기 위한 의도적 선택이다.

### 로그인 화면

`index.tsx`의 `enterSocial`은 `?? undefined` 폴백을 제거하고, `catch`에서 취소를 포함한 모든 실패에 Alert를 띄운다. `router.replace`는 `try` 블록 안에 유지한다.

Apple 버튼은 `Platform.OS === 'ios'`일 때만 렌더링한다. `signInWithApple`의 `UNSUPPORTED_PLATFORM` throw는 방어용으로 남긴다.

### 스토어

`store.tsx`의 `login(provider, profile?)`에서 `profile`을 필수로 만들고 `id`도 필수로 받는다. `mock:${provider}` 폴백 키와 `fallbackName`('테이크인 회원')을 제거한다. 이름 기본값은 `auth.ts`가 이미 채운다.

## 영향

- **Expo Go에서 로그인이 불가능해진다.** `NATIVE_MODULE_MISSING` Alert가 뜬다. `비회원으로 둘러보기`는 유지되므로 앱 탐색은 가능하다.
- 기존 `mock:kakao` / `mock:apple` 키로 저장된 데이터는 접근 불가가 되지만 삭제하지 않는다. 정리는 하위 프로젝트 3에서 다룬다.

## 테스트

테스트 프레임워크가 없으므로 `jest-expo`, `jest`, `@types/jest`를 추가하고 `test` 스크립트를 만든다. 대상은 순수 로직으로 한정한다. 네이티브 SDK 실제 통신은 제외한다.

| 파일 | 검증 |
|---|---|
| `authMessages.test.ts` | `AuthFailureReason` 6종 전부 문구 반환 / `PROVIDER_ERROR`가 원본 메시지 포함 |
| `auth.test.ts` | 모듈 부재 → `NATIVE_MODULE_MISSING` / 키가 `YOUR_` → `NOT_CONFIGURED` / 취소 코드 → `CANCELLED` / id 없는 프로필 → `PROVIDER_ERROR` / Android + Apple → `UNSUPPORTED_PLATFORM` |

핵심 회귀 방지선은 **어떤 입력에도 `null`이 반환되지 않는다**는 것이다.

### 수동 검증

| 시나리오 | 플랫폼 | 기대 |
|---|---|---|
| Apple 버튼 렌더링 | Android | 버튼 없음 |
| Apple 버튼 렌더링 | iOS | 버튼 있음 |
| Apple 로그인 실패 | iOS | Alert에 원본 메시지, 진입 차단 |
| Apple 시트 취소 | iOS | "로그인 취소" Alert |
| 카카오 로그인 성공 | iOS · Android | 홈 진입, 키가 `kakao:{id}` |
| 카카오 취소 | iOS · Android | "로그인 취소" Alert |
| 카카오 키 제거 | 양쪽 | `NOT_CONFIGURED` Alert |
| Expo Go | 양쪽 | `NATIVE_MODULE_MISSING` Alert, 비회원 둘러보기 정상 |

검증의 외부 전제:

1. Android 카카오 로그인은 카카오 콘솔에 **키 해시 등록**이 필요하다. 현재 등록 상태는 확인되지 않았다.
2. iOS Apple 항목은 "실패가 올바르게 표면화되는가"만 검증한다. 로그인 성공은 미해결 문제 때문에 이 범위에서 확인할 수 없다.

## 미해결: iOS Apple 로그인 실패

원인이 확정되지 않았다. 확인된 사실은 다음과 같다.

- 앱이 보내는 client ID는 `com.seatnow.takein`, 팀 `72MN25L276`
- iOS 반환 메시지: "잘못된 클라이언트 ID를 지정. 콘솔에서 앱 Bundle Identifier를 잘못 등록함"
- 시뮬레이터 바이너리의 `__TEXT,__entitlements`에 `com.apple.developer.applesignin: [Default]`와 `application-identifier: 72MN25L276.com.seatnow.takein`이 정상 임베드됨
- Xcode가 해당 entitlement를 포함한 프로비저닝 프로파일을 발급받는 데 성공했다. 포털 API가 App ID의 capability를 인정한다는 뜻이다.
- 팀은 `type='Individual'`, `isFreeProvisioningTeam='0'` (유료)
- 시뮬레이터는 `fifawithkupa77@naver.com`으로 iCloud 로그인됨
- 포털의 App ID 존재·capability 체크·primary App ID 설정은 사용자가 확인함

포털 API는 capability를 인정하는데 인증 서버는 같은 client ID를 거부하는 모순 상태다. 런타임 에러 코드를 확보하지 못해 확정에 이르지 못했다. 유력한 가설은 포털 설정의 인증 서버 전파 지연이다.

이 불확실성이 하위 프로젝트 2에서 Apple 웹 OAuth 폴백을 함께 두는 근거다.
