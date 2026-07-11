import { View, Text, Pressable, ScrollView, type DimensionValue } from 'react-native';
import { MotiView } from 'moti';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { SeatNowLogo } from '@/components/SeatNowLogo';
import { FadeUp } from '@/components/motion';

interface Props {
  onKakao: () => void;
  onApple: () => void;
  onEmail: () => void;
  onSignUp: () => void;
  onGuest: () => void;
}

export function LoginLanding({ onKakao, onApple, onEmail, onSignUp, onGuest }: Props) {
  return (
    <View className="h-full w-full flex-col bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* logo + heading */}
        <FadeUp delay={40} className="items-center px-6 pb-5 pt-14">
          <View className="mb-7">
            <SeatNowLogo height={46} />
          </View>
          <Text className="mb-2.5 text-center text-[24px] font-extrabold leading-tight text-[#111]">
            가기 전에{'\n'}빈자리부터 확인하세요
          </Text>
          <Text className="text-center text-[14px] leading-relaxed text-[#999]">
            카페 방문 전, 실시간 빈자리와{'\n'}원하는 좌석을 확인해보세요.
          </Text>
        </FadeUp>

        {/* map preview */}
        <FadeUp delay={180} className="mb-8 px-6">
          <MapPreview />
        </FadeUp>

        {/* buttons */}
        <View className="gap-3 px-6 pb-4">
          <FadeUp delay={280}>
            <Pressable
              onPress={onKakao}
              className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-[18px] active:opacity-80"
              style={{ backgroundColor: '#FEE500' }}
            >
              <KakaoIcon />
              <Text className="text-[15px] font-bold text-[#191919]">카카오로 계속하기</Text>
            </Pressable>
          </FadeUp>

          <FadeUp delay={340}>
            <Pressable
              onPress={onApple}
              className="h-[54px] flex-row items-center justify-center gap-2.5 rounded-[18px] bg-[#111] active:opacity-80"
            >
              <AppleIcon />
              <Text className="text-[15px] font-bold text-white">Apple로 계속하기</Text>
            </Pressable>
          </FadeUp>

          <FadeUp delay={400}>
            <Pressable
              onPress={onEmail}
              className="h-[54px] flex-row items-center justify-center rounded-[18px] border border-[#E8E8E8] bg-white active:bg-[#F6F7F2]"
            >
              <Text className="text-[15px] font-semibold text-[#333]">이메일로 로그인</Text>
            </Pressable>
          </FadeUp>

          <FadeUp delay={460}>
            <View className="flex-row items-center justify-center gap-1 pt-1">
              <Text className="text-[13px] text-[#BBBBBB]">아직 계정이 없으신가요?</Text>
              <Pressable onPress={onSignUp} hitSlop={6}>
                <Text className="text-[13px] font-bold text-[#111] underline">회원가입</Text>
              </Pressable>
            </View>
          </FadeUp>
        </View>
      </ScrollView>

      {/* guest footer */}
      <MotiView
        className="border-t border-[#F4F4F4] px-6 py-5"
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 520 }}
      >
        <Pressable
          onPress={onGuest}
          className="flex-row items-center justify-center gap-1"
        >
          <Text className="text-[14px] font-semibold text-[#AAAAAA]">비회원으로 둘러보기</Text>
          <ChevronRight size={16} color="#AAAAAA" />
        </Pressable>
      </MotiView>
    </View>
  );
}

/* ─── tiny decorative map preview ─── */
function MapPreview() {
  return (
    <View className="w-full overflow-hidden rounded-[24px] bg-[#EEF2EA]" style={{ height: 200 }}>
      {/* roads */}
      <View className="absolute bg-white" style={{ top: '42%', left: 0, right: 0, height: 10, opacity: 0.8 }} />
      <View className="absolute bg-white" style={{ left: '44%', top: 0, bottom: 0, width: 8, opacity: 0.7 }} />
      {/* blocks */}
      <View className="absolute rounded-xl bg-[#C8D8C0]" style={{ top: '12%', left: '10%', width: 52, height: 32, opacity: 0.5 }} />
      <View className="absolute rounded-xl bg-[#C8D8C0]" style={{ top: '55%', left: '55%', width: 60, height: 28, opacity: 0.4 }} />
      <View className="absolute rounded-lg bg-[#DDE0DA]" style={{ top: '18%', left: '50%', width: 44, height: 26, opacity: 0.55 }} />
      <View className="absolute rounded-lg bg-[#DDE0DA]" style={{ top: '62%', left: '8%', width: 50, height: 28, opacity: 0.45 }} />

      <Marker top="22%" left="34%" bg="#E2FF8C" text="#2A3D00" label="4T" />
      <Marker top="54%" left="60%" bg="#FFE599" text="#4A3300" label="2T" />
      <Marker top="34%" left="68%" bg="#FF6B6B" text="#fff" label="0T" />

      {/* current location dot */}
      <View className="absolute" style={{ top: '46%', left: '43%' }}>
        <View className="h-3 w-3 rounded-full border-2 border-white bg-[#4285F4]" />
      </View>

      {/* info card */}
      <MotiView
        className="absolute bottom-3 left-3 right-3 rounded-[16px] bg-white px-4 py-3"
        style={{
          boxShadow: '0px 4px 16px rgba(0,0,0,0.10)',
        }}
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 850 }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <View className="mb-0.5 flex-row items-center gap-1.5">
              <Text className="text-[13px] font-bold text-[#111]">카페 온더웨이</Text>
              <View className="rounded-[5px] bg-[#E2FF8C] px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-[#2A3D00]">여유</Text>
              </View>
            </View>
            <Text className="text-[12px] text-[#BBBBBB]">도보 5분</Text>
          </View>
          <View className="items-end">
            <Text className="text-[20px] font-extrabold leading-none text-[#111]">4</Text>
            <Text className="text-[11px] text-[#CCCCCC]">빈 자리</Text>
          </View>
        </View>
      </MotiView>
    </View>
  );
}

function Marker({
  top,
  left,
  bg,
  text,
  label,
}: {
  top: DimensionValue;
  left: DimensionValue;
  bg: string;
  text: string;
  label: string;
}) {
  return (
    <View className="absolute items-center" style={{ top, left, marginLeft: -14, marginTop: -28 }}>
      <View
        className="items-center justify-center rounded-[9px] px-2"
        style={{ height: 24, backgroundColor: bg, boxShadow: '0px 1px 6px rgba(0,0,0,0.10)' }}
      >
        <Text style={{ color: text, fontWeight: '700', fontSize: 11 }}>{label}</Text>
      </View>
      {/* pointer triangle */}
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -1,
          borderLeftWidth: 3.5,
          borderRightWidth: 3.5,
          borderTopWidth: 4,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: bg,
        }}
      />
    </View>
  );
}

function KakaoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 1.5C4.858 1.5 1.5 4.19 1.5 7.5c0 2.13 1.32 4.002 3.318 5.136L3.75 16.5l4.008-2.676C8.238 13.938 8.616 14 9 14c4.142 0 7.5-2.69 7.5-6S13.142 1.5 9 1.5Z"
        fill="#191919"
      />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M12.74 1.5c.06.9-.27 1.8-.78 2.46-.51.66-1.32 1.17-2.1 1.11-.09-.87.27-1.77.75-2.4.51-.66 1.38-1.17 2.13-1.17ZM15.75 12.99c-.39.9-.57 1.29-1.08 2.07-.69 1.05-1.68 2.37-2.88 2.4-1.08.03-1.35-.69-2.82-.69-1.47 0-1.77.72-2.88.69-1.2-.03-2.13-1.23-2.82-2.28C1.5 12.54 1.5 9.15 2.7 7.35c.84-1.26 2.16-2.01 3.39-2.01 1.29 0 2.1.69 3.18.69 1.05 0 1.68-.69 3.18-.69 1.08 0 2.25.6 3.09 1.65-.87.48-2.34 1.68-2.34 3.72 0 2.37 1.65 3.36 2.55 3.28Z"
        fill="white"
      />
    </Svg>
  );
}
