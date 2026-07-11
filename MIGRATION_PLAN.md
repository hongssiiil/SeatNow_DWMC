# SeatNow 웹 → React Native (Expo) 변환 계획

> 원본 웹 프로젝트: `../app_test` (React + Vite, Figma Make 생성)
> 대상: `./seatnow-mobile` (Expo + expo-router)
> 작성일: 2026-07-11

---

## 0. 조사에서 드러난 핵심 사실

변환 전략을 바꾸는 3가지 발견:

1. **shadcn `ui/` 폴더(50개 컴포넌트)는 실제로 하나도 안 쓰인다.**
   화면 코드에서 `ui/`를 import하는 곳이 0곳. Figma Make가 기본으로 넣은 죽은 보일러플레이트 → **그냥 버린다.**

2. **지도(MapScreen)는 진짜 지도가 아니라 "가짜 지도" 목업이다.**
   Google Maps / Mapbox SDK를 안 쓴다. 카페를 `mx/my` 픽셀 좌표로 배경 위에 얹은 스타일링 div → **지도 SDK 연동 불필요.**

3. **실제 의존성은 3가지뿐.**
   - `motion/react` — 애니메이션 + 드래그 제스처
   - `lucide-react` — 아이콘
   - Tailwind className(339곳) + 인라인 style(78곳)

---

## 1. 변환할 화면 목록 (8화면 + 공유 3개)

| # | 화면 | 줄 수 | 난이도 | 비고 |
|---|------|-------|--------|------|
| 1 | SplashScreen | 15 | 🟢 쉬움 | 로고 + 타이머 |
| 2 | LoginLanding | 179 | 🟢 쉬움 | 소셜/이메일 버튼 |
| 3 | EmailLogin | 131 | 🟢 쉬움 | 입력폼 (비밀번호 토글) |
| 4 | SignUp | 109 | 🟢 쉬움 | 입력폼 |
| 5 | PreferenceSetup | 103 | 🟢 쉬움 | 선택 UI |
| 6 | SavedScreen | 138 | 🟡 보통 | 리스트 |
| 7 | CafeDetailScreen | 356 | 🟠 어려움 | 상세 + 바텀시트 + 에러상태 |
| 8 | MapScreen | 470 | 🔴 가장 어려움 | 가짜 지도 + 드래그 바텀시트 |
| 공유 | SeatNowLogo / SeatBottomSheet / LoginPromptSheet | 52/64/54 | 🟡 | 여러 화면 재사용 |

총 ~1,671줄. 난이도는 MapScreen과 CafeDetailScreen에 집중.

---

## 2. shadcn 및 웹 요소 → RN 대체 전략

shadcn `ui/`는 미사용이므로, 실제 대체 대상은 **웹 기본 요소 → RN 요소**:

| 웹 (현재) | React Native (변환 후) | 방법 |
|-----------|----------------------|------|
| `<div>` | `<View>` | 구조 요소 |
| 텍스트(`<p>`,`<span>`, 생 문자열) | `<Text>` | ⚠️ RN은 모든 텍스트를 `<Text>`로 감싸야 함 |
| `className="..."` (Tailwind 339곳) | **그대로 유지** | **NativeWind** 도입 → className 유지 (최대 이득) |
| `<img>` / ImageWithFallback | `<Image>` | expo-image |
| `motion/react` (애니메이션) | **Moti** | motion과 API가 가장 유사 |
| `motion` 드래그 (바텀시트) | `@gorhom/bottom-sheet` | 스냅 바텀시트 교체 |
| `lucide-react` | `lucide-react-native` | 이름 동일, import만 변경 |
| 상태기반 화면 전환 (App.tsx) | **expo-router** | 파일 기반 라우팅 |
| `100dvh`, `max-w-[430px]` 중앙정렬 | 전체화면 SafeAreaView | 웹의 "폰 프레임"은 실기기에선 불필요 |
| box-shadow 등 일부 CSS | shadow props / elevation | RN 미지원 CSS 소수 보정 |

**핵심 판단:** NativeWind로 className 339곳을 거의 그대로 살린다. 인라인 style 78곳 중 그림자·dvh 등 소수만 보정.

---

## 3. 작업 순서 (의존성 순)

### Phase 0 — 프로젝트 셋업 (토대) ✅ 완료
- [x] expo-router 기반 새 Expo 프로젝트 생성 (SDK 57, RN 0.86, React 19)
- [x] NativeWind + Moti + @gorhom/bottom-sheet + lucide-react-native + react-native-svg 설치 (expo-font/expo-image는 템플릿 기본 포함)
- [x] NativeWind 설정 (tailwind.config.js / metro.config.js / babel.config.js / global.css / css.d.ts)
- [x] 웹 export로 번들링 + arbitrary hex 클래스 컴파일 검증 완료
- 참고: theme.css(shadcn 토큰)는 화면이 색을 인라인 hex로 박아써서 이식 불필요. Nunito 폰트도 실제 미사용.

### Phase 1 — 공유 기반 요소 (모든 화면이 의존) ✅ 완료
- [x] SeatNowLogo 변환 — SVG가 아니라 **PNG(seatnow-logo.png) + Text**였음. expo Image + 중첩 Text로 이식
- [x] 로고 에셋 복사 (assets/images/seatnow-logo.png)
- [x] 공통 변환 패턴 확립: `<div>`→`<View>`, 텍스트→`<Text>`, className 유지, flex는 RN이 기본 column이라 `flex-col` 명시
- [~] 폰트 로딩 — 화면에서 Nunito 미사용 확인, 보류 (필요 시 expo-font로 추가)
- [~] 색상/테마 토큰 — 화면이 인라인 hex 사용, 별도 이식 불필요
- 웹 미리보기(localhost:8081)로 로고+태그라인 렌더 검증 완료

### Phase 2 — 쉬운 화면부터 (패턴 검증) ✅ 완료
- [x] SplashScreen, LoginLanding, EmailLogin, SignUp, PreferenceSetup 변환 (src/screens/)
- [x] 공유 컴포넌트: FadeUp(Moti), LabeledInput(입력+비밀번호 토글)
- [x] SVG 아이콘(카카오/애플/좌석) → react-native-svg, lucide → lucide-react-native
- [x] 임시 미리보기 하네스(src/app/index.tsx) — 원본 App.tsx 흐름 재현, 웹에서 클릭 이동 가능
- [x] 웹 번들 검증 완료 (3426 모듈, 에러 0)
- **변환 패턴 확립:** div→View, 텍스트→Text, button→Pressable(active:), input→TextInput(+placeholderTextColor/focus는 state로), space-y→gap, motion→Moti(translateY, delay ms), overflow-auto→ScrollView, br→`{'\n'}`
- **알아둘 이슈:** 웹 정적렌더(SSR)에서 tslib interop 오류 발생 → `app.json`의 `web.output`을 `static`→`single`(SPA)로 변경해 우회. 네이티브에는 영향 없음.

### Phase 3 — 네비게이션 연결 ✅ 완료
- [x] App.tsx 상태머신 → expo-router 파일 기반 라우팅
- [x] 라우트: index(splash)/login/email-login/sign-up/preferences/map/saved/cafe/[id]
- [x] 공유 상태(로그인·저장목록) → `src/context/session.tsx` (SessionProvider + useSession)
- [x] 화면 컴포넌트는 그대로 두고, 얇은 라우트 파일이 router.push/replace/back을 콜백에 연결 (관심사 분리)
- [x] 루트 _layout: Stack(animation `slide_from_right`, splash는 `fade`) + GestureHandlerRootView(Phase 5 대비) + SafeAreaProvider + 라이트 고정
- [x] map/saved/cafe는 PhasePlaceholder로 임시 라우트 (네비게이션 walkable)
- [x] 다크모드 정리: tailwind darkMode `class`, _layout 라이트 고정
- [x] 템플릿 데모 파일 정리(early Phase 6): animated-icon/app-tabs/themed-*/hint-row/web-badge/external-link/ui/hooks/constants + explore.tsx 삭제
- **이슈 메모:** 서버 켜진 채 파일 다수 삭제 시 Metro 그래프 오류(`Got unexpected undefined`) → 서버 재시작(--clear)으로 해결
- 동적 라우트 이동은 타입 안전한 객체 형태 사용: `router.push({ pathname: '/cafe/[id]', params: { id } })`

### Phase 4 — 리스트 화면 ✅ 완료
- [x] SavedScreen → FlatList (ListHeaderComponent=안내문, ListEmptyComponent=빈 상태, ItemSeparator)
- [x] 카드 진입 stagger 애니메이션 (Moti, delay index*60ms)
- [x] 공유 데이터 모듈 `src/data/cafes.ts` 생성 (CAFES/STATUS/Cafe 타입/getCafe) — SavedScreen·MapScreen 중복 제거
- [x] saved.tsx 라우트에 실제 화면 연결 (useSession의 savedIds/toggleSave)
- 북마크 토글: 카드 안 중첩 Pressable (RN은 기본적으로 이벤트 전파 안 됨 → stopPropagation 불필요)

### Phase 5 — 어려운 화면 (마지막) ✅ 완료
- [x] 공유 시트: LoginPromptSheet, SeatBottomSheet → RN Modal + Moti 슬라이드업
- [x] 좌석 데이터 공유 모듈 `src/data/seats.ts` (Seat 타입/SEATS/필터/스타일)
- [x] CafeDetailScreen: 스크롤 상세 + 좌석 평면도(% 절대배치, aspectRatio) + 고정 CTA + 에러상태 + 토스트(Moti AnimatePresence)
- [x] MapScreen: gorhom BottomSheet(3단 스냅 24/54/70%) + BottomSheetFlatList, 지도 pan/zoom(reanimated Gesture.Pan + shared value scale), 플로팅 헤더(box-none), 필터칩, 마커, 게스트 저장 프롬프트
- [x] map/cafe/[id] 라우트에 실제 화면 연결
- **단순화한 부분(Phase 6에서 개선 가능):**
  - 사진 그라디언트 → 단색 근사 (expo-linear-gradient 미도입)
  - 정렬 드롭다운 → 모바일용 바텀 모달로 대체 (더 idiomatic)
  - 지도 zoom → 레이어 전체 uniform scale (웹은 요소별 스케일)
  - 지도 탭으로 시트 접기 동작은 생략 (gorhom이 시트 드래그 처리)
- PhasePlaceholder 컴포넌트는 이제 미사용 → Phase 6에서 삭제 예정

### Phase 6 — 마무리 ✅ 완료
- [x] 미사용 파일 정리 (PhasePlaceholder 삭제, css.d.ts 단순화, SeatNowLogo 불필요 주석 제거)
- [x] `expo lint` 통과 — reanimated shared value를 `.get()/.set()` API로 전환(React Compiler immutability 규칙 충족)
- [x] README를 실제 프로젝트 설명으로 교체
- [x] 최종 검증: tsc 0 에러, lint 0 에러, 웹 전체 번들 3586 모듈 클린
- [ ] (남은 권장) 실기기/에뮬레이터 테스트 — 이 PC엔 웹 미리보기만 가능. Expo Go로 QR 스캔 권장
- [ ] (선택) expo-linear-gradient 도입해 사진 그라디언트 복원

> **원칙:** 쉬운 것 → 어려운 것, 공유 요소 → 화면 → 네비게이션 → 제스처. 가장 위험한 MapScreen을 맨 뒤에 배치하여 검증된 패턴 위에서 작업.

---

## 결정 사항

- **네비게이션:** expo-router (파일 기반)
- **프로젝트 위치:** `app_test` 옆에 새 프로젝트 `seatnow-mobile` 생성 (웹 버전 보존)
- **패키지 매니저:** npm
