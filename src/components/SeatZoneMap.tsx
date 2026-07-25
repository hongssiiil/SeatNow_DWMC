import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RESERVED_SEAT_COLOR,
  Seat,
  SeatStatus,
  groupSeatsByZone,
  seatFeatureLabel,
} from '../lib/seats';
import { colors, radius } from '../lib/theme';

const STATUS_UI: Record<
  SeatStatus,
  { label: string; dot: string; bg: string; muted?: boolean }
> = {
  available: {
    label: '여유',
    dot: '#6FCF97',
    bg: 'rgba(111,207,151,0.15)',
  },
  reserved: {
    label: '테이크인중',
    dot: RESERVED_SEAT_COLOR,
    bg: 'rgba(91,141,239,0.16)',
  },
  needs_check: {
    label: '확인중',
    dot: '#F2C94C',
    bg: 'rgba(242,201,76,0.18)',
  },
  occupied: {
    label: '사용중',
    dot: '#EB5757',
    bg: 'rgba(0,0,0,0.06)',
    muted: true,
  },
  unavailable: {
    label: '사용중',
    dot: '#EB5757',
    bg: 'rgba(0,0,0,0.06)',
    muted: true,
  },
};

type Props = {
  seats: Seat[];
  selectedSeat: number | null;
  disabled?: boolean;
  onSelect: (seatNo: number) => void;
};

export function SeatZoneMap({ seats, selectedSeat, disabled, onSelect }: Props) {
  const groups = groupSeatsByZone(Array.isArray(seats) ? seats : []);

  return (
    <View style={styles.wrap}>
      {/* status-legend */}
      <View accessibilityLabel="status-legend" style={styles.legend}>
        {(
          [
            ['available', '여유'],
            ['reserved', '테이크인중'],
            ['needs_check', '확인중'],
            ['occupied', '사용중'],
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: STATUS_UI[key].dot }]}
            />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {groups.map(({ zone, seats: zoneSeats }) => (
        <View
          key={zone}
          accessibilityLabel="zone-group"
          style={styles.zoneGroup}
        >
          <Text accessibilityLabel="zone-title" style={styles.zoneTitle}>
            {zone}
          </Text>
          <View style={styles.tableGrid}>
            {zoneSeats.map((seat) => (
              <TableCard
                key={seat.seatNo}
                seat={seat}
                selected={selectedSeat === seat.seatNo}
                disabled={disabled}
                onPress={() => onSelect(seat.seatNo)}
              />
            ))}
          </View>
          {/* seat-capacity / seat-amenities: TableCard 내부 seatFeatureLabel */}
        </View>
      ))}
    </View>
  );
}

function TableCard({
  seat,
  selected,
  disabled,
  onPress,
}: {
  seat: Seat;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const ui = STATUS_UI[seat.status] ?? STATUS_UI.unavailable;
  const selectable = seat.status === 'available' && !disabled;

  return (
    <Pressable
      accessibilityLabel="table-card"
      disabled={!selectable}
      onPress={onPress}
      style={[
        styles.tableCard,
        { backgroundColor: ui.bg },
        selected && styles.tableCardSelected,
        ui.muted && styles.tableCardMuted,
        seat.status === 'reserved' && styles.tableCardReserved,
      ]}
    >
      <View style={styles.tableTop}>
        <Text style={[styles.tableLabel, ui.muted && styles.mutedText]}>
          {seat.label}
        </Text>
        <View
          accessibilityLabel="status-dot"
          style={[styles.statusDot, { backgroundColor: ui.dot }]}
        />
      </View>
      {/* Privacy: reserved 좌석은 "테이크인중"만 표시. reservedBy/닉네임 노출 금지 */}
      <Text
        accessibilityLabel={
          seat.status === 'reserved' ? 'seat-capacity' : 'seat-amenities'
        }
        style={[styles.tableFeature, ui.muted && styles.mutedText]}
      >
        {seat.status === 'reserved' ? '테이크인중' : seatFeatureLabel(seat)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.sub,
    fontWeight: '600',
  },
  zoneGroup: {
    marginBottom: 20,
  },
  zoneTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sub,
    marginBottom: 10,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tableCard: {
    width: '47.5%',
    flexGrow: 1,
    maxWidth: '48.5%',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 72,
  },
  tableCardSelected: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  tableCardReserved: {
    borderColor: 'rgba(91,141,239,0.35)',
  },
  tableCardMuted: {
    opacity: 0.85,
  },
  tableTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tableLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tableFeature: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  mutedText: {
    color: '#999999',
  },
});
