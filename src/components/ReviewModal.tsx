import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';

const PRIMARY = '#1F4D3D';
const STAR = '#F2C94C';

type Props = {
  visible: boolean;
  cafeName: string;
  /** true면 제목을 "리뷰 수정"으로 */
  editing?: boolean;
  rating: number;
  text: string;
  busy?: boolean;
  onChangeRating: (n: number) => void;
  onChangeText: (t: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ReviewModal({
  visible,
  cafeName,
  editing,
  rating,
  text,
  busy,
  onChangeRating,
  onChangeText,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View accessibilityLabel="review-modal" style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {editing ? '리뷰 수정' : '리뷰 쓰기'}
          </Text>
          <Text style={styles.modalSub}>
            {cafeName}에서의 경험을 {editing ? '수정해' : '남겨'} 주세요
          </Text>

          <View accessibilityLabel="review-star-input" style={styles.starInputRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onChangeRating(n)} hitSlop={6}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={STAR}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            accessibilityLabel="review-text-input"
            style={styles.reviewInput}
            multiline
            placeholder="카페에서의 경험을 남겨주세요"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={onChangeText}
            textAlignVertical="top"
          />

          <View style={styles.modalBtns}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: colors.ink }]}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="review-submit-btn"
              style={[
                styles.modalBtn,
                { backgroundColor: rating >= 1 ? PRIMARY : colors.sage },
              ]}
              disabled={rating < 1 || !!busy}
              onPress={onSubmit}
            >
              <Text style={[styles.modalBtnText, { color: colors.white }]}>
                {busy ? (editing ? '수정 중…' : '등록 중…') : editing ? '수정' : '등록'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 26,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSub: {
    marginTop: 8,
    fontSize: 13,
    color: colors.sub,
  },
  starInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  reviewInput: {
    marginTop: 14,
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
