import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';

export function FilterChip({
  label,
  icon,
  iconSet,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  iconSet?: 'ion' | 'mci';
  active: boolean;
  onPress: () => void;
}) {
  const iconColor = active ? colors.white : colors.green;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? (
        icon === 'ellipse' ? (
          <View
            style={[
              styles.dot,
              { backgroundColor: active ? colors.white : colors.goodDot },
            ]}
          />
        ) : iconSet === 'mci' ? (
          <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={16} color={iconColor} />
        )
      ) : null}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  labelActive: {
    color: colors.white,
  },
});
