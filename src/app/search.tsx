import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CafeCard } from '../components/CafeCard';
import { Cafe } from '../lib/data';
import { useApp } from '../lib/store';
import { colors, radius } from '../lib/theme';

const PRIMARY = '#1F4D3D';

export default function SearchScreen() {
  const router = useRouter();
  const { cafes, now, bookmarks, toggleBookmark, addRecentSearch } = useApp();

  const [mode, setMode] = useState<'form' | 'results'>('form');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim();
    const list = q
      ? cafes.filter(
          (c) => c.name.includes(q) || c.address.includes(q) || c.region.includes(q)
        )
      : cafes;
    return [...list].sort((a, b) => a.walkMin - b.walkMin);
  }, [cafes, query]);

  const reset = () => setQuery('');

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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => setMode('form')}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>
            검색 결과 <Text style={{ color: colors.green }}>{results.length}곳</Text>
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={36} color={colors.muted} />
              <Text style={styles.emptyText}>검색 결과가 없어요</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CafeCard
              cafe={item}
              now={now}
              bookmarked={bookmarks.includes(item.id)}
              onPress={() => router.push(`/cafe/${item.id}`)}
              onToggleBookmark={() => onToggleBookmark(item)}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>카페 검색</Text>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.formBody}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="카페 이름을 입력하세요"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            autoFocus
          />
          <Ionicons name="search" size={20} color={colors.sub} />
        </View>

        <View style={{ flex: 1 }} />

        {/* 탭이 아닌 스택 화면 — 하단 inset은 SafeAreaView가 처리 */}
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
