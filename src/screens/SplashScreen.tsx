import { View, Text } from 'react-native';

import { SeatNowLogo } from '@/components/SeatNowLogo';

export function SplashScreen() {
  return (
    <View className="h-full w-full flex-col items-center justify-center bg-white">
      <View className="flex-col items-center gap-7">
        <SeatNowLogo height={68} />
        <Text className="text-center text-[14px] font-medium leading-relaxed tracking-wide text-[#888888]">
          가기 전에 빈자리부터 확인하세요
        </Text>
      </View>
    </View>
  );
}
