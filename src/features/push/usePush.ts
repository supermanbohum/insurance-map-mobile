/**
 * 푸시 배선 훅 - 토큰을 획득하고, 알림 탭(콜드/웜)을 딥링크 경로로 연결한다.
 *
 * - 반환하는 token(있으면)을 호출부가 브릿지 'push-token'으로 웹에 전달한다.
 * - 알림 탭 시 onNotificationPath(path)를 호출한다(딥링크 재사용).
 */
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  configureNotifications,
  getPathFromNotificationData,
  registerForPushToken,
} from './push';

export function usePush({
  onNotificationPath,
}: {
  onNotificationPath: (path: string) => void;
}): string | null {
  const [token, setToken] = useState<string | null>(null);

  // 설정 + 토큰 획득(1회).
  useEffect(() => {
    let alive = true;
    configureNotifications().finally(() => {
      registerForPushToken().then((t) => {
        if (alive && t) setToken(t);
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  // 알림 탭 처리: 콜드 스타트(마지막 응답) + 실행 중 수신.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const path = response
          ? getPathFromNotificationData(response.notification.request.content.data)
          : null;
        if (path) onNotificationPath(path);
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = getPathFromNotificationData(response.notification.request.content.data);
      if (path) onNotificationPath(path);
    });
    return () => sub.remove();
  }, [onNotificationPath]);

  return token;
}
