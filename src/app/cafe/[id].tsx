import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/CafeCard';
import { ReviewModal } from '../../components/ReviewModal';
import { getCafeAmenityTags } from '../../constants/amenities';
import { updatedLabel } from '../../lib/data';
import {
  RESERVATION_TIMEOUT_MINUTES,
  pickFirstAvailableSeat,
  useSeats,
} from '../../lib/seats';
import {
  CafeReview,
  fetchLiked,
  fetchReviews,
  fetchVisitCount,
  submitReview,
  toggleLike,
  updateReview,
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
  const [reserveOpen, setReserveOpen] = useState(false);
  /** 확인 모달에 표시할 좌석 (자동 배정된 번호) */
  const [pendingSeat, setPendingSeat] = useState<number | null>(null);
  const [takeInBusy, setTakeInBusy] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const [reviews, setReviews] = useState<CafeReview[]>([]);
  /** visitCounts: 이 카페 테이크인 완료(PoC) 횟수 */
  const [localVisitCount, setLocalVisitCount] = useState(0);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const cafe = cafes.find((c) => c.id === id);

  const { seats, myReservation, takeIn, cancelTakeIn } = useSeats(
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
    const list = await fetchReviews(cafe.id);
    setReviews(list);

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

  /** 내가 이 카페에 쓴 리뷰 (있으면 수정 모드) */
  const myReview = user
    ? (reviews.find((r) => r.userKey === user.key) ?? null)
    : null;

  const openReviewModal = () => {
    if (!user) {
      requireLogin('리뷰를 쓰려면 로그인해 주세요.');
      return;
    }
    // 리뷰 자격은 실제 방문(테이크인)으로만 부여한다 — 마이페이지에서 쓰던 규칙과 동일
    if (localVisitCount < 1) {
      Alert.alert(
        '아직 리뷰를 쓸 수 없어요',
        '이 카페에서 테이크인한 뒤에 리뷰를 남길 수 있어요.'
      );
      return;
    }
    setReviewRating(myReview?.rating ?? 0);
    setReviewText(myReview?.text ?? '');
    setReviewOpen(true);
  };

  const onSubmitReview = async () => {
    if (!user || reviewRating < 1 || reviewBusy) return;
    setReviewBusy(true);
    const saved = myReview
      ? await updateReview({
          reviewId: myReview.id,
          cafeId: cafe.id,
          userKey: user.key,
          nickname: user.name,
          rating: reviewRating,
          text: reviewText,
        })
      : await submitReview({
          cafeId: cafe.id,
          userKey: user.key,
          nickname: user.name,
          rating: reviewRating,
          text: reviewText,
        });
    setReviewBusy(false);
    if (!saved) {
      Alert.alert('등록 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setReviewOpen(false);
    setReviewRating(0);
    setReviewText('');
    refreshSocial();
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

  const onDirections = () => {
    Linking.openURL(cafe.naverMapUrl).catch(() =>
      Alert.alert('길찾기를 열 수 없어요')
    );
  };

  /** 표시용 좌석 현황 — 이 버전에서는 congestion 컬럼이 정답이다. */
  const currentSeatStatus = seatStatus(cafe.congestion);
  const seatStatusColors = statusColors(currentSeatStatus);

  /**
   * 테이크인 가능 여부.
   * 사장님이 만석이라고 알린 가게는 좌석 수 집계와 무관하게 무조건 막는다.
   * (seats_available은 사장님 앱이 관리하지 않아 실제 현황과 어긋난다 —
   *  예: congestion='full'인데 seats_available=3인 가게가 실제로 존재)
   * 만석이 아닐 때만 좌석 단위 실데이터로 판단한다.
   */
  const hasFreeSeat =
    currentSeatStatus !== 'full' &&
    (seats.some((s) => s.status === 'available') || cafe.seatsAvailable > 0);

  const onReserve = () => {
    if (isCafeClosed(cafe)) {
      Alert.alert('휴무중이에요', '영업 시간에 다시 테이크인해 주세요.');
      return;
    }
    if (!user) {
      requireLogin('자리를 테이크인하려면 로그인해 주세요.');
      return;
    }
    if (myReservation) {
      Alert.alert(
        '이미 테이크인 중이에요',
        `${myReservation.label} 좌석을 테이크인 중입니다. 취소 후 다시 시도해 주세요.`
      );
      return;
    }
    if (!hasFreeSeat) {
      Alert.alert('만석이에요', '자리가 나면 다시 시도해 주세요.');
      return;
    }
    const seatNo = pickFirstAvailableSeat(seats)?.seatNo ?? null;
    if (seatNo == null) {
      Alert.alert('만석이에요', '자리가 나면 다시 시도해 주세요.');
      return;
    }
    setPendingSeat(seatNo);
    setReserveOpen(true);
  };

  const onCancelTakeIn = () => {
    if (!user || !myReservation || takeInBusy) return;
    Alert.alert(
      '테이크인 취소',
      `${myReservation.label} 좌석 테이크인을 취소할까요?`,
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            setTakeInBusy(true);
            const ok = await cancelTakeIn(user.key);
            setTakeInBusy(false);
            if (!ok) {
              Alert.alert('취소 실패', '잠시 후 다시 시도해 주세요.');
              return;
            }
            const next = Math.max(0, localVisitCount - 1);
            setLocalVisitCount(next);
            syncVisitCount(cafe.id, next);
            Alert.alert('취소됐어요', '좌석이 다시 자리 있음으로 변경됐어요.');
          },
        },
      ]
    );
  };

  const onPrimaryCta = () => {
    if (myReservation) {
      onCancelTakeIn();
      return;
    }
    onReserve();
  };

  const confirmReserve = async () => {
    if (!user || takeInBusy) return;
    const seatNo = pendingSeat ?? pickFirstAvailableSeat(seats)?.seatNo ?? null;
    if (seatNo == null) {
      setReserveOpen(false);
      Alert.alert('만석이에요', '자리가 나면 다시 시도해 주세요.');
      return;
    }
    setReserveOpen(false);
    setTakeInBusy(true);
    const result = await takeIn(seatNo, user.key);
    setTakeInBusy(false);
    if (!result.ok) {
      const msg =
        result.error === 'already_reserved'
          ? '이미 테이크인 중인 좌석이 있어요.'
          : result.error === 'seat_unavailable'
            ? '방금 다른 분이 테이크인한 좌석이에요. 다른 자리를 골라 주세요.'
            : '잠시 후 다시 시도해 주세요.';
      Alert.alert('테이크인 실패', msg);
      return;
    }
    // 체크인(GPS 방문 인증)과 별개 — 리뷰 자격은 체크인으로만 부여
    // setState updater 안에서 syncVisitCount(컨텍스트 setState) 호출하면 런타임 에러 남
    const next = localVisitCount + 1;
    setLocalVisitCount(next);
    syncVisitCount(cafe.id, next);
    Alert.alert(
      '테이크인 완료',
      `${cafe.name} ${seatNo}번 좌석이 테이크인됐어요.\n${RESERVATION_TIMEOUT_MINUTES}분 안에 착석해 주세요!`
    );
    setPendingSeat(null);
  };

  const closed = isCafeClosed(cafe);

  // CTA: 테이크인 하기 ↔ 테이크인 취소만 (리뷰는 마이페이지 recent-takein)
  const ctaLabel = myReservation
    ? '테이크인 취소'
    : closed
      ? '휴무중'
      : hasFreeSeat
        ? '테이크인 하기'
        : '만석이에요';

  const ctaDisabled = myReservation
    ? takeInBusy
    : closed || takeInBusy || !hasFreeSeat;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
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

          <Pressable style={styles.addressRow} onPress={onDirections}>
            <Ionicons name="navigate-outline" size={17} color={colors.green} />
            <Text style={styles.address}>{cafe.address}</Text>
            <Text style={styles.directions}>길찾기 ›</Text>
          </Pressable>

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

          {/* review-list */}
          <View style={styles.reviewHeaderRow}>
            <Text style={[styles.sectionTitle, styles.reviewHeaderTitle]}>
              리뷰 <Text style={styles.reviewCount}>{reviews.length}</Text>
            </Text>
            <Pressable
              accessibilityLabel={myReview ? 'edit-review-btn' : 'review-btn'}
              style={[styles.reviewWriteBtn, myReview && styles.editReviewBtn]}
              onPress={openReviewModal}
              hitSlop={6}
            >
              <Ionicons
                name={myReview ? 'create-outline' : 'star-outline'}
                size={14}
                color={myReview ? colors.green : colors.white}
              />
              <Text
                style={[
                  styles.reviewWriteBtnText,
                  myReview && styles.editReviewBtnText,
                ]}
              >
                {myReview ? '리뷰 수정' : '리뷰 쓰기'}
              </Text>
            </Pressable>
          </View>
          <View accessibilityLabel="review-list" style={styles.reviewList}>
            {reviews.length === 0 ? (
              <Text style={styles.reviewEmpty}>아직 작성된 리뷰가 없어요</Text>
            ) : (
              reviews.map((r, idx) => (
                <View
                  key={r.id}
                  accessibilityLabel="review-item"
                  style={[
                    styles.reviewItem,
                    idx < reviews.length - 1 && styles.reviewItemBorder,
                  ]}
                >
                  <View style={styles.reviewItemTop}>
                    <Text style={styles.reviewNickname}>{r.nickname}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= r.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={STAR}
                        />
                      ))}
                    </View>
                  </View>
                  {!!r.text && <Text style={styles.reviewBody}>{r.text}</Text>}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityLabel={myReservation ? 'cancel-takein-btn' : 'takein-btn'}
          style={[
            styles.reserveBtn,
            ctaDisabled && styles.reserveBtnDisabled,
            closed && !myReservation && styles.reserveBtnClosed,
            myReservation && styles.cancelTakeinBtn,
          ]}
          onPress={onPrimaryCta}
          disabled={ctaDisabled}
        >
          <Text style={styles.reserveText}>{ctaLabel}</Text>
        </Pressable>
      </View>

      <Modal visible={reserveOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="cafe" size={34} color={colors.green} />
            <Text style={styles.modalTitle}>{cafe.name}</Text>
            <Text style={styles.modalSub}>
              {/* 좌석 선택 UI가 없으므로 항상 빈 좌석이 자동 배정된다 */}
              {pendingSeat != null
                ? `빈 좌석(${pendingSeat}번)을 자동으로 테이크인할까요?`
                : '빈 좌석 하나를 자동으로 테이크인할까요?'}
              {'\n'}
              {RESERVATION_TIMEOUT_MINUTES}분 안에 착석하지 않으면 자동 취소돼요.
              {'\n'}도착 예상: 도보 {cafe.walkMin}분
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => {
                  setReserveOpen(false);
                  setPendingSeat(null);
                }}
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

      <ReviewModal
        visible={reviewOpen}
        cafeName={cafe.name}
        editing={!!myReview}
        rating={reviewRating}
        text={reviewText}
        busy={reviewBusy}
        onChangeRating={setReviewRating}
        onChangeText={setReviewText}
        onClose={() => setReviewOpen(false)}
        onSubmit={onSubmitReview}
      />
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
  reserveBtnDisabled: {
    backgroundColor: colors.sage,
  },
  reserveBtnClosed: {
    backgroundColor: '#CCCCCC',
  },
  cancelTakeinBtn: {
    backgroundColor: '#5B8DEF',
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
