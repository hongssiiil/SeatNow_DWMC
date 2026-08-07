import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SavedCafeCard } from '../components/CafeCard';
import { ReviewModal } from '../components/ReviewModal';
import { Cafe } from '../lib/data';
import { validateNickname } from '../lib/profile';
import {
  CafeReview,
  RecentTakeIn,
  fetchRecentTakeIns,
  submitReview,
  updateReview,
} from '../lib/social';
import { useApp } from '../lib/store';
import { colors, radius, seatStatus, seatStatusRank } from '../lib/theme';

const PRIMARY = '#1F4D3D';

type SortKey = '거리순' | '여유순' | '인기순';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatVisitedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View accessibilityLabel="section-header" style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title} <Text style={styles.sectionCount}>({count})</Text>
      </Text>
      <Pressable
        accessibilityLabel="expand-toggle-btn"
        style={styles.expandBtn}
        onPress={onToggle}
        hitSlop={8}
      >
        <Text style={styles.expandBtnText}>{expanded ? '접기' : '펼쳐보기'}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={colors.green}
        />
      </Pressable>
    </View>
  );
}

export default function MyPageScreen() {
  const router = useRouter();
  const {
    user,
    isGuest,
    cafes,
    now,
    bookmarks,
    toggleBookmark,
    updateNickname,
    visitCounts,
  } = useApp();

  /** 저장·최근 테이크인 모두 기본 접힘 */
  const [savedExpanded, setSavedExpanded] = useState(false);
  const [takeinExpanded, setTakeinExpanded] = useState(false);

  const [sort, setSort] = useState<SortKey>('거리순');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [nickOpen, setNickOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [nickBusy, setNickBusy] = useState(false);

  const [takeIns, setTakeIns] = useState<RecentTakeIn[]>([]);
  const [takeInsLoading, setTakeInsLoading] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewCafe, setReviewCafe] = useState<Cafe | null>(null);
  const [reviewExisting, setReviewExisting] = useState<CafeReview | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    if (nickOpen && user) setNickDraft(user.name);
  }, [nickOpen, user?.name]);

  const nickValid = validateNickname(nickDraft);
  const nickCount = nickDraft.trim().length;

  const cafeById = useMemo(() => {
    const m = new Map<string, Cafe>();
    for (const c of cafes) m.set(c.id, c);
    return m;
  }, [cafes]);

  const savedCafes = useMemo(() => {
    const list = cafes.filter((c) => bookmarks.includes(c.id));
    return [...list].sort((a, b) => {
      if (sort === '거리순') return a.walkMin - b.walkMin;
      if (sort === '인기순') return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      // 자리순: 사장님이 알려준 현황이 기준. seats_available은 관리되지 않아 쓰지 않는다.
      const rankDiff =
        seatStatusRank(seatStatus(b.congestion)) -
        seatStatusRank(seatStatus(a.congestion));
      return rankDiff !== 0 ? rankDiff : a.walkMin - b.walkMin;
    });
  }, [cafes, bookmarks, sort]);

  const refreshTakeIns = useCallback(async () => {
    if (!user) {
      setTakeIns([]);
      return;
    }
    setTakeInsLoading(true);
    const rows = await fetchRecentTakeIns(user.key);
    setTakeIns(rows);
    setTakeInsLoading(false);
  }, [user?.key]);

  useFocusEffect(
    useCallback(() => {
      refreshTakeIns();
    }, [refreshTakeIns])
  );

  const toggleSection = (which: 'saved' | 'takein') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (which === 'saved') {
      setSavedExpanded((v) => !v);
      if (!savedExpanded) setSortMenuOpen(false);
    } else {
      setTakeinExpanded((v) => !v);
    }
  };

  const openNicknameModal = () => {
    if (!user) return;
    setNickDraft(user.name);
    setNickOpen(true);
  };

  const onSaveNickname = async () => {
    if (!nickValid || nickBusy) return;
    setNickBusy(true);
    const ok = await updateNickname(nickDraft);
    setNickBusy(false);
    if (!ok) {
      Alert.alert('저장 실패', '닉네임을 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    setNickOpen(false);
  };

  const openReviewModal = (cafe: Cafe, existing: CafeReview | null) => {
    setReviewCafe(cafe);
    setReviewExisting(existing);
    setReviewRating(existing?.rating ?? 0);
    setReviewText(existing?.text ?? '');
    setReviewOpen(true);
  };

  const onSubmitReview = async () => {
    if (!user || !reviewCafe || reviewRating < 1 || reviewBusy) return;
    setReviewBusy(true);
    const saved = reviewExisting
      ? await updateReview({
          reviewId: reviewExisting.id,
          cafeId: reviewCafe.id,
          userKey: user.key,
          nickname: user.name,
          rating: reviewRating,
          text: reviewText,
        })
      : await submitReview({
          cafeId: reviewCafe.id,
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
    setTakeIns((prev) =>
      prev.map((row) =>
        row.cafeId === reviewCafe.id ? { ...row, myReview: saved } : row
      )
    );
    setReviewOpen(false);
    setReviewCafe(null);
    setReviewExisting(null);
    setReviewRating(0);
    setReviewText('');
    Alert.alert(
      reviewExisting ? '리뷰가 수정됐어요' : '리뷰가 등록됐어요',
      '카페 상세의 리뷰 목록에도 반영돼요.'
    );
  };

  const savedCount = user ? savedCafes.length : 0;
  const takeinCount = user ? takeIns.length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          {/* 탭바가 없어져 푸시된 화면이므로 뒤로가기가 필요하다 */}
          <Pressable
            accessibilityLabel="back-btn"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          >
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>마이페이지</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.ink} />
          </Pressable>
        </View>

        {user ? (
          <View accessibilityLabel="profile-section" style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.slice(0, 2)}</Text>
            </View>
            {/* 닉네임 한 줄만 두고 아바타 높이에 맞춰 세로 중앙에 놓는다 */}
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user.name}님
              </Text>
              <Pressable
                accessibilityLabel="edit-nickname-btn"
                hitSlop={8}
                onPress={openNicknameModal}
                style={styles.editBtn}
              >
                <Ionicons name="pencil" size={16} color={PRIMARY} />
              </Pressable>
            </View>
            <Pressable hitSlop={8} onPress={() => router.push('/settings')}>
              <Ionicons name="chevron-forward" size={20} color={colors.sub} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.profileCard} onPress={() => router.replace('/')}>
            <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
              <Ionicons name="person" size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileName}>
                {isGuest ? '게스트로 둘러보는 중' : '로그인이 필요해요'}
              </Text>
              <Text style={styles.profileSub}>로그인하고 카페를 저장해 보세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.sub} />
          </Pressable>
        )}

        {/* saved-section */}
        <View accessibilityLabel="saved-section" style={styles.section}>
          <SectionHeader
            title="저장한 카페"
            count={savedCount}
            expanded={savedExpanded}
            onToggle={() => toggleSection('saved')}
          />
          {savedExpanded && (
            <View accessibilityLabel="section-list" style={styles.sectionList}>
              {user && savedCafes.length > 0 && (
                <View style={styles.sortRow}>
                  <Pressable
                    style={styles.sortBtn}
                    onPress={() => setSortMenuOpen((v) => !v)}
                  >
                    <Text style={styles.sortText}>{sort}</Text>
                    <Ionicons
                      name={sortMenuOpen ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={colors.green}
                    />
                  </Pressable>
                </View>
              )}
              {sortMenuOpen && savedExpanded && (
                <View style={styles.sortMenu}>
                  {(['거리순', '여유순', '인기순'] as SortKey[]).map((k) => (
                    <Pressable
                      key={k}
                      style={styles.sortItem}
                      onPress={() => {
                        setSort(k);
                        setSortMenuOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortItemText,
                          sort === k && { color: colors.green, fontWeight: '800' },
                        ]}
                      >
                        {k}
                      </Text>
                      {sort === k && (
                        <Ionicons name="checkmark" size={16} color={colors.green} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {user && savedCafes.length > 0 ? (
                savedCafes.map((cafe) => (
                  <SavedCafeCard
                    key={cafe.id}
                    cafe={cafe}
                    now={now}
                    visitCount={visitCounts?.[cafe.id] ?? 0}
                    onPress={() => router.push(`/cafe/${cafe.id}`)}
                    onToggleBookmark={() => toggleBookmark(cafe.id)}
                  />
                ))
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="bookmark-outline" size={36} color={colors.muted} />
                  <Text style={styles.emptyText}>
                    {user
                      ? '아직 저장한 카페가 없어요'
                      : '로그인하면 저장한 카페를 볼 수 있어요'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>

      <ReviewModal
        visible={reviewOpen}
        cafeName={reviewCafe?.name ?? ''}
        editing={!!reviewExisting}
        rating={reviewRating}
        text={reviewText}
        busy={reviewBusy}
        onChangeRating={setReviewRating}
        onChangeText={setReviewText}
        onClose={() => {
          setReviewOpen(false);
          setReviewCafe(null);
          setReviewExisting(null);
        }}
        onSubmit={onSubmitReview}
      />

      <Modal visible={nickOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View accessibilityLabel="nickname-edit-modal" style={styles.modalCard}>
            <Text style={styles.modalTitle}>닉네임 변경</Text>
            <Text style={styles.modalSub}>2~10자, 한글·영문·숫자·공백</Text>

            <TextInput
              accessibilityLabel="nickname-input"
              style={styles.nickInput}
              value={nickDraft}
              onChangeText={(t) => setNickDraft(t.slice(0, 10))}
              maxLength={10}
              placeholder="닉네임"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Text accessibilityLabel="nickname-char-count" style={styles.charCount}>
              {nickCount}/10
            </Text>

            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setNickOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.ink }]}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="nickname-save-btn"
                style={[
                  styles.modalBtn,
                  { backgroundColor: nickValid ? PRIMARY : '#CCCCCC' },
                ]}
                disabled={!nickValid || nickBusy}
                onPress={onSaveNickname}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>
                  {nickBusy ? '저장 중…' : '저장'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  nameRow: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(31,77,61,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
  },
  profileSub: {
    marginTop: 5,
    fontSize: 14,
    color: colors.sub,
  },
  section: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.sub,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expandBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green,
  },
  sectionList: {
    paddingBottom: 4,
  },
  sortRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
  },
  sortMenu: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 6,
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortItemText: {
    fontSize: 15,
    color: colors.ink,
  },
  takeinList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  takeinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  takeinBody: {
    flex: 1,
    minWidth: 0,
  },
  takeinName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  takeinMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.sub,
  },
  takeinDate: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  reviewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: PRIMARY,
  },
  editReviewBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  editReviewBtnText: {
    color: PRIMARY,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSub: {
    marginTop: 8,
    fontSize: 13,
    color: colors.sub,
  },
  nickInput: {
    marginTop: 18,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  charCount: {
    marginTop: 8,
    alignSelf: 'flex-end',
    fontSize: 12,
    color: colors.sub,
    fontWeight: '600',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
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
