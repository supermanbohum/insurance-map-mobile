/**
 * 푸시 알림(expo-notifications) - 토큰 획득 / 포그라운드 표시 / Android 채널 / 뱃지.
 *
 * 앱은 DB/API를 직접 호출하지 않는다. 획득한 Expo Push Token은 브릿지 'push-token'으로
 * 웹에 전달하고, 웹 BridgeProvider가 register_push_token RPC로 저장한다.
 * (BACKEND_INTEGRATION_RULES / BRIDGE_PROTOCOL 준수)
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { EAS_PROJECT_ID } from '../../config/constants';
import { colors } from '../../config/theme';
import { logger } from '../../utils/logger';

const ANDROID_CHANNEL_ID = 'default';
let configured = false;

/** 포그라운드 알림 표시 방식 + Android 채널 설정. 한 번만 실행. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.primary,
      });
    } catch (e) {
      logger.warn('Android 알림 채널 설정 실패', e);
    }
  }
}

/**
 * 알림 권한을 요청하고 Expo Push Token을 획득한다.
 * 권한 거부/미빌드/자격증명 미설정 등으로 실패하면 null(앱은 죽지 않음).
 */
export async function registerForPushToken(): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return token.data || null;
  } catch (e) {
    logger.warn('Expo Push Token 획득 실패', e);
    return null;
  }
}

/** 알림 payload(data)에서 딥링크 경로를 추출한다. 예: { path: '/chat/abc' } */
export function getPathFromNotificationData(data: unknown): string | null {
  if (data && typeof data === 'object') {
    const path = (data as { path?: unknown }).path;
    if (typeof path === 'string' && path.length > 0) return path;
  }
  return null;
}

/** 앱 아이콘 뱃지 수 설정. */
export function setBadgeCount(count: number): void {
  Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => {});
}
