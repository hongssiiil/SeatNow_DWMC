import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

// Matches the web's fadeUp preset: waits ~300ms (BASE) for the screen
// slide-in to settle, then fades + rises 12px. `delay` is extra ms on top.
const BASE_MS = 300;

interface FadeUpProps {
  delay?: number; // extra delay in ms
  duration?: number;
  children: ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function FadeUp({ delay = 0, duration = 400, children, className, style }: FadeUpProps) {
  return (
    <MotiView
      className={className}
      style={style}
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration, delay: BASE_MS + delay }}
    >
      {children}
    </MotiView>
  );
}
