/**
 * 로컬 재방문 알림 — 서버/웹 무관, 이미 설치된 expo-notifications만 사용.
 *
 * 목적: 설치 후 첫 주 이탈 방지. 서버 푸시(웹 발송 트리거)와 별개로, "앱을 켠 지 N일이
 *       지나도록 다시 안 열면" 로컬 알림 1건으로 재방문을 유도한다.
 *
 * 동작(호출부=App.tsx AppState 배선):
 *   - 앱이 백그라운드로 갈 때  → scheduleRevisitReminder()  (기존 예약 취소 후 N일 뒤로 재예약)
 *   - 앱이 포그라운드로 올 때  → cancelRevisitReminder()    (사용자가 열었으니 이번 예약 취소)
 *   즉 사용자가 N일 안에 한 번이라도 열면 알림은 절대 뜨지 않고, N일간 안 열어야만 뜬다.
 *
 * ⚠️ 문구(REMINDER_TITLE/BODY)는 **콘텐츠팀 검수 대기**. 데이터/기능을 약속하지 않는
 *    순수 재방문 유도 문구만 사용한다(CTO 권고: "없는 기능/업데이트를 약속하지 말 것").
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from '../../utils/logger';

/** 예약 알림을 식별/취소하기 위한 고정 ID. */
const REMINDER_ID = 'boheommap:revisit-reminder';

/** 마지막 접속 후 이 시간(초)이 지나도록 재접속이 없으면 알림. 기본 3일. */
export const REMINDER_DELAY_SECONDS = 3 * 24 * 60 * 60;

// TODO(콘텐츠팀 검수): 데이터/업데이트를 주장하지 않는 재방문 유도 문구로 확정할 것.
const REMINDER_TITLE = '보험맵';
const REMINDER_BODY = '대한민국 보험인의 지도, 보험맵을 다시 열어보세요.';

/**
 * N일 뒤 재방문 알림을 예약한다. 기존 예약이 있으면 먼저 취소(중복 방지).
 * 권한 미허용/미빌드 등으로 실패해도 앱은 죽지 않는다(조용히 무시).
 */
export async function scheduleRevisitReminder(): Promise<void> {
  try {
    // 권한이 없으면 예약해도 뜨지 않으므로 시도조차 하지 않는다(요청은 푸시 흐름이 담당).
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        // data.path 없음 → 탭하면 앱 홈으로 진입(특정 화면 약속 안 함).
        ...(Platform.OS === 'android' ? { channelId: 'default' } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_SECONDS,
        repeats: false,
      },
    });
  } catch (e) {
    logger.warn('재방문 알림 예약 실패', e);
  }
}

/** 예약된 재방문 알림을 취소한다(사용자가 앱을 열었을 때). */
export async function cancelRevisitReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch (e) {
    logger.warn('재방문 알림 취소 실패', e);
  }
}
