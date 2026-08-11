/**
 * 웹 ⇄ 앱 브릿지 프로토콜 (BRIDGE_PROTOCOL.md의 코드 반영본).
 *
 * - 웹 → 앱: window.ReactNativeWebView.postMessage(JSON) → WebView onMessage
 * - 앱 → 웹: webViewRef.injectJavaScript → window.__boheom.onNativeEvent(JSON)
 *
 * 규칙: 모든 메시지는 JSON. 알 수 없는 type/버전은 조용히 무시(하위/상위 호환).
 * 현재 구현된 타입만 정의하고, Phase 1+ 타입은 구현 시점에 추가한다.
 */

export const PROTOCOL_VERSION = 1 as const;

export type HapticStyle = 'light' | 'medium' | 'success' | 'error' | 'selection';

/**
 * 앱이 지원함을 웹에 알리는 기능 목록. 구현된 것만 광고한다(정직하게).
 *
 * ⚠️ **광고 ≠ 사용자 도달 가능.** 이 목록은 "앱에 수신부가 있다"는 뜻일 뿐이고,
 * **웹이 해당 메시지를 실제로 보내야만** 사용자가 그 기능을 쓸 수 있다.
 * 2026-08-11 웹 grep 실측: `share`·`request-biometric`·`set-biometric-lock`·`open-qr-scanner`·
 * `set-badge`·`toast` **발신 0건**(웹 타입 선언만 존재) → 그 기능들은 **사용자 도달 불가**.
 * 유일한 발신은 `haptic`(웹 src/lib/native/haptics.ts).
 * → **스토어 설명·심사노트에 "앱 전용 기능"으로 적을 때는 반드시 웹 발신부를 먼저 확인할 것.**
 *   (없는 기능을 적으면 리뷰어가 찾다 못 찾아 4.2 방어가 통째로 무너진다.)
 */
export type Capability =
  | 'haptic'
  | 'push'
  | 'deeplink'
  | 'share'
  | 'biometric'
  | 'qr-scan'
  | 'qr-generate'
  | 'image-pick'
  | 'badge'
  | 'clipboard';

/** 웹 → 앱 (현재 구현분). */
export type WebToApp =
  | { v?: number; type: 'haptic'; style?: HapticStyle }
  | { v?: number; type: 'toast'; message: string }
  | { v?: number; type: 'share'; url?: string; title?: string; message?: string }
  | { v?: number; type: 'request-biometric'; reqId?: string; reason?: string }
  | { v?: number; type: 'set-biometric-lock'; enabled: boolean }
  | { v?: number; type: 'open-qr-scanner'; reqId?: string }
  | { v?: number; type: 'set-badge'; count: number }
  | { v?: number; type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

/** 앱 → 웹 (현재 구현분). */
export type AppToWeb =
  | { v: number; type: 'ready'; platform: 'ios' | 'android'; appVersion: string; capabilities: Capability[] }
  | { v: number; type: 'push-token'; token: string; platform: 'ios' | 'android' }
  | { v: number; type: 'deeplink'; path: string; source: 'notification' | 'link' | 'cold-start' }
  | { v: number; type: 'biometric-result'; reqId: string; ok: boolean; error?: string }
  | { v: number; type: 'qr-result'; reqId: string; value: string }
  | { v: number; type: 'qr-cancelled'; reqId: string }
  | { v: number; type: 'app-state'; state: 'active' | 'background' | 'inactive' }
  | { v: number; type: 'network'; online: boolean }
  | { v: number; type: 'back-pressed' };

/** 파싱된 웹 메시지의 최소 형태 - type만 보장, 나머지는 핸들러가 좁힌다. */
export interface ParsedWebMessage {
  type: string;
  [key: string]: unknown;
}

/** 웹 메시지 원문(JSON 문자열)을 안전하게 파싱. 실패/형식오류는 null. */
export function parseWebMessage(raw: string): ParsedWebMessage | null {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || typeof (data as { type?: unknown }).type !== 'string') {
      return null;
    }
    return data as ParsedWebMessage;
  } catch {
    return null;
  }
}
