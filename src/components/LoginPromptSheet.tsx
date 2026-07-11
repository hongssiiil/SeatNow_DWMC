import { Modal, View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  visible: boolean;
  onLogin: () => void;
  onClose: () => void;
}

// Bottom modal shown when a guest tries to save a cafe.
export function LoginPromptSheet({ visible, onLogin, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <MotiView
        from={{ translateY: 400 }}
        animate={{ translateY: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white px-6 pb-10 pt-4"
        style={{ boxShadow: '0px -4px 24px rgba(0,0,0,0.10)' }}
      >
        <View className="mx-auto mb-6 h-[3px] w-8 rounded-full bg-[#E4E4E4]" />

        <View className="mb-8 items-center">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#F6F7F2]">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 21H5a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2Z"
                stroke="#111"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              <Circle cx={12} cy={8} r={4} stroke="#111" strokeWidth={1.8} />
            </Svg>
          </View>
          <Text className="mb-2 text-[18px] font-extrabold text-[#111]">저장하려면 로그인이 필요해요</Text>
          <Text className="text-center text-[14px] leading-relaxed text-[#AAAAAA]">
            자주 가는 카페를 저장하고{'\n'}빈자리를 빠르게 확인해보세요.
          </Text>
        </View>

        <Pressable
          onPress={onLogin}
          className="mb-3 h-[54px] items-center justify-center rounded-[18px] bg-[#CDFF4E] active:opacity-80"
        >
          <Text className="text-[16px] font-bold text-[#111]">로그인하기</Text>
        </Pressable>
        <Pressable onPress={onClose} className="h-[44px] items-center justify-center">
          <Text className="text-[14px] font-semibold text-[#BBBBBB]">나중에</Text>
        </Pressable>
      </MotiView>
    </Modal>
  );
}
