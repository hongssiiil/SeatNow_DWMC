import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SavedCafeCard } from '../../components/CafeCard';
import { useApp } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

type SortKey = '거리순' | '여유순';

export default function MyPageScreen() {
  const router = useRouter();
  const { user, isGuest, cafes, now, bookmarks, toggleBookmark } = useApp();
  const [sort, setSort] = useState<SortKey>('거리순');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const savedCafes = useMemo(() => {
    const list = cafes.filter((c) => bookmarks.includes(c.id));
    return [...list].sort((a, b) =>
      sort === '거리순'
        ? a.walkMin - b.walkMin
        : b.seatsAvailable / b.seatsTotal - a.seatsAvailable / a.seatsTotal
    );
  }, [cafes, bookmarks, sort]);

  const daysWith = user
    ? Math.max(1, Math.floor((now - user.joinedAt) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>마이페이지</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.ink} />
          </Pressable>
        </View>

        {/* 프로필 카드 */}
        {user ? (
          <Pressable style={styles.profileCard} onPress={() => router.push('/settings')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileName}>{user.name}님</Text>
              <Text style={styles.profileSub}>
                테이크인과 함께한 지 {daysWith}일째
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.sub} />
          </Pressable>
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

        {/* 저장한 카페 */}
        <View style={styles.savedHeader}>
          <Text style={styles.savedTitle}>저장한 카페</Text>
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

        {sortMenuOpen && (
          <View style={styles.sortMenu}>
            {(['거리순', '여유순'] as SortKey[]).map((k) => (
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
              onPress={() => router.push(`/cafe/${cafe.id}`)}
              onToggleBookmark={() => toggleBookmark(cafe.id)}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyText}>
              {user ? '저장한 카페가 없어요' : '로그인하면 저장한 카페를 볼 수 있어요'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  profileSub: {
    marginTop: 5,
    fontSize: 14,
    color: colors.sub,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 30,
    marginBottom: 14,
  },
  savedTitle: {
    fontSize: 19,
    fontWeight: '800',
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
