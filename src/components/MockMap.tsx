import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cafe } from '../lib/data';
import { colors, seatStatus } from '../lib/theme';

/** 네이버 지도 느낌의 연녹색 목업 지도 (Expo Go 호환) */
export function MockMap({
  cafes,
  bookmarkedIds = [],
  onPressMarker,
  showLabels = true,
  children,
}: {
  cafes: Cafe[];
  bookmarkedIds?: string[];
  onPressMarker?: (cafe: Cafe) => void;
  showLabels?: boolean;
  children?: React.ReactNode;
}) {
  const savedSet = new Set(bookmarkedIds);
  return (
    <View style={styles.map}>
      {/* 블록(건물 단지) */}
      {BLOCKS.map((b, i) => (
        <View
          key={`b${i}`}
          style={[
            styles.block,
            {
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              transform: [{ rotate: `${b.r}deg` }],
            },
          ]}
        />
      ))}
      {/* 도로 */}
      {ROADS.map((r, i) => (
        <View
          key={`r${i}`}
          style={[
            styles.road,
            {
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: r.thick,
              transform: [{ rotate: `${r.r}deg` }],
            },
          ]}
        />
      ))}
      {/* 지명 라벨 */}
      {showLabels &&
        PLACE_LABELS.map((l, i) => (
          <Text
            key={`l${i}`}
            style={[styles.placeLabel, { left: `${l.x}%`, top: `${l.y}%` }]}
            numberOfLines={2}
          >
            {l.text}
          </Text>
        ))}
      {/* 현재 위치 */}
      <View style={[styles.meWrap, { left: '48%', top: '52%' }]}>
        <View style={styles.meHalo} />
        <View style={styles.meDot} />
      </View>
      {/* 카페 마커 — 저장한 곳은 빨강 */}
      {cafes.map((cafe) => {
        const status = seatStatus(cafe.congestion);
        const saved = savedSet.has(cafe.id);
        // 미설정('정보 없음')은 속 빈 마커 — 자리 있음으로 단정하지 않는다
        const unknown = status === 'unknown' && !saved;
        return (
          <Pressable
            key={cafe.id}
            style={[styles.markerWrap, { left: `${cafe.mapX}%`, top: `${cafe.mapY}%` }]}
            onPress={() => onPressMarker?.(cafe)}
          >
            <View
              style={[
                styles.marker,
                status === 'full' && !saved && { backgroundColor: colors.markerFull },
                unknown && styles.markerUnknown,
                saved && styles.markerSaved,
              ]}
            >
              <Ionicons
                name="cafe"
                size={15}
                color={unknown ? colors.sage : colors.white}
              />
            </View>
            {showLabels && <Text style={styles.markerLabel}>{cafe.name}</Text>}
          </Pressable>
        );
      })}
      {children}
    </View>
  );
}

/** 로그인 히어로용 말풍선 */
export function SpeechBubble({
  text,
  color,
  style,
}: {
  text: string;
  color: string;
  style?: object;
}) {
  return (
    <View style={[styles.bubbleWrap, style]}>
      <View style={styles.bubble}>
        <Text style={[styles.bubbleText, { color }]}>{text}</Text>
      </View>
      <View style={styles.bubbleTail} />
    </View>
  );
}

const BLOCKS = [
  { x: 4, y: 6, w: 16, h: 10, r: -8 },
  { x: 26, y: 3, w: 14, h: 9, r: 4 },
  { x: 55, y: 8, w: 18, h: 11, r: -3 },
  { x: 80, y: 4, w: 14, h: 9, r: 6 },
  { x: 8, y: 40, w: 15, h: 12, r: 5 },
  { x: 30, y: 36, w: 13, h: 10, r: -6 },
  { x: 58, y: 55, w: 16, h: 11, r: 3 },
  { x: 78, y: 34, w: 15, h: 10, r: -4 },
  { x: 14, y: 74, w: 17, h: 11, r: -5 },
  { x: 44, y: 78, w: 14, h: 10, r: 7 },
  { x: 72, y: 80, w: 16, h: 10, r: -2 },
  { x: 38, y: 58, w: 10, h: 8, r: 12 },
];

const ROADS = [
  { x: -10, y: 22, w: 130, thick: 10, r: 6 },
  { x: -10, y: 66, w: 130, thick: 8, r: -4 },
  { x: 20, y: -20, w: 140, thick: 9, r: 78 },
  { x: -35, y: 30, w: 140, thick: 7, r: 100 },
  { x: 10, y: 45, w: 90, thick: 5, r: -12 },
  { x: 30, y: 90, w: 90, thick: 6, r: -30 },
];

const PLACE_LABELS = [
  { x: 6, y: 30, text: '비건마마' },
  { x: 16, y: 16, text: '파리바게트\n서울대입구역점' },
  { x: 2, y: 55, text: '팀홀튼\n서울대입구역점' },
  { x: 30, y: 8, text: '오웜케이크' },
  { x: 62, y: 14, text: '리치몬트 본점' },
  { x: 70, y: 88, text: '무해바이닐' },
  { x: 40, y: 92, text: '티페' },
];

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: colors.mapBg,
    overflow: 'hidden',
  },
  block: {
    position: 'absolute',
    backgroundColor: colors.mapBlock,
    borderRadius: 6,
  },
  road: {
    position: 'absolute',
    backgroundColor: colors.mapRoad,
    borderRadius: 4,
  },
  placeLabel: {
    position: 'absolute',
    fontSize: 11,
    color: colors.mapLabel,
    fontWeight: '600',
    textAlign: 'center',
  },
  meWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
  },
  meHalo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74,125,247,0.18)',
  },
  meDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.locationDot,
    borderWidth: 3,
    borderColor: colors.white,
  },
  markerWrap: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -16,
    marginTop: -16,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.marker,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  markerSaved: {
    backgroundColor: '#EB5757',
  },
  // 정보 없음 — 흰 채움 + 세이지 테두리 (속 빈 모양)
  markerUnknown: {
    backgroundColor: colors.white,
    borderColor: colors.sage,
    borderWidth: 2,
  },
  markerLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5A4E',
  },
  bubbleWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '800',
  },
  bubbleTail: {
    width: 12,
    height: 12,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
    marginTop: -7,
    borderRadius: 2,
  },
});
