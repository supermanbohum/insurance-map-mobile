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

/** 앱이 지원함을 웹에 알리는 기능 목록. 구현된 것만 광고한다(정직하게). */
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
  | { v?: number; type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

/** 앱 → 웹 (현재 구현분). */
export type AppToWeb =
  | { v: number; type: 'ready'; platform: 'ios' | 'android'; appVersion: string; capabilities: Capability[] }
  | { v: number; type: 'deeplink'; path: string; source: 'notification' | 'link' | 'cold-start' }
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
