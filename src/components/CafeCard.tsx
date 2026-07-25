import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cafe, updatedLabel } from '../lib/data';
import { colors, radius, seatStatus, statusColors, statusLabel } from '../lib/theme';
import { isCafeClosed } from '../utils/isCafeOpen';

export function StatusBadge({ cafe }: { cafe: Cafe }) {
  if (isCafeClosed(cafe)) {
    return (
      <View
        accessibilityLabel="closed-badge"
        style={[styles.badge, styles.closedBadgeInline]}
      >
        <Text style={styles.closedBadgeInlineText}>휴무</Text>
      </View>
    );
  }
  const s = seatStatus(cafe.seatsAvailable, cafe.seatsTotal);
  const c = statusColors(s);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{statusLabel(s)}</Text>
    </View>
  );
}

export function SeatProgress({ cafe, height = 8 }: { cafe: Cafe; height?: number }) {
  if (isCafeClosed(cafe)) {
    return (
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={{
            width: '100%',
            height,
            borderRadius: height / 2,
            backgroundColor: '#D0D0D0',
          }}
        />
      </View>
    );
  }
  const s = seatStatus(cafe.seatsAvailable, cafe.seatsTotal);
  const c = statusColors(s);
  const pct = Math.max(0.03, cafe.seatsAvailable / cafe.seatsTotal);
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: c.bar,
        }}
      />
    </View>
  );
}

export function CupThumb({ size = 76 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        backgroundColor: '#F0EEE3',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="cafe-outline" size={size * 0.42} color={colors.sub} />
    </View>
  );
}

type Props = {
  cafe: Cafe;
  now: number;
  bookmarked: boolean;
  /** visitCounts — N>=1일 때만 라벨 표시 */
  visitCount?: number;
  onPress: () => void;
  onToggleBookmark: () => void;
};

function VisitCountLabel({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <Text accessibilityLabel="visit-count-label" style={styles.visitCountLabel}>
      최근 {count}번 테이크인한 가게
    </Text>
  );
}

function ClosedOverlay() {
  return (
    <>
      <View
        accessibilityLabel="closed-overlay"
        pointerEvents="none"
        style={styles.closedOverlay}
      />
      <View accessibilityLabel="closed-badge" style={styles.closedBadge}>
        <Text style={styles.closedBadgeText}>CLOSED</Text>
      </View>
    </>
  );
}

/** 홈 바텀시트용 카페 카드 */
export function CafeCard({
  cafe,
  now,
  bookmarked,
  visitCount = 0,
  onPress,
  onToggleBookmark,
}: Props) {
  const closed = isCafeClosed(cafe);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardBody, closed && styles.cardDimmed]}>
        <View style={{ flex: 1 }}>
          <VisitCountLabel count={visitCount} />
          <View style={styles.titleRow}>
            <Text style={styles.name}>{cafe.name}</Text>
            {!closed && <StatusBadge cafe={cafe} />}
          </View>
          {!closed && (
            <>
              <View style={styles.seatRow}>
                <Text style={styles.seatBig}>{cafe.seatsAvailable}</Text>
                <Text style={styles.seatSmall}> / {cafe.seatsTotal}석 남음</Text>
              </View>
              <SeatProgress cafe={cafe} />
            </>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.sub} />
            <Text style={styles.meta}>도보 {cafe.walkMin}분</Text>
            <Ionicons
              name="sync-outline"
              size={14}
              color={colors.sub}
              style={{ marginLeft: 10 }}
            />
            <Text style={styles.meta}>{updatedLabel(cafe.lastUpdated, now)}</Text>
          </View>
        </View>
        <View style={styles.thumbWrap}>
          <CupThumb />
          <Pressable
            hitSlop={8}
            onPress={onToggleBookmark}
            style={styles.bookmarkBtn}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={bookmarked ? colors.ink : colors.muted}
            />
          </Pressable>
        </View>
      </View>
      {closed && <ClosedOverlay />}
    </Pressable>
  );
}

/** 마이페이지 저장한 카페 카드 */
export function SavedCafeCard({
  cafe,
  now,
  visitCount = 0,
  onPress,
  onToggleBookmark,
}: Omit<Props, 'bookmarked'>) {
  const closed = isCafeClosed(cafe);
  return (
    <Pressable style={styles.savedCard} onPress={onPress}>
      <View style={closed && styles.cardDimmed}>
        <View style={styles.savedTop}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.md,
              backgroundColor: colors.goodBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="cafe-outline" size={24} color={colors.green} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <VisitCountLabel count={visitCount} />
            <Text style={styles.name}>{cafe.name}</Text>
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Ionicons name="location-outline" size={14} color={colors.sub} />
              <Text style={styles.meta}>도보 {cafe.walkMin}분</Text>
              <Text style={[styles.meta, { marginHorizontal: 4 }]}>·</Text>
              <Ionicons name="sync-outline" size={14} color={colors.sub} />
              <Text style={styles.meta}>{updatedLabel(cafe.lastUpdated, now)}</Text>
            </View>
          </View>
          <Pressable hitSlop={8} onPress={onToggleBookmark}>
            <Ionicons name="bookmark" size={22} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.savedBottom}>
          {!closed && (
            <>
              <Text style={styles.savedSeats}>
                <Text style={{ fontWeight: '800' }}>{cafe.seatsAvailable}</Text> /{' '}
                {cafe.seatsTotal}석 남음
              </Text>
              <StatusBadge cafe={cafe} />
            </>
          )}
        </View>
        {!closed && <SeatProgress cafe={cafe} />}
      </View>
      {closed && <ClosedOverlay />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  cardDimmed: {
    opacity: 0.55,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  closedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#333333',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  closedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closedBadgeInline: {
    backgroundColor: '#333333',
  },
  closedBadgeInlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitCountLabel: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 8,
  },
  seatBig: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
  },
  seatSmall: {
    fontSize: 14,
    color: colors.text,
  },
  track: {
    backgroundColor: colors.track,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.sub,
  },
  thumbWrap: {
    position: 'relative',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 2,
  },
  savedCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  savedSeats: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '600',
  },
});
