import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cafe, INITIAL_CAMERA } from '../lib/data';
import { colors } from '../lib/theme';
import { MockMap } from './MockMap';

// 지도 마커 이미지 (#3A8A63 / 만석 회색) — assets/images에서 생성된 PNG
const MARKER_AVAILABLE = require('../../assets/images/marker-available.png');
const MARKER_FULL = require('../../assets/images/marker-full.png');

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

/**
 * 카페 지도. development build에서는 네이버 지도 SDK,
 * Expo Go에서는 목업 지도를 렌더링한다.
 */
export function CafeMap({
  cafes,
  onPressMarker,
  onMapInteract,
}: {
  cafes: Cafe[];
  onPressMarker?: (cafe: Cafe) => void;
  /** 지도를 탭하거나 제스처로 움직였을 때 호출 (바텀시트 숨김용) */
  onMapInteract?: () => void;
}) {
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    if (!NaverMap || !ExpoLocation) return;
    ExpoLocation.requestForegroundPermissionsAsync()
      .then(({ status }: { status: string }) =>
        setLocationGranted(status === 'granted')
      )
      .catch(() => {});
  }, []);

  if (!NaverMap) {
    return (
      <View style={{ flex: 1 }} onTouchEnd={onMapInteract}>
        <MockMap cafes={cafes} onPressMarker={onPressMarker} showLabels={false} />
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackText}>
            Expo Go 미리보기 · 네이버 지도는 development build에서 표시돼요
          </Text>
        </View>
      </View>
    );
  }

  const { NaverMapView, NaverMapMarkerOverlay } = NaverMap;

  return (
    <NaverMapView
      style={{ flex: 1 }}
      initialCamera={INITIAL_CAMERA}
      isShowLocationButton={locationGranted}
      isShowZoomControls={false}
      logoAlign="BottomRight"
      locale="ko"
      onTapMap={() => onMapInteract?.()}
      onCameraChanged={(e: { reason?: string }) => {
        if (e?.reason === 'Gesture') onMapInteract?.();
      }}
    >
      {cafes.map((cafe) => {
        const full = cafe.seatsAvailable <= 0;
        return (
          <NaverMapMarkerOverlay
            key={cafe.id}
            latitude={cafe.lat}
            longitude={cafe.lng}
            anchor={{ x: 0.5, y: 0.5 }}
            width={16}
            height={16}
            image={full ? MARKER_FULL : MARKER_AVAILABLE}
            caption={{
              text: cafe.name,
              textSize: 12,
              color: '#3A5244',
              haloColor: '#F4F3EC',
            }}
            subCaption={{
              text: full ? '만석' : `여유 ${cafe.seatsAvailable}석`,
              textSize: 10,
              color: full ? '#C4574C' : '#3E7A52',
              haloColor: '#FFFFFF',
            }}
            onTap={() => onPressMarker?.(cafe)}
          />
        );
      })}
    </NaverMapView>
  );
}

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
