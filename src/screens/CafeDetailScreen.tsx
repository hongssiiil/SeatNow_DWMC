import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import {
  ChevronLeft,
  Phone,
  MapPin,
  Bookmark,
  Share2,
  AlertCircle,
  DoorOpen,
  RefreshCw,
} from 'lucide-react-native';

import { SeatBottomSheet } from '@/components/SeatBottomSheet';
import { LoginPromptSheet } from '@/components/LoginPromptSheet';
import {
  SEATS,
  SEAT_FILTERS,
  SEAT_STYLE,
  matchSeatFilter,
  seatAttrLine,
  type Seat,
} from '@/data/seats';

// Solid-color approximations of the web's CSS gradients (no linear-gradient dep).
const PHOTO_BG = ['#9A7C60', '#8AA878', '#B09070'];

interface Props {
  cafeId: string | null;
  onBack: () => void;
  isErrorState: boolean;
  isLoggedIn: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
  onLoginRequest: () => void;
}

export function CafeDetailScreen({
  onBack,
  isErrorState,
  isLoggedIn,
  isSaved,
  onToggleSave,
  onLoginRequest,
}: Props) {
  const [filter, setFilter] = useState('전체');
  const [seat, setSeat] = useState<Seat | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const handleSave = () => {
    if (!isLoggedIn) {
      setShowPrompt(true);
      return;
    }
    onToggleSave();
    showToast(isSaved ? '저장을 취소했어요' : '저장한 카페에 추가했어요');
  };

  return (
    <View className="h-full w-full flex-col bg-white">
      {/* top nav */}
      <View className="z-10 h-[52px] flex-row items-center justify-between border-b border-[#F2F2F2] bg-white px-4">
        <Pressable onPress={onBack} className="-ml-2 rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
          <ChevronLeft size={20} strokeWidth={2.5} color="#111" />
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Pressable className="rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
            <Share2 size={18} strokeWidth={1.8} color="#555" />
          </Pressable>
          <Pressable onPress={handleSave} className="rounded-full p-2 active:bg-[#F6F7F2]" hitSlop={6}>
            <Bookmark
              size={18}
              strokeWidth={1.8}
              fill={isSaved ? '#111' : 'none'}
              color={isSaved ? '#111' : '#555'}
            />
          </Pressable>
        </View>
      </View>

      {/* scrollable body */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. photos */}
        <View className="px-4 pb-5 pt-4">
          <View className="flex-row gap-2" style={{ height: 210 }}>
            <View
              className="overflow-hidden rounded-[18px]"
              style={{ flex: 1.6, backgroundColor: PHOTO_BG[0] }}
            >
              <View className="absolute inset-0 justify-end p-3">
                <View className="mb-1 flex-row gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <View key={i} className="h-[28px] w-[22px] rounded-[5px] bg-white/20" />
                  ))}
                </View>
                <View className="h-1 w-16 rounded-full bg-white/20" />
              </View>
            </View>
            <View className="flex-1 flex-col gap-2">
              <View className="flex-1 overflow-hidden rounded-[18px]" style={{ backgroundColor: PHOTO_BG[1] }}>
                <View className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/20" />
              </View>
              <View
                className="flex-1 items-center justify-center overflow-hidden rounded-[18px]"
                style={{ backgroundColor: PHOTO_BG[2] }}
              >
                <View className="h-6 w-10 rounded-[5px] bg-white/20" />
              </View>
            </View>
          </View>
        </View>

        {/* 2. cafe info */}
        <View className="px-5 pb-5">
          <Text className="mb-1 text-[22px] font-bold leading-snug text-[#111]">
            {isErrorState ? '커피빈 서울대입구역점' : '카페 온더웨이'}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[13px] font-medium text-[#999]">서울대입구역 도보 5분</Text>
            <Text className="mx-1.5 text-[#E0E0E0]">·</Text>
            <Text className="text-[13px] font-semibold text-[#2DB400]">영업 중</Text>
            <Text className="mx-1.5 text-[#E0E0E0]">·</Text>
            <Text className="text-[13px] font-medium text-[#999]">08:00 – 22:00</Text>
          </View>
        </View>

        <View className="mx-5 mb-5 h-px bg-[#F4F4F4]" />

        {/* 3. seat summary */}
        <View className="mb-6 px-5">
          {isErrorState ? (
            <View className="flex-row items-start gap-3 rounded-[20px] bg-[#F7F7F7] p-4">
              <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#EEEEEE]">
                <AlertCircle size={16} strokeWidth={1.8} color="#BBBBBB" />
              </View>
              <View className="flex-1">
                <View className="mb-1.5 flex-row">
                  <View className="rounded-[6px] bg-[#E4E4E4] px-2 py-0.5">
                    <Text className="text-[11px] font-semibold text-[#999]">확인 불가</Text>
                  </View>
                </View>
                <Text className="text-[14px] font-semibold text-[#444]">좌석 정보를 불러올 수 없습니다</Text>
                <Text className="mt-1 text-[12px] text-[#BBBBBB]">카메라 연결 상태를 확인 중입니다.</Text>
              </View>
            </View>
          ) : (
            <View className="rounded-[22px] bg-[#F8FAF3] p-5">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="rounded-[8px] bg-[#CDFF4E] px-2.5 py-1">
                  <Text className="text-[12px] font-bold text-[#111]">현재 여유</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <RefreshCw size={12} color="#CCCCCC" />
                  <Text className="text-[11px] text-[#CCCCCC]">30초 전 업데이트</Text>
                </View>
              </View>
              <View className="mb-1 flex-row items-baseline gap-1.5">
                <Text className="text-[28px] font-extrabold leading-none text-[#111]">빈 테이블 4개</Text>
                <Text className="text-[13px] text-[#CCCCCC]">/ 10개</Text>
              </View>
              <Text className="mt-1.5 text-[12px] text-[#BBBBBB]">전체 10개 중 6개 사용 중</Text>
            </View>
          )}
        </View>

        {/* 4. filter */}
        <View className="mb-5 px-5">
          <Text className="mb-3 text-[14px] font-bold text-[#111]">원하는 좌석 찾기</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SEAT_FILTERS.map((f) => {
              const on = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className="h-[36px] justify-center rounded-full border px-4"
                  style={{
                    backgroundColor: on ? '#CDFF4E' : '#FFFFFF',
                    borderColor: on ? '#CDFF4E' : '#E8E8E8',
                  }}
                >
                  <Text className="text-[12px] font-semibold" style={{ color: on ? '#111' : '#666' }}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. floor map */}
        <View className="mb-4 px-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[14px] font-bold text-[#111]">좌석 현황</Text>
            <View className="flex-row items-center gap-3">
              {[
                { bg: '#EEFFC4', label: '여유' },
                { bg: '#F1F1F1', label: '사용중' },
                { bg: '#FFF5D6', label: '확인중' },
              ].map((l) => (
                <View key={l.label} className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: l.bg }} />
                  <Text className="text-[10px] font-medium text-[#C0C0C0]">{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="w-full overflow-hidden rounded-[22px] bg-[#F7F8F4]" style={{ aspectRatio: 1 / 1.08 }}>
            <View className="absolute inset-0 p-3">
              {/* zone labels */}
              <ZoneLabel left="3%" top="3%">창가석</ZoneLabel>
              <ZoneLabel left="26%" top="3%">중앙석</ZoneLabel>
              <ZoneLabel left="70%" top="3%">카운터석</ZoneLabel>
              <ZoneLabel left="3%" top="64%">소파석</ZoneLabel>

              {/* structural lines */}
              <View className="absolute bg-[#D8DDD2]" style={{ left: 0, top: '7%', width: 3, height: '50%' }} />
              <View className="absolute bg-[#ECEEE7]" style={{ left: '22%', top: '7%', width: 1, height: '52%' }} />
              <View className="absolute bg-[#ECEEE7]" style={{ left: '68%', top: '7%', width: 1, height: '40%' }} />
              <View className="absolute bg-[#D8DDD2]" style={{ right: 0, top: '7%', width: 3, height: '40%' }} />
              <View className="absolute bg-[#ECEEE7]" style={{ left: '3%', top: '62%', right: '3%', height: 1 }} />

              {/* entrance */}
              <View className="absolute items-center gap-0.5" style={{ right: '3%', bottom: '3%' }}>
                <DoorOpen size={12} strokeWidth={1.5} color="#D0D4CC" />
                <Text className="text-[8px] text-[#D0D4CC]">입구</Text>
              </View>

              {/* seats */}
              {SEATS.map((s) => {
                const style = SEAT_STYLE[s.status];
                const dimmed = !matchSeatFilter(s, filter);
                const err = isErrorState;
                return (
                  <Pressable
                    key={s.id}
                    disabled={err}
                    onPress={() => !err && setSeat(s)}
                    className="absolute justify-center px-1.5 active:opacity-70"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: `${s.w}%`,
                      height: `${s.h}%`,
                      backgroundColor: err ? '#F1F1F1' : style.bg,
                      borderRadius: 12,
                      opacity: dimmed || err ? 0.2 : 1,
                    }}
                  >
                    <Text className="mb-[3px] text-[11px] font-bold leading-none" style={{ color: err ? '#C0C0C0' : style.text }}>
                      {s.label}
                    </Text>
                    <Text className="text-[8.5px] font-medium leading-none" style={{ color: err ? '#D0D0D0' : style.sub }}>
                      {seatAttrLine(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text className="mt-2.5 text-center text-[11px] text-[#D0D0D0]">
            좌석 배치는 이해를 돕기 위한 단순화된 평면도입니다
          </Text>
        </View>
      </ScrollView>

      {/* fixed bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-[#F2F2F2] bg-white px-5 py-4">
        <Pressable className="h-[54px] w-[104px] flex-row items-center justify-center gap-1.5 rounded-[18px] border border-[#E8E8E8] bg-white active:opacity-80">
          <Phone size={16} strokeWidth={1.8} color="#444" />
          <Text className="text-[14px] font-semibold text-[#444]">전화하기</Text>
        </Pressable>
        <Pressable className="h-[54px] flex-1 flex-row items-center justify-center gap-1.5 rounded-[18px] bg-[#CDFF4E] active:opacity-80">
          <MapPin size={16} strokeWidth={2} color="#111" />
          <Text className="text-[15px] font-bold text-[#111]">길찾기</Text>
        </Pressable>
      </View>

      {/* seat + login sheets */}
      <SeatBottomSheet seat={seat} onClose={() => setSeat(null)} />
      <LoginPromptSheet
        visible={showPrompt}
        onLogin={onLoginRequest}
        onClose={() => setShowPrompt(false)}
      />

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <MotiView
            key="toast"
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 8 }}
            className="absolute bottom-28 self-center rounded-[14px] bg-[#111] px-5 py-3"
          >
            <Text className="text-[13px] font-semibold text-white">{toast}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

function ZoneLabel({
  left,
  top,
  children,
}: {
  left: string;
  top: string;
  children: React.ReactNode;
}) {
  return (
    <Text
      className="absolute text-[9px] font-medium text-[#CCCCCC]"
      style={{ left: left as `${number}%`, top: top as `${number}%` }}
    >
      {children}
    </Text>
  );
}
