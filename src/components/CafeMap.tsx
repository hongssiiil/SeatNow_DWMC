import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cafe, INITIAL_CAMERA } from '../lib/data';
import { colors, seatStatus, statusLabel } from '../lib/theme';
import { MockMap } from './MockMap';

// 지도 마커 (초록 자리있음 / 회색 만석 / 빨강 저장) — 얇은 흰 테두리
const MARKER_AVAILABLE = require('../../assets/images/marker-available.png');
const MARKER_FULL = require('../../assets/images/marker-full.png');
const MARKER_SAVED = require('../../assets/images/marker-saved.png');
// 사장님이 현황을 알려주지 않은 가게 — 속 빈 마커로 단정을 피한다
const MARKER_UNKNOWN = require('../../assets/images/marker-unknown.png');

let NaverMap: any = null;
try {
  // Expo Go에는 네이티브 모듈이 없어 require가 실패한다 → 목업 지도로 폴백
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NaverMap = require('@mj-studio/react-native-naver-map');
} catch {
  NaverMap = null;
}

let ExpoLocation: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoLocation = require('expo-location');
} catch {
  ExpoLocation = null;
}

export type CafeMapHandle = {
  moveToMyLocation: () => Promise<boolean>;
};

/**
 * 카페 지도. development build에서는 네이버 지도 SDK,
 * Expo Go에서는 목업 지도를 렌더링한다.
 * 저장(즐겨찾기)한 카페는 빨간 마커로 표시.
 *
 * 현위치 버튼은 네이티브 UI 대신 홈에서 커스텀 배치
 * (바텀시트와 겹치지 않도록).
 */
export const CafeMap = forwardRef<
  CafeMapHandle,
  {
    cafes: Cafe[];
    /** 저장한 카페 id — 빨간 마커 */
    bookmarkedIds?: string[];
    onPressMarker?: (cafe: Cafe) => void;
    /** 지도를 탭하거나 제스처로 움직였을 때 호출 (바텀시트 숨김용) */
    onMapInteract?: () => void;
    /** 바텀시트에 가려지지 않게 UI 컨트롤을 올릴 하단 여백(px) */
    bottomControlsInset?: number;
  }
>(function CafeMap(
  {
    cafes,
    bookmarkedIds = [],
    onPressMarker,
    onMapInteract,
    bottomControlsInset = 168,
  },
  ref
) {
  const [locationGranted, setLocationGranted] = useState(false);
  const savedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!NaverMap || !ExpoLocation) return;
    ExpoLocation.requestForegroundPermissionsAsync()
      .then(({ status }: { status: string }) =>
        setLocationGranted(status === 'granted')
      )
      .catch(() => {});
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      moveToMyLocation: async () => {
        if (!ExpoLocation) return false;
        try {
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status !== 'granted') return false;
          setLocationGranted(true);
          const pos = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy?.Balanced ?? 3,
          });
          const { latitude, longitude } = pos.coords;
          mapRef.current?.animateCameraTo?.({
            latitude,
            longitude,
            zoom: 15,
            duration: 450,
          });
          // Follow 모드가 있으면 함께 켜 현위치 표시 유지
          mapRef.current?.setLocationTrackingMode?.('Follow');
          return true;
        } catch {
          return false;
        }
      },
    }),
    []
  );

  if (!NaverMap) {
    return (
      <View style={{ flex: 1 }} onTouchEnd={onMapInteract}>
        <MockMap
          cafes={cafes}
          bookmarkedIds={bookmarkedIds}
          onPressMarker={onPressMarker}
          showLabels={false}
        />
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackText}>
            Expo Go 미리보기 · 네이버 지도는 development build에서 표시돼요
          </Text>
        </View>
      </View>
    );
  }

  const { NaverMapView, NaverMapMarkerOverlay } = NaverMap;
  const inset = Math.max(0, bottomControlsInset);

  return (
    <NaverMapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialCamera={INITIAL_CAMERA}
      // 홈에서 커스텀 현위치 버튼 사용 (시트와 겹침 방지)
      isShowLocationButton={false}
      isShowZoomControls={false}
      logoAlign="BottomRight"
      logoMargin={{ bottom: inset, right: 12 }}
      mapPadding={{ bottom: inset }}
      locale="ko"
      onTapMap={() => onMapInteract?.()}
      onCameraChanged={(e: { reason?: string }) => {
        if (e?.reason === 'Gesture') onMapInteract?.();
      }}
    >
      {cafes.map((cafe) => {
        const saved = savedSet.has(cafe.id);
        const status = seatStatus(cafe.congestion);
        const image = saved
          ? MARKER_SAVED
          : status === 'full'
            ? MARKER_FULL
            : status === 'available'
              ? MARKER_AVAILABLE
              : MARKER_UNKNOWN;
        // 미설정 가게를 '자리 있음'으로 단정하지 않는다
        const label = statusLabel(status);
        return (
          <NaverMapMarkerOverlay
            key={cafe.id}
            latitude={cafe.lat}
            longitude={cafe.lng}
            anchor={{ x: 0.5, y: 0.5 }}
            width={16}
            height={16}
            image={image}
            caption={{
              text: cafe.name,
              textSize: 12,
              color: '#3A5244',
              haloColor: '#F4F3EC',
            }}
            subCaption={{
              text: saved ? `저장 · ${label}` : label,
              textSize: 10,
              color: saved
                ? '#C4574C'
                : status === 'full'
                  ? '#C4574C'
                  : status === 'available'
                    ? '#3E7A52'
                    : colors.sub,
              haloColor: '#FFFFFF',
            }}
            onTap={() => onPressMarker?.(cafe)}
          />
        );
      })}
    </NaverMapView>
  );
});

const styles = StyleSheet.create({
  fallbackBanner: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    backgroundColor: 'rgba(31,58,45,0.85)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  fallbackText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});
