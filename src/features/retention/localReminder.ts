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
 * 문구(REMINDER_TITLE/BODY)는 콘텐츠팀 검수 완료(2026-08-08). 발송 시점을 앱이 모르는
 * 로컬 알림이므로 "시점 무관 참"인 문장만 사용한다(데이터/업데이트 약속 금지).
 *
 * 심야 발송 금지: 서버 푸시의 21~08시 발송 금지 원칙을 로컬 알림에도 동일 적용한다.
 * 발송 예정 시각이 야간 창에 떨어지면 다음 오전(09:30)으로 클램프한다.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from '../../utils/logger';

/**
 * 로컬 재방문 알림 활성화 플래그. **현재 OFF(A-015, 2026-08-08 CTO 결정).**
 *
 * 끈 이유: "3일 뒤 알림 → 들어왔는데 바뀐 게 없음 → 사용자가 알림 자체를 끔"이면,
 * 로컬 리마인더 하나의 다운사이드가 **FCM 개인화 알림(조회·문의 = 앱 전략의 척추)까지
 * 함께 죽이는 비대칭 구조**가 된다. 알림 권한은 한 번 끊기면 재획득이 어렵다.
 * 콘텐츠 발행 리듬이 아직 실적 0(8/10 첫 가동)이라 "돌아올 새 콘텐츠" 전제가 미성립.
 *
 * 재개 조건(둘 중 하나 충족 시 이 플래그를 true로):
 *   ① 발행 리듬 실적 2주 연속(주 3회 이상 실제 발행) 확인 → 단 주기를 3일이 아니라 **7일**로
 *      (REMINDER_DELAY_SECONDS 조정). 주 3~4편이면 7일에 새 글 3편↑ 보장 = "돌아올 게 있다"가 참.
 *   ② FCM 개인화 알림이 실제 가동되면 → 재개 자체를 재검토(개인화가 상위 호환이라 불필요할 수 있음).
 *
 * 구현·문구·심야 클램프는 그대로 보존된다 — 조건 충족 시 플래그만 켜면 됨.
 */
export const REVISIT_REMINDER_ENABLED = false;

/** 예약 알림을 식별/취소하기 위한 고정 ID. */
const REMINDER_ID = 'boheommap:revisit-reminder';

/** 마지막 접속 후 이 시간(초)이 지나도록 재접속이 없으면 알림. 기본 3일. */
export const REMINDER_DELAY_SECONDS = 3 * 24 * 60 * 60;

/** 야간 발송 금지 창(사용자 로컬 시간): [21시, 08시). 이 안에 떨어지면 오전으로 옮긴다. */
const QUIET_START_HOUR = 21;
const QUIET_END_HOUR = 8;
const MORNING_HOUR = 9;
const MORNING_MINUTE = 30;

// 콘텐츠팀 검수 완료: "우리 지역"은 데이터 주장 없이 '내 것' 요소만 확보, 시점 무관 참.
const REMINDER_TITLE = '보험맵';
const REMINDER_BODY = '우리 지역 GA 지점, 지도에서 다시 확인해 보세요.';

/**
 * 발송 예정 시각을 계산하되, 야간 창(21~08시)에 떨어지면 그 직후 오전 09:30으로 클램프한다.
 * (로컬 디바이스 시간대 기준 = 사용자가 체감하는 밤/아침.)
 */
export function computeReminderFireDate(from: Date): Date {
  const fire = new Date(from.getTime() + REMINDER_DELAY_SECONDS * 1000);
  const hour = fire.getHours();
  if (hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR) {
    // 21~24시면 다음 날 오전, 00~08시면 같은 날 오전으로.
    if (hour >= QUIET_START_HOUR) fire.setDate(fire.getDate() + 1);
    fire.setHours(MORNING_HOUR, MORNING_MINUTE, 0, 0);
  }
  return fire;
}

/**
 * N일 뒤 재방문 알림을 예약한다. 기존 예약이 있으면 먼저 취소(중복 방지).
 * 권한 미허용/미빌드 등으로 실패해도 앱은 죽지 않는다(조용히 무시).
 */
export async function scheduleRevisitReminder(): Promise<void> {
  try {
    // A-015: 비활성 상태. 예약하지 않고, 혹시 남아있는 예약이 있으면 방어적으로 취소한다.
    if (!REVISIT_REMINDER_ENABLED) {
      await cancelRevisitReminder();
      return;
    }
    // 권한이 없으면 예약해도 뜨지 않으므로 시도조차 하지 않는다(요청은 푸시 흐름이 담당).
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

    // 정확한 발송 시각을 계산 후 야간 클램프 → DATE 트리거로 예약(TIME_INTERVAL은 정각
    // +72h라 밤에 닫으면 밤에 울린다). 심야 발송 금지 원칙을 로컬 알림에도 적용.
    const fireDate = computeReminderFireDate(new Date());

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        // data.path 없음 → 탭하면 앱 홈으로 진입(특정 화면 약속 안 함).
        ...(Platform.OS === 'android' ? { channelId: 'default' } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
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
