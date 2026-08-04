import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../config/theme';
import { haptics } from '../utils/haptics';
import type { AuthResult } from '../features/biometric/biometric';

/**
 * 앱 잠금 오버레이 - 잠금 상태일 때 WebView 위를 전부 덮는다.
 * 마운트되면 자동으로 인증을 한 번 시도하고, 실패/취소 시 버튼으로 재시도.
 */
export function AppLockScreen({ onUnlock }: { onUnlock: () => Promise<AuthResult> }) {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    onUnlock().catch(() => {});
  }, [onUnlock]);

  return (
    <View style={styles.overlay}>
      <Text style={styles.logo}>보험맵</Text>
      <Text style={styles.title}>앱이 잠겨 있습니다</Text>
      <Text style={styles.subtitle}>생체인증으로 잠금을 해제하세요.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          haptics.light();
          onUnlock().catch(() => {});
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>잠금 해제</Text>
      </TouchableOpacity>
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 20,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
    marginBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  button: {
    marginTop: 28,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
