/**
 * 웹 → 앱 메시지의 네이티브 처리(부수효과). 각 핸들러는 실패해도 앱을 죽이지 않는다.
 */
import * as Haptics from 'expo-haptics';
import type { HapticStyle } from './protocol';
import { toast } from '../utils/toast';

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

/** 인앱 토스트(iOS/Android 통일). 실제 렌더링은 ToastHost가 담당. */
export function showToast(message: string): void {
  toast.show(message);
}
