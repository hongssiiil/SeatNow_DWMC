import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { ChevronLeft } from 'lucide-react-native';

import { FadeUp } from '@/components/motion';
import { LabeledInput } from '@/components/LabeledInput';

interface Props {
  onBack: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onGuest: () => void;
}

export function EmailLogin({ onBack, onLogin, onSignUp, onGuest }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = email.length > 0 && password.length >= 6;

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <View className="h-full w-full flex-col bg-white">
      {/* nav */}
      <View className="h-[52px] flex-row items-center border-b border-[#F2F2F2] px-4">
        <Pressable onPress={onBack} className="-ml-2 rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
          <ChevronLeft size={20} strokeWidth={2.5} color="#111" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        {/* heading */}
        <FadeUp delay={0} className="mb-8">
          <View className="mb-5 h-9 w-9 items-center justify-center rounded-full bg-[#CDFF4E]">
            <View className="h-3.5 w-3.5 rounded-full bg-[#111]" />
          </View>
          <Text className="mb-1 text-[26px] font-extrabold text-[#111]">로그인</Text>
          <Text className="text-[14px] text-[#AAAAAA]">이메일 계정으로 계속할게요</Text>
        </FadeUp>

        {/* fields */}
        <View className="mb-2 gap-3">
          <FadeUp delay={100}>
            <LabeledInput
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
            />
          </FadeUp>
          <FadeUp delay={160}>
            <LabeledInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상 입력해주세요"
              password
            />
          </FadeUp>
        </View>

        {/* forgot */}
        <FadeUp delay={220} className="mb-8 items-end">
          <Pressable hitSlop={6}>
            <Text className="text-[13px] font-medium text-[#AAAAAA]">비밀번호를 잊으셨나요?</Text>
          </Pressable>
        </FadeUp>

        {/* login btn */}
        <FadeUp delay={260}>
          <Pressable
            onPress={handleLogin}
            disabled={!valid || loading}
            className="h-[54px] items-center justify-center rounded-[18px] active:opacity-90"
            style={{ backgroundColor: valid ? '#CDFF4E' : '#F0F0F0' }}
          >
            <Text className="text-[16px] font-bold" style={{ color: valid ? '#111' : '#CCCCCC' }}>
              {loading ? '로그인 중…' : '로그인'}
            </Text>
          </Pressable>
        </FadeUp>

        {/* signup link */}
        <FadeUp delay={320} className="mt-5">
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-[13px] text-[#BBBBBB]">아직 계정이 없으신가요?</Text>
            <Pressable onPress={onSignUp} hitSlop={6}>
              <Text className="text-[13px] font-bold text-[#111] underline">회원가입</Text>
            </Pressable>
          </View>
        </FadeUp>
      </ScrollView>

      {/* guest footer */}
      <MotiView
        className="border-t border-[#F4F4F4] px-6 py-5"
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 350, delay: 660 }}
      >
        <Pressable onPress={onGuest}>
          <Text className="text-center text-[13px] font-semibold text-[#CCCCCC]">비회원으로 둘러보기</Text>
        </Pressable>
      </MotiView>
    </View>
  );
}
