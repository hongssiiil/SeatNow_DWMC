import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MockMap, SpeechBubble } from '../components/MockMap';
import { useApp } from '../lib/store';
import { colors, radius } from '../lib/theme';
import { Cafe } from '../lib/data';
import { signInWithApple, signInWithKakao } from '../lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest, cafes } = useApp();
  const [loading, setLoading] = useState<'kakao' | 'apple' | null>(null);

  const heroCafe: Cafe =
    cafes.find((c) => c.seatsAvailable > 0 && c.seatsAvailable < c.seatsTotal) ?? cafes[0];

  const enterGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)/home');
  };

  const enterSocial = async (provider: 'kakao' | 'apple') => {
    if (loading) return;
    setLoading(provider);
    try {
      const result =
        provider === 'kakao' ? await signInWithKakao() : await signInWithApple();
      // 네이티브 SDK가 없는 환경(Expo Go)에서는 목업 프로필로 로그인
      login(provider, result ?? undefined);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        Alert.alert('로그인 실패', e?.message ?? '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.headline}>가기 전에,{'\n'}테이크인 하세요</Text>
        <Text style={styles.subline}>
          실시간 빈자리 정보를{'\n'}헛걸음 없이 확인하세요.
        </Text>

        {/* 히어로 지도 카드 */}
        <View style={styles.heroCard}>
          <MockMap cafes={[]} showLabels>
            <SpeechBubble
              text="자리 있음"
              color={colors.goodText}
              style={{ left: '24%', top: '14%' }}
            />
            <SpeechBubble
              text="만석"
              color={colors.badText}
              style={{ left: '68%', top: '12%' }}
            />
          </MockMap>
          {/* 카페 미리보기 카드 */}
          <View style={styles.previewCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewName}>{heroCafe.name}</Text>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>자리 있음</Text>
                </View>
              </View>
              <View style={styles.previewMetaRow}>
                <Ionicons name="location-outline" size={14} color={colors.sub} />
                <Text style={styles.previewMeta}>도보 {heroCafe.walkMin}분</Text>
                <Ionicons
                  name="sync-outline"
                  size={14}
                  color={colors.sub}
                  style={{ marginLeft: 10 }}
                />
                <Text style={styles.previewMeta}>방금 전 업데이트</Text>
              </View>
            </View>
            <View style={styles.previewThumb}>
              <Ionicons name="cafe-outline" size={30} color={colors.sub} />
            </View>
          </View>
        </View>

        {/* 로그인 버튼들 */}
        <Pressable
          style={[styles.socialBtn, { backgroundColor: colors.kakao }]}
          onPress={() => enterSocial('kakao')}
        >
          {loading === 'kakao' ? (
            <ActivityIndicator color="#191600" />
          ) : (
            <>
              <Ionicons name="chatbubble-sharp" size={19} color="#191600" />
              <Text style={[styles.socialText, { color: '#191600' }]}>
                카카오로 계속하기
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.socialBtn, { backgroundColor: colors.apple }]}
          onPress={() => enterSocial('apple')}
        >
          {loading === 'apple' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={22} color={colors.white} />
              <Text style={[styles.socialText, { color: colors.white }]}>
                Apple로 계속하기
              </Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={enterGuest} hitSlop={8}>
          <Text style={styles.guestLink}>비회원으로 둘러보기 ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headline: {
    marginTop: 24,
    fontSize: 30,
    lineHeight: 42,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  subline: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: colors.sub,
    textAlign: 'center',
  },
  heroCard: {
    marginTop: 20,
    flex: 1,
    minHeight: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  previewBadge: {
    backgroundColor: colors.goodBg,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goodText,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  previewMeta: {
    fontSize: 12,
    color: colors.sub,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: '#F0EEE3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  socialBtn: {
    marginTop: 12,
    height: 54,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '700',
  },
  guestLink: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
  },
});
