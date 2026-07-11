import { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { MotiView } from 'moti';
import {
  Search,
  MapPin,
  RefreshCw,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Navigation,
  Bookmark,
} from 'lucide-react-native';

import { SeatNowLogo } from '@/components/SeatNowLogo';
import { LoginPromptSheet } from '@/components/LoginPromptSheet';
import { CAFES, STATUS, type Cafe } from '@/data/cafes';

const FILTERS = ['전체', '여유', '콘센트', '1인석'];
const SORT_OPTIONS = ['거리순', '빈자리 많은 순', '여유도 순', '최근 업데이트 순'];
const UPDATE_SECS: Record<string, number> = { '방금 전': 0, '30초 전': 30, '1분 전': 60, '10분 전': 600 };

const PAN_CLAMP = 160;

interface Props {
  isLoggedIn: boolean;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onNavigateToDetail: (id: string) => void;
  onOpenSaved: () => void;
  onLoginRequest: () => void;
}

export function MapScreen({
  isLoggedIn,
  savedIds,
  onToggleSave,
  onNavigateToDetail,
  onOpenSaved,
  onLoginRequest,
}: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('거리순');
  const [sortOpen, setSortOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // 3-snap bottom sheet: collapsed / half / expanded (heights from bottom).
  const snapPoints = useMemo(() => ['24%', '54%', '70%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  // Map pan + zoom via reanimated shared values.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.set(tx.get());
      startY.set(ty.get());
    })
    .onUpdate((e) => {
      tx.set(Math.max(-PAN_CLAMP, Math.min(PAN_CLAMP, startX.get() + e.translationX)));
      ty.set(Math.max(-PAN_CLAMP, Math.min(PAN_CLAMP, startY.get() + e.translationY)));
    });

  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  const zoomBy = (delta: number) => {
    const next = Math.max(0.5, Math.min(2.4, +(scale.get() + delta).toFixed(1)));
    scale.set(withSpring(next, { damping: 20 }));
  };
  const resetMap = () => {
    tx.set(withSpring(0, { damping: 20 }));
    ty.set(withSpring(0, { damping: 20 }));
    scale.set(withSpring(1, { damping: 20 }));
  };

  const handleSave = (cafeId: string) => {
    if (!isLoggedIn) {
      setShowPrompt(true);
      return;
    }
    onToggleSave(cafeId);
  };

  const sorted = useMemo(() => {
    const filtered = CAFES.filter((c) => {
      if (filter === '전체') return true;
      if (filter === '여유') return c.status === 'available';
      return c.tags.includes(filter);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === '거리순') return a.walkMin - b.walkMin;
      if (sortBy === '빈자리 많은 순') return b.tableCount - a.tableCount;
      if (sortBy === '여유도 순') {
        const o = { available: 0, normal: 1, crowded: 2, unknown: 3 };
        return o[a.status] - o[b.status];
      }
      if (sortBy === '최근 업데이트 순')
        return (UPDATE_SECS[a.lastUpdated] ?? 999) - (UPDATE_SECS[b.lastUpdated] ?? 999);
      return 0;
    });
  }, [filter, sortBy]);

  return (
    <View className="h-full w-full bg-[#EEF2EA]">
      {/* ══ MAP (pannable + zoomable) ══ */}
      <GestureDetector gesture={pan}>
        <Animated.View className="absolute inset-0" style={mapStyle}>
          <MapBackground />
          {CAFES.map((c) => (
            <Marker
              key={c.id}
              cafe={c}
              saved={savedIds.has(c.id)}
              onPress={() => onNavigateToDetail(c.id)}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* ══ zoom + location controls ══ */}
      <View className="absolute right-4 gap-1" style={{ bottom: '30%' }}>
        <ControlButton onPress={() => zoomBy(0.3)}>
          <Plus size={16} strokeWidth={2} color="#333" />
        </ControlButton>
        <ControlButton onPress={() => zoomBy(-0.3)}>
          <Minus size={16} strokeWidth={2} color="#333" />
        </ControlButton>
        <View className="mt-1">
          <ControlButton onPress={resetMap}>
            <Navigation size={16} strokeWidth={2} color="#4285F4" />
          </ControlButton>
        </View>
      </View>

      {/* ══ FLOATING HEADER ══ (box-none lets map gestures pass through empty areas) */}
      <View className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 8 }} pointerEvents="box-none">
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 120 }}
          className="rounded-[20px] border border-[#EEEEEE] bg-white"
          style={{ boxShadow: '0px 2px 16px rgba(0,0,0,0.08)' }}
        >
          {/* Row 1: logo + saved */}
          <View className="flex-row items-center justify-between px-4 pb-2.5 pt-3.5">
            <SeatNowLogo height={26} />
            <Pressable
              onPress={onOpenSaved}
              className="h-[34px] w-[34px] items-center justify-center rounded-[9px] active:bg-[#F6F7F2]"
            >
              <Bookmark size={15} strokeWidth={1.8} color="#555" />
            </Pressable>
          </View>

          <View className="mx-4 border-t border-[#F2F2F2]" />

          {/* Row 2: search + 내 근처 */}
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-2.5">
            <View className="h-[40px] flex-1 flex-row items-center rounded-[11px] bg-[#F6F7F2] px-3">
              <Search size={14} strokeWidth={2} color="#BBBBBB" />
              <TextInput
                placeholder="카페 이름 또는 지역 검색"
                placeholderTextColor="#C0C0C0"
                className="ml-2 flex-1 text-[13px] text-[#111]"
              />
            </View>
            <Pressable className="h-[40px] flex-row items-center gap-1.5 rounded-[11px] bg-[#F6F7F2] px-3.5 active:bg-[#ECEEE7]">
              <MapPin size={12} strokeWidth={2.5} color="#8DC63F" />
              <Text className="text-[12px] font-semibold text-[#444]">내 근처</Text>
            </Pressable>
          </View>

          {/* Row 3: filter chips */}
          <View className="flex-row gap-2 px-4 pb-3.5 pt-1">
            {FILTERS.map((f) => {
              const on = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className="h-[30px] justify-center rounded-full border px-3.5"
                  style={{
                    backgroundColor: on ? '#111' : '#F6F7F2',
                    borderColor: on ? '#111' : 'transparent',
                  }}
                >
                  <Text className="text-[12px] font-semibold" style={{ color: on ? '#fff' : '#555' }}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </MotiView>
      </View>

      {/* ══ BOTTOM SHEET ══ */}
      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        handleIndicatorStyle={{ backgroundColor: '#E0E0E0', width: 32, height: 3 }}
        backgroundStyle={{ backgroundColor: '#fff', borderRadius: 20 }}
      >
        {/* header */}
        <View className="flex-row items-center justify-between border-b border-[#F2F2F2] px-5 pb-3">
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-[15px] font-bold text-[#111]">주변 빈자리</Text>
            <Text className="text-[12px] font-medium text-[#BBBBBB]">{sorted.length}곳</Text>
          </View>
          <Pressable onPress={() => setSortOpen(true)} className="flex-row items-center gap-1 px-1 py-1" hitSlop={6}>
            <Text className="text-[12px] font-semibold text-[#444]">{sortBy}</Text>
            <ChevronDown size={14} color="#AAAAAA" />
          </Pressable>
        </View>

        <BottomSheetFlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-[#F6F7F2]">
                <MapPin size={20} color="#D4D4D4" />
              </View>
              <Text className="text-[13px] font-medium text-[#C0C0C0]">해당 조건의 카페가 없어요</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CafeCard
              cafe={item}
              saved={savedIds.has(item.id)}
              onPress={() => onNavigateToDetail(item.id)}
              onToggleSave={() => handleSave(item.id)}
            />
          )}
        />
      </BottomSheet>

      {/* sort menu */}
      <SortMenu
        visible={sortOpen}
        current={sortBy}
        onSelect={(opt) => {
          setSortBy(opt);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />

      {/* login prompt */}
      <LoginPromptSheet
        visible={showPrompt}
        onLogin={onLoginRequest}
        onClose={() => setShowPrompt(false)}
      />
    </View>
  );
}

/* ─── map background (roads / blocks / location dot) ─── */
function MapBackground() {
  return (
    <View className="absolute bg-[#EEF2EA]" style={{ top: -PAN_CLAMP, bottom: -PAN_CLAMP, left: -PAN_CLAMP, right: -PAN_CLAMP }}>
      <View className="absolute bg-white" style={{ top: '30%', left: 0, right: 0, height: 10, opacity: 0.92 }} />
      <View className="absolute bg-white" style={{ top: '58%', left: 0, right: 0, height: 7, opacity: 0.75 }} />
      <View className="absolute bg-white" style={{ left: '38%', top: 0, bottom: 0, width: 10, opacity: 0.92 }} />
      <View className="absolute bg-white" style={{ left: '64%', top: 0, bottom: 0, width: 7, opacity: 0.75 }} />
      <View className="absolute rounded-xl bg-[#C8D8C0]" style={{ top: '11%', left: '13%', width: 56, height: 36, opacity: 0.45 }} />
      <View className="absolute rounded-xl bg-[#C8D8C0]" style={{ top: '42%', left: '48%', width: 68, height: 32, opacity: 0.38 }} />
      <View className="absolute rounded-md bg-[#DDE0DA]" style={{ top: '18%', left: '44%', width: 44, height: 28, opacity: 0.6 }} />
      <View className="absolute rounded-md bg-[#DDE0DA]" style={{ top: '65%', left: '9%', width: 52, height: 30, opacity: 0.5 }} />
      <View className="absolute rounded-md bg-[#D8DCD6]" style={{ top: '46%', left: '68%', width: 38, height: 24, opacity: 0.42 }} />
      {/* current location */}
      <View className="absolute" style={{ top: '48%', left: '45%' }}>
        <View className="h-[13px] w-[13px] rounded-full border-[2.5px] border-white bg-[#4285F4]" />
      </View>
    </View>
  );
}

/* ─── map marker ─── */
function Marker({ cafe, saved, onPress }: { cafe: Cafe; saved: boolean; onPress: () => void }) {
  const s = STATUS[cafe.status];
  const top = `${((cafe.my / 300) * 100).toFixed(1)}%` as `${number}%`;
  const left = `${((cafe.mx / 400) * 100).toFixed(1)}%` as `${number}%`;

  return (
    <View className="absolute items-center" style={{ top, left, transform: [{ translateX: -20 }, { translateY: -34 }], zIndex: 10 }}>
      <Pressable onPress={onPress} className="items-center active:opacity-90">
        <View className="relative">
          {saved && (
            <View
              className="absolute -right-1.5 -top-1.5 z-10 h-4 w-4 items-center justify-center rounded-full bg-[#111]"
            >
              <Bookmark size={8} color="white" fill="white" strokeWidth={0} />
            </View>
          )}
          <View
            className="flex-row items-center px-3"
            style={{ height: 30, borderRadius: 12, backgroundColor: s.bg, boxShadow: `0px 2px 8px ${s.shadow}` }}
          >
            <Text style={{ fontSize: 12, lineHeight: 12, fontWeight: '700', color: s.text }}>
              {cafe.status === 'unknown' ? '?' : `${cafe.tableCount}T`}
            </Text>
          </View>
        </View>
        {/* pointer triangle */}
        <View
          style={{
            width: 0,
            height: 0,
            marginTop: -1,
            borderLeftWidth: 4,
            borderRightWidth: 4,
            borderTopWidth: 5,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: s.bg,
          }}
        />
      </Pressable>
    </View>
  );
}

/* ─── cafe list card ─── */
function CafeCard({
  cafe,
  saved,
  onPress,
  onToggleSave,
}: {
  cafe: Cafe;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}) {
  const s = STATUS[cafe.status];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-[16px] border border-[#EEEEEE] bg-white px-4 py-3.5 active:opacity-95"
      style={{ minHeight: 112, boxShadow: '0px 1px 4px rgba(0,0,0,0.04)' }}
    >
      <View className="min-w-0 flex-1 flex-col gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink text-[14px] font-bold text-[#111]" numberOfLines={1}>
            {cafe.name}
          </Text>
          <View className="rounded-[5px] px-2 py-0.5" style={{ backgroundColor: s.bg }}>
            <Text className="text-[10px] font-bold" style={{ color: s.text }}>
              {s.label}
            </Text>
          </View>
        </View>
        <View className="mt-0.5">
          {cafe.status === 'unknown' ? (
            <Text className="text-[13px] font-semibold text-[#C0C0C0]">좌석 확인 불가</Text>
          ) : cafe.tableCount === 0 ? (
            <Text className="text-[20px] font-extrabold text-[#FF6B6B]">만석</Text>
          ) : (
            <View className="flex-row items-baseline gap-1">
              <Text className="text-[22px] font-extrabold text-[#111]">빈 테이블 {cafe.tableCount}개</Text>
              <Text className="text-[11px] text-[#D0D0D0]">/ {cafe.totalTables}</Text>
            </View>
          )}
        </View>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Text className="text-[11px] font-medium text-[#BBBBBB]">도보 {cafe.walkMin}분</Text>
          <Text className="text-[11px] text-[#BBBBBB]">·</Text>
          <RefreshCw size={10} color="#BBBBBB" />
          <Text className="text-[11px] font-medium text-[#BBBBBB]">{cafe.lastUpdated}</Text>
        </View>
        <View className="mt-1 flex-row gap-1.5">
          {cafe.tags.slice(0, 2).map((t) => (
            <View key={t} className="rounded-full bg-[#F6F7F2] px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-[#888]">{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="relative">
        <View className="h-[68px] w-[68px] rounded-[12px]" style={{ backgroundColor: cafe.photo }} />
        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border border-[#EEEEEE] bg-white"
        >
          <Bookmark
            size={12}
            strokeWidth={saved ? 0 : 2}
            fill={saved ? '#111' : 'none'}
            color={saved ? '#111' : '#BBBBBB'}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

/* ─── control button ─── */
function ControlButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-[10px] border border-[#E8E8E8] bg-white active:bg-[#F6F7F2]"
      style={{ boxShadow: '0px 1px 3px rgba(0,0,0,0.08)' }}
    >
      {children}
    </Pressable>
  );
}

/* ─── sort menu (bottom modal) ─── */
function SortMenu({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (opt: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <MotiView
        from={{ translateY: 300 }}
        animate={{ translateY: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white px-4 pb-10 pt-4"
      >
        <View className="mx-auto mb-4 h-[3px] w-8 rounded-full bg-[#E4E4E4]" />
        <Text className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-[#BBBBBB]">정렬 기준</Text>
        {SORT_OPTIONS.map((opt) => {
          const on = current === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              className="flex-row items-center justify-between px-2 py-3.5 active:bg-[#F6F7F2]"
            >
              <Text className="text-[14px]" style={{ color: on ? '#111' : '#666', fontWeight: on ? '700' : '500' }}>
                {opt}
              </Text>
              {on && <Check size={16} strokeWidth={2.5} color="#111" />}
            </Pressable>
          );
        })}
      </MotiView>
    </Modal>
  );
}
