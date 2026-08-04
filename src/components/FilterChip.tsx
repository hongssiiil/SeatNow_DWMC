import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';

const PRIMARY = '#1F4D3D';

export function FilterChip({
  label,
  icon,
  iconSet,
  active,
  onPress,
  accent,
  accessibilityLabel = 'filter-chip',
  style,
}: {
  label: string;
  icon?: string;
  iconSet?: 'ion' | 'mci';
  active: boolean;
  onPress: () => void;
  /** dot color / active tint override */
  accent?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const activeBg = accent && active ? accent : active ? PRIMARY : colors.white;
  const activeBorder = accent && active ? accent : active ? PRIMARY : colors.border;
  const iconColor = active ? colors.white : accent || colors.green;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: activeBg, borderColor: activeBorder },
        style,
      ]}
    >
      {icon ? (
        iconSet === 'mci' ? (
          <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={16} color={iconColor} />
        )
      ) : accent ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: active ? colors.white : accent },
          ]}
        />
      ) : null}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.ink,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  labelActive: {
    color: colors.white,
  },
});
