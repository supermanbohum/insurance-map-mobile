import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

function OfflineBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.banner, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.bannerText}>인터넷 연결이 끊어졌습니다</Text>
    </View>
  );
}

/** 오프라인일 때 WebView 대신 보여주는 전체 화면 + 다시 시도. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <OfflineBanner />
      <View style={styles.center}>
        <Text style={styles.title}>오프라인 상태입니다</Text>
        <Text style={styles.subtitle}>Wi-Fi 또는 모바일 데이터 연결을 확인해주세요.</Text>
        <Text style={styles.retryButton} onPress={onRetry}>
          다시 시도
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  banner: {
    backgroundColor: colors.danger,
    paddingBottom: 8,
    alignItems: 'center',
  },
  bannerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 20,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
