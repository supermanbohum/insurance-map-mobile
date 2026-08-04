import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { haptics } from '../utils/haptics';

/**
 * 범용 에러/재시도 오버레이 - WebView 로드 실패 등에 사용.
 * 전체 화면을 덮고, 사용자 친화적 안내 + "다시 시도" 버튼을 제공한다.
 */
export function ErrorScreen({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <TouchableOpacity
          style={styles.retry}
          onPress={() => {
            haptics.light();
            onRetry();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    zIndex: 7,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  retry: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  retryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
