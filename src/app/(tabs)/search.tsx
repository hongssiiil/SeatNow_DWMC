import React, { useMemo, useState } from 'react';
import {
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
import { Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CafeCard } from '../../components/CafeCard';
import { Cafe } from '../../lib/data';
import { useApp } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

type Party = '1' | '2' | '3' | 'custom' | null;
type YesNo = '있음' | '없음' | null;
type Noise = '조용함' | '보통' | '활기참' | null;

export default function SearchScreen() {
  const router = useRouter();
  const { cafes, now, bookmarks, toggleBookmark, addRecentSearch } = useApp();

  const [mode, setMode] = useState<'form' | 'results'>('form');
  const [query, setQuery] = useState('');
  const [party, setParty] = useState<Party>(null);
  const [customParty, setCustomParty] = useState('');
  const [outlet, setOutlet] = useState<YesNo>(null);
  const [noise, setNoise] = useState<Noise>(null);
  const [toilet, setToilet] = useState<YesNo>(null);
  const [extras, setExtras] = useState<string[]>([]);

  const partySize =
    party === 'custom' ? parseInt(customParty, 10) || 0 : party ? parseInt(party, 10) : 0;

  const results = useMemo(() => {
    let list = cafes;
    const q = query.trim();
    if (q) {
      list = list.filter(
        (c) => c.name.includes(q) || c.address.includes(q) || c.region.includes(q)
      );
    }
    if (partySize === 1) list = list.filter((c) => c.tags.includes('1인석'));
    else if (partySize >= 4) list = list.filter((c) => c.tags.includes('4인석'));
    else if (partySize >= 2)
      list = list.filter((c) => c.tags.includes('소파석') || c.tags.includes('4인석'));
    if (outlet === '있음') list = list.filter((c) => c.tags.includes('콘센트'));
    if (outlet === '없음') list = list.filter((c) => !c.tags.includes('콘센트'));
    if (noise) list = list.filter((c) => c.noise === noise);
    if (toilet === '있음') list = list.filter((c) => c.tags.includes('내부 화장실'));
    if (toilet === '없음') list = list.filter((c) => !c.tags.includes('내부 화장실'));
    if (extras.length > 0)
      list = list.filter((c) => extras.every((t) => c.tags.includes(t)));
    return [...list].sort((a, b) => a.walkMin - b.walkMin);
  }, [cafes, query, partySize, outlet, noise, toilet, extras]);

  const activeFilterLabels = useMemo(() => {
    const labels: { key: string; label: string; clear: () => void }[] = [];
    if (party)
      labels.push({
        key: 'party',
        label: party === 'custom' ? `${customParty || '?'}명` : `${party}명`,
        clear: () => setParty(null),
      });
    if (outlet)
      labels.push({ key: 'outlet', label: `콘센트 ${outlet}`, clear: () => setOutlet(null) });
    if (noise) labels.push({ key: 'noise', label: noise, clear: () => setNoise(null) });
    if (toilet)
      labels.push({
        key: 'toilet',
        label: `내부 화장실 ${toilet}`,
        clear: () => setToilet(null),
      });
    extras.forEach((t) =>
      labels.push({
        key: `extra-${t}`,
        label: t,
        clear: () => setExtras((prev) => prev.filter((x) => x !== t)),
      })
    );
    return labels;
  }, [party, customParty, outlet, noise, toilet, extras]);

  const reset = () => {
    setQuery('');
    setParty(null);
    setCustomParty('');
    setOutlet(null);
    setNoise(null);
    setToilet(null);
    setExtras([]);
  };

  const search = () => {
    if (party === 'custom' && !parseInt(customParty, 10)) {
      Alert.alert('인원수를 입력해 주세요');
      return;
    }
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

  // ── 결과 화면 ──────────────────────────────────────────
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={{ flexGrow: 0 }}
          >
            {activeFilterLabels.map((f) => (
              <Pressable key={f.key} style={styles.pill} onPress={f.clear}>
                <Text style={styles.pillText}>{f.label}</Text>
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
            ))}
          </ScrollView>
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
              onPress={() => router.push(`/cafe/${item.id}`)}
              onToggleBookmark={() => onToggleBookmark(item)}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  // ── 검색 폼 ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>카페 검색</Text>
        <Pressable hitSlop={10} onPress={() => router.push('/(tabs)/home')}>
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 190 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 검색 입력 */}
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

        {/* 인원수 */}
        <GroupLabel icon={<Ionicons name="people-outline" size={18} color={colors.ink} />} label="인원수" />
        <View style={styles.row}>
          {(['1', '2', '3'] as const).map((p) => (
            <OptionBtn
              key={p}
              label={`${p}명`}
              active={party === p}
              onPress={() => setParty(party === p ? null : p)}
            />
          ))}
          <OptionBtn
            label="직접입력"
            active={party === 'custom'}
            onPress={() => setParty(party === 'custom' ? null : 'custom')}
          />
        </View>
        {party === 'custom' && (
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="인원수 입력"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={customParty}
              onChangeText={setCustomParty}
              maxLength={2}
            />
            <Text style={styles.customSuffix}>명</Text>
          </View>
        )}

        {/* 콘센트 */}
        <GroupLabel
          icon={<MaterialCommunityIcons name="power-plug-outline" size={18} color={colors.ink} />}
          label="콘센트"
        />
        <View style={styles.row}>
          {(['있음', '없음'] as const).map((v) => (
            <OptionBtn
              key={v}
              label={v}
              active={outlet === v}
              onPress={() => setOutlet(outlet === v ? null : v)}
            />
          ))}
        </View>

        {/* 소음 */}
        <GroupLabel
          icon={<Ionicons name="volume-medium-outline" size={18} color={colors.ink} />}
          label="소음"
        />
        <View style={styles.row}>
          {(['조용함', '보통', '활기참'] as const).map((v) => (
            <OptionBtn
              key={v}
              label={v}
              active={noise === v}
              onPress={() => setNoise(noise === v ? null : v)}
            />
          ))}
        </View>

        {/* 내부 화장실 */}
        <GroupLabel
          icon={<MaterialCommunityIcons name="human-male-female" size={18} color={colors.ink} />}
          label="내부 화장실"
        />
        <View style={styles.row}>
          {(['있음', '없음'] as const).map((v) => (
            <OptionBtn
              key={v}
              label={v}
              active={toilet === v}
              onPress={() => setToilet(toilet === v ? null : v)}
            />
          ))}
        </View>

        {/* 편의 */}
        <GroupLabel
          icon={<Ionicons name="options-outline" size={18} color={colors.ink} />}
          label="편의"
        />
        <View style={styles.row}>
          {['주차 가능', '시간제한 없음', '노트북 작업'].map((t) => (
            <OptionBtn
              key={t}
              label={t}
              small
              active={extras.includes(t)}
              onPress={() =>
                setExtras((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                )
              }
            />
          ))}
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.searchBtn} onPress={search}>
          <Text style={styles.searchBtnText}>검색하기</Text>
        </Pressable>
        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetBtnText}>초기화</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function GroupLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.groupLabel}>
      {icon}
      <Text style={styles.groupLabelText}>{label}</Text>
    </View>
  );
}

function OptionBtn({
  label,
  active,
  onPress,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      style={[styles.option, active && styles.optionActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,
          small && { fontSize: 13 },
          active && styles.optionTextActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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
  filterTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 28,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  groupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  groupLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  option: {
    flex: 1,
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  optionActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  optionTextActive: {
    color: colors.white,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  customInput: {
    flex: 1,
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  customSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 10,
  },
  searchBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
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
  pillRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 13,
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
