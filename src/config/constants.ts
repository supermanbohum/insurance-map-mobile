/**
 * 앱 전역 상수 - 흩어져 있던 App.tsx의 하드코딩 값을 한곳으로 모은다.
 * 웹/DB/API는 절대 건드리지 않으며, 여기 값들은 "웹을 어떻게 감쌀지"만 정의한다.
 */

/** 실제 배포된 보험맵 웹. WebView가 통째로 로드한다. */
export const APP_URL = 'https://bohummap.com';
export const APP_HOST = 'bohummap.com';

/**
 * 구글 로그인은 WebView(임베디드 브라우저) 안에서 차단되므로, Supabase authorize를
 * 감지하는 즉시 Custom Tab(WebView 밖)에서 진행하고 이 커스텀 스킴으로 앱에 복귀한다.
 * app.json의 "scheme": "boheommap" 과 일치해야 한다.
 */
export const OAUTH_RETURN_URL = 'boheommap://auth-callback';

/** 앱 도메인으로 취급할 호스트 접미사(Supabase 등은 WebView 내부에서 처리). */
export const OAUTH_HOST_SUFFIXES = ['.supabase.co'];

/** WebView가 아니라 외부 앱(전화/문자/카톡 등)으로 넘겨야 하는 스킴들. */
export const EXTERNAL_SCHEMES = ['tel:', 'sms:', 'mailto:', 'kakaotalk:', 'kakaolink:', 'intent:'];

/**
 * 앱 버전 - AppToWeb 'ready' 핸드셰이크에서 웹에 알려준다.
 * app.json의 expo.version 과 수동으로 맞춘다(빌드시 자동 주입은 추후 expo-constants 도입 시).
 */
export const APP_VERSION = '1.0.0';

/** EAS 프로젝트 ID - Expo Push Token 발급에 필요(app.json extra.eas.projectId와 동일). */
export const EAS_PROJECT_ID = 'c1ea2bd3-f94f-4b3d-94ce-88de77907ee4';

/** AsyncStorage 키 네임스페이스. */
export const StorageKeys = {
  onboardingSeen: 'boheommap:onboarding_seen_v1',
  appLockEnabled: 'boheommap:app_lock_enabled_v1',
} as const;

/** 스플래시 최소/최대 노출 시간(ms) - 프리미엄 인트로 시퀀스가 재생될 시간 확보 + 먹통 방지. */
export const MIN_SPLASH_MS = 2400;
export const MAX_SPLASH_MS = 4500;
