import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { LabeledInput } from '@/components/LabeledInput';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
  onLogin: () => void;
}

export function SignUp({ onBack, onSuccess, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = email.length > 0 && password.length >= 6 && nickname.length > 0;

  const handleSignUp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 900);
  };

  return (
    <View className="h-full w-full flex-col bg-white">
      {/* nav */}
      <View className="h-[52px] flex-row items-center border-b border-[#F2F2F2] px-4">
        <Pressable onPress={onBack} className="-ml-2 rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
          <ChevronLeft size={20} strokeWidth={2.5} color="#111" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-8"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* heading */}
        <View className="mb-8">
          <View className="mb-5 h-9 w-9 items-center justify-center rounded-full bg-[#CDFF4E]">
            <View className="h-3.5 w-3.5 rounded-full bg-[#111]" />
          </View>
          <Text className="mb-1 text-[26px] font-extrabold text-[#111]">회원가입</Text>
          <Text className="text-[14px] text-[#AAAAAA]">빈자리를 가장 먼저 확인해보세요</Text>
        </View>

        {/* fields */}
        <View className="mb-8 gap-3">
          <LabeledInput
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
          />
          <LabeledInput
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="6자 이상 입력해주세요"
            password
          />
          <LabeledInput
            label="닉네임"
            value={nickname}
            onChangeText={setNickname}
            placeholder="앱에서 사용할 닉네임"
          />
        </View>

        {/* signup btn */}
        <Pressable
          onPress={handleSignUp}
          disabled={!valid || loading}
          className="mb-5 h-[54px] items-center justify-center rounded-[18px] active:opacity-90"
          style={{ backgroundColor: valid ? '#CDFF4E' : '#F0F0F0' }}
        >
          <Text className="text-[16px] font-bold" style={{ color: valid ? '#111' : '#CCCCCC' }}>
            {loading ? '가입 중…' : '회원가입'}
          </Text>
        </Pressable>

        {/* login link */}
        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-[13px] text-[#BBBBBB]">이미 계정이 있으신가요?</Text>
          <Pressable onPress={onLogin} hitSlop={6}>
            <Text className="text-[13px] font-bold text-[#111] underline">로그인</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
