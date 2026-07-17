import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { colors, radius } from '../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useApp();
  const [notifOn, setNotifOn] = useState(true);
  const [locationOn, setLocationOn] = useState(true);

  const onLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          logout();
          router.dismissAll();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {user && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>닉네임</Text>
              <Text style={styles.rowValue}>{user.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>로그인</Text>
              <Text style={styles.rowValue}>
                {user.provider === 'kakao' ? '카카오' : 'Apple'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>빈자리 알림</Text>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ true: colors.green, false: colors.track }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>위치 서비스</Text>
            <Switch
              value={locationOn}
              onValueChange={setLocationOn}
              trackColor={{ true: colors.green, false: colors.track }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => Alert.alert('Take In', '버전 1.0.0\n자리나우 팀')}
          >
            <Text style={styles.rowLabel}>앱 정보</Text>
            <Text style={styles.rowValue}>v1.0.0</Text>
          </Pressable>
        </View>

        {user ? (
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.logoutBtn, { borderColor: colors.green }]}
            onPress={() => {
              router.dismissAll();
              router.replace('/');
            }}
          >
            <Text style={[styles.logoutText, { color: colors.green }]}>로그인하기</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 15,
    color: colors.sub,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.badText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.badText,
  },
});
