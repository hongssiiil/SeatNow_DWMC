import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CafeMap, CafeMapHandle } from '../../components/CafeMap';
import { CafeCard } from '../../components/CafeCard';
import { Cafe } from '../../lib/data';
import { useApp } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_EXPANDED = SCREEN_H * 0.16;
const SHEET_COLLAPSED = SCREEN_H * 0.45;
// 지도 조작 시 숨김 상태: 핸들 + 헤더만 보이게
const SHEET_HIDDEN = SCREEN_H - 150;
const SNAPS = [SHEET_EXPANDED, SHEET_COLLAPSED, SHEET_HIDDEN];
/** 현위치 버튼이 시트 위로 뜰 여백 */
const LOC_BTN_SIZE = 48;
const LOC_BTN_GAP = 12;

type SortKey = '거리순' | '여유순' | '인기순';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cafes, now, bookmarks, toggleBookmark, user, visitCounts } = useApp();
  const mapRef = useRef<CafeMapHandle>(null);

  const [sort, setSort] = useState<SortKey>('거리순');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  // 바텀시트 드래그
  const sheetY = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const sheetPos = useRef(SHEET_COLLAPSED);
  sheetY.addListener(({ value }) => {
    sheetPos.current = value;
  });
  const snapTo = (target: number) => {
    Animated.spring(sheetY, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          SHEET_HIDDEN,
          Math.max(SHEET_EXPANDED, sheetPos.current + g.dy)
        );
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const pos = sheetPos.current;
        let target: number;
        if (g.vy < -0.5) {
          // 위로 플릭: 현재 위치보다 위의 가장 가까운 스냅
          target = [...SNAPS].reverse().find((s) => s < pos - 10) ?? SHEET_EXPANDED;
        } else if (g.vy > 0.5) {
          // 아래로 플릭: 현재 위치보다 아래의 가장 가까운 스냅
          target = SNAPS.find((s) => s > pos + 10) ?? SHEET_HIDDEN;
        } else {
          // 가장 가까운 스냅
          target = SNAPS.reduce((a, b) =>
            Math.abs(b - pos) < Math.abs(a - pos) ? b : a
          );
        }
        snapTo(target);
      },
    })
  ).current;

  // 지도 탭/이동 시 시트 숨김 (이미 숨겨져 있으면 무시)
  const hideSheet = () => {
    if (sheetPos.current < SHEET_HIDDEN - 5) snapTo(SHEET_HIDDEN);
  };

  const nearbyCafes = useMemo(() => {
    let list = cafes.filter((c) => c.nearby);
    if (bookmarkOnly) list = cafes.filter((c) => bookmarks.includes(c.id));
    return [...list].sort((a, b) => {
      if (sort === '거리순') return a.walkMin - b.walkMin;
      if (sort === '인기순') return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      return b.seatsAvailable / b.seatsTotal - a.seatsAvailable / a.seatsTotal;
    });
  }, [cafes, sort, bookmarkOnly, bookmarks]);

  const onToggleBookmark = (cafe: Cafe) => {
    if (!toggleBookmark(cafe.id)) {
      Alert.alert('로그인이 필요해요', '카페를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.replace('/') },
      ]);
    }
  };

  const onPressMyLocation = async () => {
    if (locBusy) return;
    setLocBusy(true);
    const ok = await mapRef.current?.moveToMyLocation();
    setLocBusy(false);
    if (!ok) {
      Alert.alert(
        '위치를 확인할 수 없어요',
        '설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.'
      );
    }
  };

  // 현위치 버튼: 바텀시트 상단보다 LOC_BTN_GAP + SIZE 만큼 위
  const locationBtnTop = Animated.subtract(sheetY, LOC_BTN_SIZE + LOC_BTN_GAP);

  return (
    <View style={styles.container}>
      {/* 지도 (dev build: 네이버 지도 / Expo Go: 목업) */}
      <CafeMap
        ref={mapRef}
        cafes={cafes}
        bookmarkedIds={bookmarks}
        onPressMarker={(cafe) => router.push(`/cafe/${cafe.id}`)}
        onMapInteract={hideSheet}
        bottomControlsInset={SCREEN_H - SHEET_HIDDEN + LOC_BTN_SIZE + LOC_BTN_GAP}
      />

      {/* 상단 검색바 — 네이버지도 스타일 원바 (로고 아이콘 + 검색) */}
      <Pressable
        style={[styles.searchBar, { top: insets.top + 8 }]}
        onPress={() => router.push('/search')}
      >
        <View style={styles.logoPin}>
          <Ionicons name="cafe" size={16} color={colors.white} />
        </View>
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          테이크인 검색
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={10}
          onPress={() => {
            if (!user) {
              Alert.alert('로그인이 필요해요', '저장한 카페만 보려면 로그인해 주세요.');
              return;
            }
            setBookmarkOnly((v) => !v);
          }}
        >
          <Ionicons
            name={bookmarkOnly ? 'bookmark' : 'bookmark-outline'}
            size={21}
            color={colors.ink}
          />
        </Pressable>
      </Pressable>

      {/* 현위치 버튼 — 시트와 겹치지 않게 시트 바로 위 */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.locationBtnWrap, { top: locationBtnTop }]}
      >
        <Pressable
          accessibilityLabel="my-location-btn"
          style={[styles.locationBtn, locBusy && { opacity: 0.6 }]}
          onPress={onPressMyLocation}
        >
          <Ionicons name="locate" size={22} color={colors.ink} />
        </Pressable>
      </Animated.View>

      {/* 바텀시트 */}
      <Animated.View style={[styles.sheet, { top: sheetY }]}>
        <View {...panResponder.panHandlers}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {bookmarkOnly ? '저장한 카페' : '주변 카페'}{' '}
              <Text style={{ fontWeight: '800' }}>{nearbyCafes.length}곳</Text>
            </Text>
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
        </View>

        {sortMenuOpen && (
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

        <View style={styles.listDivider} />

        {/* 카페 리스트 */}
        <FlatList
          data={nearbyCafes}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cafe-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyText}>
                {bookmarkOnly ? '저장한 카페가 없어요' : '주변에 카페가 없어요'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CafeCard
              cafe={item}
              now={now}
              bookmarked={bookmarks.includes(item.id)}
              visitCount={visitCounts[item.id] ?? 0}
              onPress={() => router.push(`/cafe/${item.id}`)}
              onToggleBookmark={() => onToggleBookmark(item)}
            />
          )}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 10,
    paddingRight: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  logoPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontSize: 16,
    color: colors.muted,
    flexShrink: 1,
  },
  locationBtnWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 5,
  },
  locationBtn: {
    width: LOC_BTN_SIZE,
    height: LOC_BTN_SIZE,
    borderRadius: LOC_BTN_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D6CB',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink,
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
    position: 'absolute',
    right: 20,
    top: 52,
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
    zIndex: 20,
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
  // 필터 칩을 없앤 뒤 헤더와 리스트를 가르던 경계선을 대체
  listDivider: {
    borderTopWidth: 1,
    borderColor: colors.divider,
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
