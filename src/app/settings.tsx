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
import { deleteAccount } from '../lib/account';
import { useApp } from '../lib/store';
import { colors, radius } from '../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useApp();
  const [notifOn, setNotifOn] = useState(true);
  const [locationOn, setLocationOn] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const runDeleteAccount = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    const result = await deleteAccount(user.key, user.provider);
    setDeleting(false);

    if (!result.ok) {
      // 부분 실패를 성공으로 위장하지 않는다 — 남은 데이터가 있으면 알린다
      Alert.alert(
        '일부 데이터를 지우지 못했어요',
        '네트워크 상태를 확인한 뒤 다시 시도해 주세요. 계속 실패하면 문의해 주세요.'
      );
      return;
    }

    logout();
    router.dismissAll();
    router.replace('/');
    Alert.alert('계정이 삭제됐어요', '이용해 주셔서 감사합니다.');
  };

  /** 되돌릴 수 없는 작업이므로 2단계로 확인한다 */
  const onDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '저장한 카페, 테이크인 기록, 리뷰가 모두 삭제되며 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '계속',
          style: 'destructive',
          onPress: () =>
            Alert.alert('정말 삭제할까요?', '이 작업은 취소할 수 없어요.', [
              { text: '아니요', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: runDeleteAccount,
              },
            ]),
        },
      ]
    );
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
            onPress={() => Alert.alert('Sitnow', '버전 1.0.0\n자리나우 팀')}
          >
            <Text style={styles.rowLabel}>앱 정보</Text>
            <Text style={styles.rowValue}>v1.0.0</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityLabel="privacy-policy-btn"
            style={styles.row}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.rowLabel}>개인정보처리방침</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.sub} />
          </Pressable>
        </View>

        {user ? (
          <>
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
            {/* App Store 5.1.1(v) — 앱 내 계정 삭제 경로가 필수 */}
            <Pressable
              accessibilityLabel="delete-account-btn"
              style={styles.deleteAccountBtn}
              onPress={onDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.deleteAccountText}>
                {deleting ? '삭제 중…' : '계정 삭제'}
              </Text>
            </Pressable>
          </>
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
  // 계정 삭제는 로그아웃보다 시각적 비중을 낮춰 오탭을 줄인다
  deleteAccountBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.sub,
    textDecorationLine: 'underline',
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
