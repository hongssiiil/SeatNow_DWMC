import { View, Text, Pressable, FlatList } from 'react-native';
import { MotiView } from 'moti';
import { ChevronLeft, Bookmark, RefreshCw } from 'lucide-react-native';

import { CAFES, STATUS, type Cafe } from '@/data/cafes';

interface Props {
  savedIds: Set<string>;
  onBack: () => void;
  onNavigateToDetail: (id: string) => void;
  onToggleSave: (id: string) => void;
  onBrowse: () => void;
}

export function SavedScreen({ savedIds, onBack, onNavigateToDetail, onToggleSave, onBrowse }: Props) {
  const saved = CAFES.filter((c) => savedIds.has(c.id));

  return (
    <View className="h-full w-full flex-col bg-white">
      {/* nav */}
      <View className="h-[52px] flex-row items-center justify-between border-b border-[#F2F2F2] px-4">
        <Pressable onPress={onBack} className="-ml-2 rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
          <ChevronLeft size={20} strokeWidth={2.5} color="#111" />
        </Pressable>
        <Text className="text-[16px] font-bold text-[#111]">내 저장</Text>
        <View className="w-9" />
      </View>

      <FlatList
        data={saved}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="px-1 pb-4 pt-5">
            <Text className="text-[13px] leading-relaxed text-[#AAAAAA]">
              저장한 카페의 빈자리 현황을 빠르게 확인해보세요.
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState onBrowse={onBrowse} />}
        renderItem={({ item, index }) => (
          <SavedCard
            cafe={item}
            index={index}
            onPress={() => onNavigateToDetail(item.id)}
            onToggleSave={() => onToggleSave(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
      />
    </View>
  );
}

function SavedCard({
  cafe,
  index,
  onPress,
  onToggleSave,
}: {
  cafe: Cafe;
  index: number;
  onPress: () => void;
  onToggleSave: () => void;
}) {
  const s = STATUS[cafe.status];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 60 }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-[16px] border border-[#EEEEEE] bg-white px-4 py-3.5 active:opacity-95"
        style={{
          boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* info */}
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
                <Text className="text-[20px] font-extrabold text-[#111]">
                  빈 테이블 {cafe.tableCount}개
                </Text>
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

          <View className="mt-0.5 flex-row gap-1.5">
            {cafe.tags.slice(0, 2).map((t) => (
              <View key={t} className="rounded-full bg-[#F6F7F2] px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-[#888]">{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* photo + bookmark */}
        <View className="relative">
          <View className="h-[68px] w-[68px] rounded-[12px]" style={{ backgroundColor: cafe.photo }} />
          <Pressable
            onPress={onToggleSave}
            hitSlop={8}
            className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border border-[#EEEEEE] bg-white"
          >
            <Bookmark size={12} strokeWidth={2} fill="#111" color="#111" />
          </Pressable>
        </View>
      </Pressable>
    </MotiView>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View className="items-center justify-center px-6 py-20">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#F6F7F2]">
        <Bookmark size={28} strokeWidth={1.6} color="#D8D8D8" />
      </View>
      <Text className="mb-2 text-[16px] font-bold text-[#333]">아직 저장한 카페가 없어요</Text>
      <Text className="mb-8 text-center text-[13px] leading-relaxed text-[#AAAAAA]">
        자주 가는 카페를 저장해두면{'\n'}빈자리를 빠르게 확인할 수 있어요.
      </Text>
      <Pressable
        onPress={onBrowse}
        className="h-[50px] items-center justify-center rounded-[16px] bg-[#CDFF4E] px-8 active:opacity-80"
      >
        <Text className="text-[15px] font-bold text-[#111]">주변 카페 둘러보기</Text>
      </Pressable>
    </View>
  );
}
