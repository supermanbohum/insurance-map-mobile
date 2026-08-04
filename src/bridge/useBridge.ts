/**
 * 브릿지 배선 훅 - WebView와 연결해 양방향 통신을 담당한다.
 *
 *   const { handleWebMessage, emitToWeb, sendReady } = useBridge(webViewRef);
 *   <WebView onMessage={handleWebMessage}
 *            injectedJavaScriptBeforeContentLoaded={bridgeSetupScript} ... />
 *
 * - handleWebMessage: 웹 → 앱 메시지를 파싱해 네이티브 핸들러로 라우팅(모르는 type은 무시).
 * - emitToWeb: 앱 → 웹으로 이벤트 주입.
 * - sendReady: ready/capabilities 핸드셰이크 전송(웹이 앱 모드로 전환하게 함).
 */
import { useCallback, type RefObject } from 'react';
import { Platform } from 'react-native';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { APP_VERSION } from '../config/constants';
import { logger } from '../utils/logger';
import { APP_CAPABILITIES } from './capabilities';
import { runHaptic, showToast } from './handlers';
import { shareContent } from '../features/share/share';
import { authenticate } from '../features/biometric/biometric';
import { setBadgeCount } from '../features/push/push';
import { PROTOCOL_VERSION, parseWebMessage, type AppToWeb } from './protocol';

export interface BridgeOptions {
  /** 웹이 앱 잠금 on/off를 요청했을 때. */
  onSetBiometricLock?: (enabled: boolean) => void;
  /** 웹이 QR 스캐너 열기를 요청했을 때(reqId로 결과를 짝지음). */
  onOpenQrScanner?: (reqId: string) => void;
}

export function useBridge(webViewRef: RefObject<WebView | null>, options: BridgeOptions = {}) {
  const { onSetBiometricLock, onOpenQrScanner } = options;
  /** 앱 → 웹 이벤트 주입. */
  const emitToWeb = useCallback(
    (msg: AppToWeb) => {
      const payload = JSON.stringify(msg);
      webViewRef.current?.injectJavaScript(
        `window.__boheom && window.__boheom.onNativeEvent(${payload}); true;`
      );
    },
    [webViewRef]
  );

  /** ready 핸드셰이크 - WebView 로드가 끝날 때마다 호출해 웹이 앱 모드로 전환/재동기화. */
  const sendReady = useCallback(() => {
    emitToWeb({
      v: PROTOCOL_VERSION,
      type: 'ready',
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: APP_VERSION,
      capabilities: APP_CAPABILITIES,
    });
  }, [emitToWeb]);

  /** 웹 → 앱 메시지 라우터. */
  const handleWebMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = parseWebMessage(event.nativeEvent.data);
    if (!msg) return;

    switch (msg.type) {
      case 'haptic':
        runHaptic(typeof msg.style === 'string' ? msg.style : undefined);
        break;
      case 'toast':
        if (typeof msg.message === 'string') showToast(msg.message);
        break;
      case 'share':
        shareContent({
          url: typeof msg.url === 'string' ? msg.url : undefined,
          title: typeof msg.title === 'string' ? msg.title : undefined,
          message: typeof msg.message === 'string' ? msg.message : undefined,
        });
        break;
      case 'request-biometric': {
        const reqId = typeof msg.reqId === 'string' ? msg.reqId : '';
        const reason = typeof msg.reason === 'string' ? msg.reason : '본인 확인';
        authenticate(reason).then((res) => {
          emitToWeb({ v: PROTOCOL_VERSION, type: 'biometric-result', reqId, ok: res.ok, error: res.error });
        });
        break;
      }
      case 'set-biometric-lock':
        if (typeof msg.enabled === 'boolean') onSetBiometricLock?.(msg.enabled);
        break;
      case 'open-qr-scanner':
        onOpenQrScanner?.(typeof msg.reqId === 'string' ? msg.reqId : '');
        break;
      case 'set-badge':
        if (typeof msg.count === 'number') setBadgeCount(msg.count);
        break;
      case 'log':
        if (typeof msg.message === 'string') {
          const level = msg.level === 'warn' || msg.level === 'error' ? msg.level : 'info';
          logger.fromWeb(level, msg.message);
        }
        break;
      default:
        // 알 수 없는 type은 조용히 무시(하위/상위 호환).
        break;
    }
  }, [emitToWeb, onSetBiometricLock, onOpenQrScanner]);

  return { emitToWeb, sendReady, handleWebMessage };
}
