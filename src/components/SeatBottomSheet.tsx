import { Modal, View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';

import { type Seat } from '@/data/seats';

const STATUS_LABEL: Record<Seat['status'], { label: string; bg: string }> = {
  available: { label: '비어 있음', bg: '#CDFF4E' },
  checking: { label: '확인 중', bg: '#FFD84D' },
  occupied: { label: '사용 중', bg: '#D9D9D9' },
};

// Bottom modal showing details of a tapped seat on the floor map.
export function SeatBottomSheet({ seat, onClose }: { seat: Seat | null; onClose: () => void }) {
  const status = seat ? STATUS_LABEL[seat.status] : null;

  return (
    <Modal transparent visible={!!seat} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      {seat && status && (
        <MotiView
          from={{ translateY: 400 }}
          animate={{ translateY: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white px-6 pb-8 pt-2"
          style={{ boxShadow: '0px -4px 24px rgba(0,0,0,0.10)' }}
        >
          <View className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-[#E8E8E8]" />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[22px] font-bold text-[#111]">{seat.label} 좌석</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-[26px] leading-none text-[#666]">×</Text>
            </Pressable>
          </View>

          <View className="mb-6 flex-row">
            <View className="rounded-[8px] px-3 py-1.5" style={{ backgroundColor: status.bg }}>
              <Text className="text-[15px] font-bold text-[#111]">{status.label}</Text>
            </View>
          </View>

          <Text className="mb-3 text-[14px] font-bold text-[#666]">좌석 정보</Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            <Chip>{seat.capacity}인석</Chip>
            {seat.hasOutlet && <Chip>콘센트 있음</Chip>}
            {seat.isSofa && <Chip>소파석</Chip>}
            {seat.tableHeight === 'high' && <Chip>높은 테이블</Chip>}
            {seat.tableHeight === 'low' && <Chip>낮은 테이블</Chip>}
          </View>

          <Text className="mb-1 text-[14px] font-bold text-[#666]">마지막 업데이트</Text>
          <Text className="text-[14px] font-medium text-[#111]">30초 전 업데이트</Text>
        </MotiView>
      )}
    </Modal>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[8px] bg-[#F6F7F2] px-3 py-1.5">
      <Text className="text-[14px] font-medium text-[#111]">{children}</Text>
    </View>
  );
}
