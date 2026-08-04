/**
 * WebView에 주입하는 브릿지 셋업 스크립트.
 *
 * injectedJavaScriptBeforeContentLoaded로 매 페이지 로드 전에 실행되어, 웹 컨텍스트에
 * window.__boheom 을 설치한다. 웹팀은 이걸 통해:
 *   - window.__boheom.isApp / capabilities 로 "앱 안"인지 감지
 *   - window.__boheom.send({type, ...}) 로 앱에 메시지 전송 (v는 자동 부여)
 *   - window.__boheom.on(fn) 또는 addEventListener('boheom:native') 로 앱→웹 이벤트 수신
 * 웹이 아무것도 등록하지 않아도 안전하며(에러 없이 무시), 웹 코드 수정 없이도 크래시하지 않는다.
 *
 * 이 스크립트는 웹 페이지의 JS 컨텍스트에서 실행되므로 RN API를 참조하지 않는다.
 */
import { Platform } from 'react-native';
import { APP_VERSION } from '../config/constants';
import { APP_CAPABILITIES } from './capabilities';
import { PROTOCOL_VERSION } from './protocol';

export function buildBridgeSetupScript(): string {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const meta = JSON.stringify({
    v: PROTOCOL_VERSION,
    platform,
    appVersion: APP_VERSION,
    capabilities: APP_CAPABILITIES,
  });

  // 웹 컨텍스트에서 실행될 IIFE. 이미 설치되어 있으면 메타만 갱신하고 리스너는 보존한다.
  return `
(function () {
  try {
    var META = ${meta};
    var existing = window.__boheom;
    var listeners = (existing && existing._listeners) || [];
    var api = {
      isApp: true,
      v: META.v,
      platform: META.platform,
      appVersion: META.appVersion,
      capabilities: META.capabilities,
      _listeners: listeners,
      _lastReady: (existing && existing._lastReady) || null,
      // 웹 → 앱
      send: function (msg) {
        try {
          if (!msg || typeof msg !== 'object') return;
          if (msg.v == null) msg.v = META.v;
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
          }
        } catch (e) {}
      },
      // 앱 → 웹 이벤트 구독. 해제 함수를 반환한다.
      on: function (fn) {
        if (typeof fn !== 'function') return function () {};
        listeners.push(fn);
        return function () {
          var i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      // 앱이 injectJavaScript로 호출하는 진입점.
      onNativeEvent: function (msg) {
        try { if (msg && msg.type === 'ready') api._lastReady = msg; } catch (e) {}
        for (var i = 0; i < listeners.length; i++) {
          try { listeners[i](msg); } catch (e) {}
        }
        try {
          window.dispatchEvent(new CustomEvent('boheom:native', { detail: msg }));
        } catch (e) {}
      },
    };
    window.__boheom = api;
  } catch (e) {}
})();
true;
`;
}
