import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CafeCard } from '../../components/CafeCard';
import { FilterChip } from '../../components/FilterChip';
import {
  AMENITY_BY_ID,
  AMENITY_CATEGORY_META,
  amenitiesByCategory,
  cafeMatchesAmenityFilters,
} from '../../constants/amenities';
import { Cafe } from '../../lib/data';
import { useApp } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

const PRIMARY = '#1F4D3D';

export default function SearchScreen() {
  const router = useRouter();
  const { cafes, now, bookmarks, toggleBookmark, addRecentSearch, visitCounts } = useApp();

  const [mode, setMode] = useState<'form' | 'results'>('form');
  const [query, setQuery] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const results = useMemo(() => {
    let list = cafes;
    const q = query.trim();
    if (q) {
      list = list.filter(
        (c) => c.name.includes(q) || c.address.includes(q) || c.region.includes(q)
      );
    }
    list = list.filter((c) => cafeMatchesAmenityFilters(c, selectedAmenities));
    return [...list].sort((a, b) => a.walkMin - b.walkMin);
  }, [cafes, query, selectedAmenities]);

  const activeFilterLabels = useMemo(
    () =>
      selectedAmenities
        .map((id) => AMENITY_BY_ID[id])
        .filter(Boolean)
        .map((a) => ({
          key: a.id,
          label: a.label,
          clear: () =>
            setSelectedAmenities((prev) => prev.filter((x) => x !== a.id)),
        })),
    [selectedAmenities]
  );

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const reset = () => {
    setQuery('');
    setSelectedAmenities([]);
  };

  const search = () => {
    if (query.trim()) addRecentSearch(query);
    setMode('results');
  };

  const onToggleBookmark = (cafe: Cafe) => {
    if (!toggleBookmark(cafe.id)) {
      Alert.alert('로그인이 필요해요', '카페를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.replace('/') },
      ]);
    }
  };

  if (mode === 'results') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => setMode('form')}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>
            검색 결과 <Text style={{ color: colors.green }}>{results.length}곳</Text>
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {activeFilterLabels.length > 0 && (
          <View
            accessibilityLabel="active-amenity-filters"
            style={styles.pillWrap}
          >
            {activeFilterLabels.map((f) => (
              <Pressable
                key={f.key}
                style={styles.pill}
                onPress={f.clear}
                hitSlop={4}
              >
                <Text style={styles.pillText} numberOfLines={1}>
                  {f.label}
                </Text>
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
            ))}
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={36} color={colors.muted} />
              <Text style={styles.emptyText}>조건에 맞는 카페가 없어요</Text>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>카페 검색</Text>
        <Pressable hitSlop={10} onPress={() => router.push('/(tabs)/home')}>
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.formBody}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.searchBox}>
            <TextInput
              style={styles.input}
              placeholder="카페 이름을 입력하세요"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            <Ionicons name="search" size={20} color={colors.sub} />
          </View>

          <Text style={styles.filterTitle}>필터</Text>

          {AMENITY_CATEGORY_META.map((cat) => {
            const items = amenitiesByCategory(cat.id);
            return (
              <View
                key={cat.id}
                accessibilityLabel="amenity-category-group"
                style={styles.categoryGroup}
              >
                <Text
                  accessibilityLabel={cat.accessibilityLabel}
                  style={styles.groupLabelText}
                >
                  {cat.label}
                </Text>
                <View style={styles.chipWrap}>
                  {items.map((a) => (
                    <FilterChip
                      key={a.id}
                      label={a.label}
                      icon={a.icon}
                      iconSet={a.iconSet}
                      accent={a.accent}
                      active={selectedAmenities.includes(a.id)}
                      onPress={() => toggleAmenity(a.id)}
                      style={styles.chipItem}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 탭 바가 하단 inset을 처리하므로 여기선 고정 패딩만 사용 */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.searchBtn} onPress={search}>
            <Text style={styles.searchBtnText}>검색하기</Text>
          </Pressable>
          <Pressable style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>초기화</Text>
          </Pressable>
        </View>
      </View>
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
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 56,
    marginHorizontal: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  formBody: {
    flex: 1,
    minHeight: 0,
  },
  formScroll: {
    flex: 1,
    minHeight: 0,
  },
  formScrollContent: {
    paddingBottom: 28,
    flexGrow: 1,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 28,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  categoryGroup: {
    marginTop: 18,
    paddingHorizontal: 20,
    overflow: 'visible',
  },
  groupLabelText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap 대신 margin — ScrollView+flexWrap에서 마지막 줄 잘림 방지
    marginRight: -10,
    marginBottom: -10,
    overflow: 'visible',
  },
  chipItem: {
    marginRight: 10,
    marginBottom: 10,
  },
  bottomBar: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 10,
  },
  searchBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  resetBtn: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  // 가로 ScrollView 대신 wrap — 결과 화면에서 편의시설 칩이 잘리지 않게
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    marginRight: -8,
    marginBottom: -8,
    overflow: 'visible',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
    backgroundColor: PRIMARY,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 34,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.white,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
