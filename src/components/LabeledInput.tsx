import { useState } from 'react';
import { View, Text, TextInput, Pressable, type KeyboardTypeOptions } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  password?: boolean; // renders eye toggle + secureTextEntry
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

// Shared labeled text field used by EmailLogin & SignUp.
// Mirrors the web input styling (rounded, light bg, lime focus border).
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  password = false,
  keyboardType,
  autoCapitalize = 'none',
}: Props) {
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState(false);

  const borderColor = focused ? '#CDFF4E' : '#E8E8E8';
  const bg = focused ? '#FFFFFF' : '#FAFAFA';

  return (
    <View>
      <Text className="mb-1.5 text-[12px] font-semibold text-[#888]">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#CCCCCC"
          secureTextEntry={password && !showPw}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-[52px] rounded-[14px] border px-4 text-[15px] text-[#111]"
          style={{ borderColor, backgroundColor: bg, paddingRight: password ? 48 : 16 }}
        />
        {password && (
          <Pressable
            onPress={() => setShowPw((v) => !v)}
            className="absolute right-4"
            hitSlop={8}
          >
            {showPw ? (
              <EyeOff size={18} strokeWidth={1.8} color="#CCCCCC" />
            ) : (
              <Eye size={18} strokeWidth={1.8} color="#CCCCCC" />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
