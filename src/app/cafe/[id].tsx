import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/CafeCard';
import { getCafeAmenityTags } from '../../constants/amenities';
import { updatedLabel } from '../../lib/data';
import { useSeats } from '../../lib/seats';
import {
  fetchLiked,
  fetchVisitCount,
  toggleLike,
} from '../../lib/social';
import { useApp } from '../../lib/store';
import { colors, radius, seatStatus, statusColors, statusLabel } from '../../lib/theme';
import { isCafeClosed } from '../../utils/isCafeOpen';

const PRIMARY = '#1F4D3D';
const TEXT = '#333333';
const STAR = '#F2C94C';

export default function CafeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cafes, now, bookmarks, toggleBookmark, user, live, setVisitCount: syncVisitCount } =
    useApp();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  /** visitCounts: 이 카페 테이크인 완료(PoC) 횟수 */
  const [localVisitCount, setLocalVisitCount] = useState(0);


  const cafe = cafes.find((c) => c.id === id);

  const { seats } = useSeats(
    cafe?.id,
    {
      total: cafe?.seatsTotal ?? 0,
      available: cafe?.seatsAvailable ?? 0,
    },
    user?.key
  );

  useEffect(() => {
    if (cafe) setLikeCount(cafe.likeCount ?? 0);
  }, [cafe?.id, cafe?.likeCount]);

  const refreshSocial = useCallback(async () => {
    if (!cafe) return;
    if (!user) {
      setLiked(false);
      setLocalVisitCount(0);
      return;
    }

    const [isLiked, visits] = await Promise.all([
      fetchLiked(cafe.id, user.key),
      fetchVisitCount(cafe.id, user.key),
    ]);
    setLiked(isLiked);
    setLocalVisitCount(visits);
    syncVisitCount(cafe.id, visits);
  }, [cafe?.id, user?.key, syncVisitCount]);

  useFocusEffect(
    useCallback(() => {
      refreshSocial();
    }, [refreshSocial])
  );

  if (!cafe) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20, color: colors.ink }}>카페를 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const bookmarked = bookmarks.includes(cafe.id);

  const requireLogin = (message: string) => {
    Alert.alert('로그인이 필요해요', message, [
      { text: '취소', style: 'cancel' },
      { text: '로그인', onPress: () => router.replace('/') },
    ]);
  };

  const onBookmark = () => {
    if (!toggleBookmark(cafe.id)) {
      requireLogin('카페를 저장하려면 로그인해 주세요.');
    }
  };

  const onLike = async () => {
    if (!user) {
      requireLogin('좋아요하려면 로그인해 주세요.');
      return;
    }
    if (likeBusy) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    // optimistic update
    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    setLikeBusy(true);

    const result = await toggleLike(cafe.id, user.key);
    setLikeBusy(false);

    if (result) {
      setLiked(result.liked);
      setLikeCount(result.likeCount);
      return;
    }

    // Supabase 연결 시 실패만 롤백 (목업 모드는 optimistic 유지)
    if (live) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Alert.alert('좋아요 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  /** 표시용 좌석 현황 — 이 버전에서는 congestion 컬럼이 정답이다. */
  const currentSeatStatus = seatStatus(cafe.congestion);
  const seatStatusColors = statusColors(currentSeatStatus);

  const closed = isCafeClosed(cafe);

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroRow}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View style={styles.heroActions}>
              <View style={styles.likeWrap}>
                <Pressable
                  accessibilityLabel="heart-btn"
                  style={styles.circleBtn}
                  onPress={onLike}
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={liked ? PRIMARY : TEXT}
                  />
                </Pressable>
                <Text accessibilityLabel="like-count" style={styles.likeCount}>
                  {likeCount}
                </Text>
              </View>
              <Pressable style={styles.circleBtn} onPress={onBookmark}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={colors.ink}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="cafe-outline" size={54} color={colors.sub} />
          </View>
        </View>

        <View style={styles.body}>
          {localVisitCount >= 1 && (
            <Text
              accessibilityLabel="visit-count-label"
              style={styles.visitCountLabel}
            >
              최근 {localVisitCount}번 테이크인한 가게
            </Text>
          )}
          <View style={styles.titleRow}>
            <Text accessibilityLabel="cafe-name" style={styles.name}>
              {cafe.name}
            </Text>
            <StatusBadge cafe={cafe} />
          </View>
          <Text style={styles.category}>
            {cafe.category} · {cafe.region}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.sub} />
            <Text style={styles.meta}>도보 {cafe.walkMin}분</Text>
            <Ionicons name="sync-outline" size={15} color={colors.sub} style={{ marginLeft: 10 }} />
            <Text style={styles.meta}>{updatedLabel(cafe.lastUpdated, now)}</Text>
          </View>

          {/* 길찾기 제거 — 주소는 정보로만 표시한다 */}
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={17} color={colors.sub} />
            <Text style={styles.address}>{cafe.address}</Text>
          </View>

          <Text style={styles.sectionTitle}>편의시설</Text>
          <View style={styles.tagWrap}>
            {(() => {
              const amenityTags = getCafeAmenityTags(cafe);
              if (amenityTags.length === 0) {
                return <Text style={styles.meta}>등록된 편의시설이 없어요</Text>;
              }
              return amenityTags.map((a) => (
                <View key={a.id} style={styles.tag}>
                  <Text style={styles.tagText}>{a.label}</Text>
                </View>
              ));
            })()}
          </View>

          <Text style={styles.sectionTitle}>실시간 좌석</Text>
          <View style={styles.seatMapWrap}>
            <View style={closed && styles.seatMapDimmed}>
              {/* 좌석 배치도 제거 — 자리 있음 / 만석 2단계만 노출한다 */}
              <View accessibilityLabel="seat-status-card" style={styles.seatStatusCard}>
                <View
                  accessibilityLabel="status-dot"
                  style={[styles.seatStatusDot, { backgroundColor: seatStatusColors.bar }]}
                />
                <Text
                  accessibilityLabel="seat-status-label"
                  style={[styles.seatStatusLabel, { color: seatStatusColors.text }]}
                >
                  {statusLabel(currentSeatStatus)}
                </Text>
              </View>
            </View>
            {closed && (
              <View
                accessibilityLabel="closed-overlay"
                pointerEvents="none"
                style={styles.seatClosedOverlay}
              >
                <Text accessibilityLabel="closed-notice" style={styles.closedNotice}>
                  현재 휴무 중이에요
                </Text>
              </View>
            )}
          </View>

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
  heroActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  likeWrap: {
    alignItems: 'center',
  },
  likeCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT,
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
  visitCountLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 6,
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 28,
    marginBottom: 12,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 헤더 행 안에서는 sectionTitle의 아래 여백만 정렬용으로 줄인다
  reviewHeaderTitle: {
    marginBottom: 0,
  },
  reviewWriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
    marginTop: 16,
  },
  reviewWriteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  editReviewBtn: {
    backgroundColor: colors.goodBg,
  },
  editReviewBtnText: {
    color: colors.green,
  },
  reviewCount: {
    fontWeight: '700',
    color: colors.sub,
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
  seatMapWrap: {
    position: 'relative',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  seatMapDimmed: {
    opacity: 0.45,
  },
  seatStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  seatStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  seatStatusLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  seatClosedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  closedNotice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
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
  reviewList: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  reviewEmpty: {
    paddingVertical: 28,
    textAlign: 'center',
    fontSize: 14,
    color: colors.sub,
  },
  reviewItem: {
    paddingVertical: 14,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  reviewItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewNickname: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
