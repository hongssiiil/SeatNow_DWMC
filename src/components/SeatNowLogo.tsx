import { View, Text, Image } from 'react-native';

const OLIVE = '#566349';
const LIME_WORD = '#8DC63F';

const logoIcon = require('../../assets/images/seatnow-logo.png');

interface Props {
  variant?: 'full' | 'icon';
  height?: number;
}

export function SeatNowLogo({ variant = 'full', height = 52 }: Props) {
  // Scale icon down so visual pin size matches wordmark cap-height
  const iconSize = Math.round(height * 1.15);

  if (variant === 'icon') {
    return (
      <Image
        source={logoIcon}
        resizeMode="contain"
        style={{ width: iconSize, height: iconSize }}
        accessibilityLabel="SeatNow 아이콘"
      />
    );
  }

  const fontSize = Math.round(height * 0.62);
  const gap = Math.round(height * 0.08);

  return (
    <View className="flex-row items-center" style={{ gap }}>
      <Image
        source={logoIcon}
        resizeMode="contain"
        style={{ width: iconSize, height: iconSize }}
        accessibilityLabel="SeatNow 아이콘"
      />
      <Text
        style={{
          fontSize,
          fontWeight: '700',
          lineHeight: fontSize,
          letterSpacing: -0.3,
        }}
      >
        <Text style={{ color: OLIVE }}>Seat</Text>
        <Text style={{ color: LIME_WORD }}>Now</Text>
      </Text>
    </View>
  );
}
