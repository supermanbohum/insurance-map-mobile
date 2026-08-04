/**
 * 웹 → 앱 메시지의 네이티브 처리(부수효과). 각 핸들러는 실패해도 앱을 죽이지 않는다.
 */
import { Platform, ToastAndroid } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { HapticStyle } from './protocol';

const HAPTIC_ACTIONS: Record<HapticStyle, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};

/** 웹 버튼 클릭 등에 반응하는 네이티브 햅틱. */
export function runHaptic(style?: string): void {
  const run = HAPTIC_ACTIONS[(style as HapticStyle) ?? 'light'] ?? HAPTIC_ACTIONS.light;
  run().catch(() => {});
}

/** Android 토스트(iOS는 무시 - 별도 UI는 추후 도입). */
export function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}
