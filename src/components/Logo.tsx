import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 44 : 34;
  const fontSize = size === 'lg' ? 34 : 26;
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.pin,
          { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
        ]}
      >
        <Ionicons name="cafe-outline" size={iconSize * 0.5} color={colors.greenBright} />
        <View style={styles.pinTail} />
      </View>
      <Text style={[styles.text, { fontSize }]}>
        <Text style={{ color: colors.ink }}>Take </Text>
        <Text style={{ color: colors.greenBright }}>In</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pin: {
    borderWidth: 2,
    borderColor: colors.greenBright,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  pinTail: {
    position: 'absolute',
    bottom: -5,
    width: 8,
    height: 8,
    backgroundColor: colors.greenBright,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  text: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
