import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SeatProgress, StatusBadge } from '../../components/CafeCard';
import { updatedLabel } from '../../lib/data';
import { useSeats } from '../../lib/seats';
import { useApp } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

// 좌석 배치도 목업 (PRD 색상 규격)
const SEAT_COLORS: Record<string, string> = {
  available: '#B9E28C',
  occupied: '#F58F84',
  needs_check: '#F5DE6B',
  unavailable: '#E3E1D6',
};

export default function CafeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cafes, now, bookmarks, toggleBookmark, user, reserve } = useApp();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const cafe = cafes.find((c) => c.id === id);

  // 좌석별 실시간 상태 (Supabase seats 테이블 구독, 목업 폴백)
  const seats = useSeats(cafe?.id, {
    total: cafe?.seatsTotal ?? 0,
    available: cafe?.seatsAvailable ?? 0,
  });

  if (!cafe) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20, color: colors.ink }}>카페를 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const bookmarked = bookmarks.includes(cafe.id);

  const onBookmark = () => {
    if (!toggleBookmark(cafe.id)) {
      Alert.alert('로그인이 필요해요', '카페를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.replace('/') },
      ]);
    }
  };

  const onDirections = () => {
    // 실제 네이버 지도 장소 페이지로 이동
    Linking.openURL(cafe.naverMapUrl).catch(() =>
      Alert.alert('길찾기를 열 수 없어요')
    );
  };

  const onReserve = () => {
    if (!user) {
      Alert.alert('로그인이 필요해요', '자리를 예약하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.replace('/') },
      ]);
      return;
    }
    if (cafe.seatsAvailable <= 0) {
      Alert.alert('만석이에요', '자리가 나면 다시 시도해 주세요.');
      return;
    }
    setReserveOpen(true);
  };

  const confirmReserve = async () => {
    setReserveOpen(false);
    const ok = await reserve(cafe.id, selectedSeat);
    if (!ok) {
      Alert.alert('예약 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    Alert.alert(
      '테이크인 완료',
      `${cafe.name}${selectedSeat != null ? ` ${selectedSeat}번 좌석` : ''}에 체크인 예약되었어요.\n10분 안에 도착해 주세요!`
    );
    setSelectedSeat(null);
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 헤더 이미지 영역 */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroRow}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={onBookmark}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={colors.ink}
              />
            </Pressable>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="cafe-outline" size={54} color={colors.sub} />
          </View>
        </View>

        {/* 기본 정보 */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{cafe.name}</Text>
            <StatusBadge cafe={cafe} />
          </View>
          <Text style={styles.category}>
            {cafe.category} · {cafe.region}
          </Text>
          <View style={styles.seatRow}>
            <Text style={styles.seatBig}>{cafe.seatsAvailable}</Text>
            <Text style={styles.seatSmall}> / {cafe.seatsTotal}석 남음</Text>
          </View>
          <SeatProgress cafe={cafe} height={9} />
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.sub} />
            <Text style={styles.meta}>도보 {cafe.walkMin}분</Text>
            <Ionicons name="sync-outline" size={15} color={colors.sub} style={{ marginLeft: 10 }} />
            <Text style={styles.meta}>{updatedLabel(cafe.lastUpdated, now)}</Text>
          </View>

          <Pressable style={styles.addressRow} onPress={onDirections}>
            <Ionicons name="navigate-outline" size={17} color={colors.green} />
            <Text style={styles.address}>{cafe.address}</Text>
            <Text style={styles.directions}>길찾기 ›</Text>
          </Pressable>

          {/* 편의시설 */}
          <Text style={styles.sectionTitle}>편의시설</Text>
          <View style={styles.tagWrap}>
            {cafe.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
            <View style={styles.tag}>
              <Text style={styles.tagText}>{cafe.noise}</Text>
            </View>
          </View>

          {/* 좌석 배치도 */}
          <Text style={styles.sectionTitle}>실시간 좌석</Text>
          <View style={styles.seatMap}>
            <View style={styles.seatGrid}>
              {seats.map((s) => (
                <Pressable
                  key={s.seatNo}
                  onPress={() => {
                    if (s.status !== 'available') {
                      Alert.alert(
                        s.status === 'needs_check'
                          ? '확인이 필요한 자리예요'
                          : '이미 사용 중인 자리예요'
                      );
                      return;
                    }
                    setSelectedSeat((prev) => (prev === s.seatNo ? null : s.seatNo));
                  }}
                  style={[
                    styles.seat,
                    { backgroundColor: SEAT_COLORS[s.status] },
                    selectedSeat === s.seatNo && styles.seatSelected,
                  ]}
                >
                  <Text style={styles.seatNum}>{s.seatNo}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.legendRow}>
              <Legend color={SEAT_COLORS.available} label="비어있음" />
              <Legend color={SEAT_COLORS.occupied} label="사용 중" />
              <Legend color={SEAT_COLORS.needs_check} label="확인 필요" />
            </View>
          </View>

          {/* 영업시간 */}
          <Text style={styles.sectionTitle}>영업시간</Text>
          <View style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>평일</Text>
              <Text style={styles.hoursValue}>{cafe.hoursWeekday}</Text>
            </View>
            <View style={styles.recentDivider} />
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>주말</Text>
              <Text style={styles.hoursValue}>{cafe.hoursWeekend}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 예약 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.reserveBtn} onPress={onReserve}>
          <Text style={styles.reserveText}>
            {cafe.seatsAvailable > 0 ? '테이크인 하기' : '만석이에요'}
          </Text>
        </Pressable>
      </View>

      {/* 예약 확인 모달 */}
      <Modal visible={reserveOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="cafe" size={34} color={colors.green} />
            <Text style={styles.modalTitle}>{cafe.name}</Text>
            <Text style={styles.modalSub}>
              {selectedSeat != null
                ? `${selectedSeat}번 좌석에 테이크인할까요?`
                : '지금 테이크인할까요?'}
              {'\n'}도착 예상: 도보 {cafe.walkMin}분
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setReserveOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.ink }]}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.green }]}
                onPress={confirmReserve}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    height: 230,
    backgroundColor: '#EDEBDE',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroIcon: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  category: {
    marginTop: 6,
    fontSize: 13,
    color: colors.sub,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 10,
  },
  seatBig: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
  },
  seatSmall: {
    fontSize: 16,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  meta: {
    fontSize: 14,
    color: colors.sub,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  directions: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 28,
    marginBottom: 12,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.goodBg,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.goodText,
  },
  seatMap: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seat: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatSelected: {
    borderWidth: 3,
    borderColor: colors.green,
  },
  seatNum: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.45)',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.sub,
  },
  hoursCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  hoursLabel: {
    fontSize: 15,
    color: colors.sub,
  },
  hoursValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  recentDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reserveBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 26,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 12,
  },
  modalSub: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.sub,
    textAlign: 'center',
    marginTop: 10,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
