import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Rect } from 'react-native-svg';

interface Props {
  onStart: () => void;
  onSkip: () => void;
}

const PREFS = ['콘센트', '소파석', '1인석', '4인석', '조용한 자리', '창가 자리', '높은 테이블'];

export function PreferenceSetup({ onStart, onSkip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (p: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  return (
    <View className="h-full w-full flex-col bg-white px-6">
      {/* top spacer */}
      <View className="h-[64px]" />

      {/* icon */}
      <MotiView
        className="mb-6 h-14 w-14 items-center justify-center self-start rounded-full bg-[#CDFF4E]"
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18 }}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Rect x={3} y={9} width={18} height={3} rx={1.5} fill="#111" opacity={0.8} />
          <Rect x={5} y={12} width={2.5} height={6} rx={1.25} fill="#111" opacity={0.6} />
          <Rect x={16.5} y={12} width={2.5} height={6} rx={1.25} fill="#111" opacity={0.6} />
        </Svg>
      </MotiView>

      {/* heading */}
      <MotiView
        className="mb-8"
        from={{ translateY: 12, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', delay: 100 }}
      >
        <Text className="mb-2 text-[24px] font-extrabold leading-snug text-[#111]">
          자주 찾는 좌석을{'\n'}선택해보세요
        </Text>
        <Text className="text-[14px] leading-relaxed text-[#AAAAAA]">
          선호하는 좌석을 미리 설정하면{'\n'}빈자리를 더 빠르게 찾을 수 있어요.
        </Text>
      </MotiView>

      {/* chips */}
      <MotiView
        className="mb-10 flex-row flex-wrap gap-2.5"
        from={{ translateY: 8, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', delay: 180 }}
      >
        {PREFS.map((p) => {
          const on = selected.has(p);
          return (
            <Pressable
              key={p}
              onPress={() => toggle(p)}
              className="h-[40px] justify-center rounded-full border px-4 active:opacity-80"
              style={{
                backgroundColor: on ? '#CDFF4E' : '#FAFAFA',
                borderColor: on ? '#CDFF4E' : '#E8E8E8',
              }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: on ? '#111' : '#666' }}>
                {p}
              </Text>
            </Pressable>
          );
        })}
      </MotiView>

      {/* spacer */}
      <View className="flex-1" />

      {/* CTAs */}
      <View className="gap-3 pb-8">
        <Pressable
          onPress={onStart}
          className="h-[54px] items-center justify-center rounded-[18px] bg-[#CDFF4E] active:opacity-80"
        >
          <Text className="text-[16px] font-bold text-[#111]">시작하기</Text>
        </Pressable>
        <Pressable onPress={onSkip} className="h-[44px] items-center justify-center">
          <Text className="text-[14px] font-semibold text-[#CCCCCC]">나중에 할게요</Text>
        </Pressable>
      </View>
    </View>
  );
}
