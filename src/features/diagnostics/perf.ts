/**
 * WebView 성능 계측(진단 전용) — "렉이 앱 탓인가 웹 탓인가"를 숫자로 가른다.
 *
 * ⚠️ __DEV__ 빌드에서만 활성. 프로덕션 사용자 앱에는 스크립트가 주입되지 않는다.
 * 웹은 자기 performance API를 **읽히기만** 한다(웹 코드 수정 0, 읽기 전용).
 *
 * 사용:
 *   - App.tsx onLoadStart에서 markLoadStart(), onLoadEnd에서 logAppLoadTiming() + PERF_PROBE_JS 주입
 *   - onMessage에서 handlePerfMessage()로 먼저 가로채 로깅(브릿지로 넘기지 않음)
 */
import { logger } from '../../utils/logger';

/** 진단 활성화 여부. 프로덕션(__DEV__=false)에선 꺼져 사용자에게 아무 것도 주입되지 않는다. */
export const PERF_DIAGNOSTICS_ENABLED = __DEV__;

const PERF_MESSAGE_TAG = '__boheom_perf__';

/**
 * onLoadEnd 직후 주입할 스크립트. 웹의 Navigation/Resource Timing을 읽어 앱으로 postMessage.
 * 읽기 전용 — 웹 상태를 바꾸지 않는다.
 */
export const PERF_PROBE_JS = `(function(){
  try {
    var nav = (performance.getEntriesByType('navigation') || [])[0] || {};
    var res = performance.getEntriesByType('resource') || [];
    var bytes = 0; for (var i=0;i<res.length;i++){ bytes += (res[i].transferSize || 0); }
    var payload = {
      tag: '${PERF_MESSAGE_TAG}',
      path: location.pathname,
      domInteractive: Math.round(nav.domInteractive || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      responseEnd: Math.round(nav.responseEnd || 0),
      transferKB: Math.round(bytes / 1024),
      resourceCount: res.length
    };
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  } catch (e) {}
  true;
})();`;

/** 앱-웹 왕복 로드 시간(onLoadStart→onLoadEnd)을 로깅. */
export function logAppLoadTiming(path: string, startedAtMs: number, endedAtMs: number): void {
  logger.info(`[PERF] app onLoad ${path} = ${Math.max(0, endedAtMs - startedAtMs)}ms (start→end)`);
}

/**
 * 받은 메시지가 성능 프로브면 로깅 후 true(브릿지로 넘기지 않음). 아니면 false.
 */
export function handlePerfMessage(raw: string): boolean {
  if (!raw || raw.indexOf(PERF_MESSAGE_TAG) === -1) return false;
  try {
    const d = JSON.parse(raw);
    if (d && d.tag === PERF_MESSAGE_TAG) {
      logger.info(
        `[PERF] web ${d.path} · interactive ${d.domInteractive}ms · DCL ${d.domContentLoaded}ms · load ${d.loadEvent}ms · resp ${d.responseEnd}ms · ${d.transferKB}KB / ${d.resourceCount} req`
      );
      return true;
    }
  } catch {
    // 파싱 실패는 성능 메시지가 아님 → 브릿지가 처리하도록 false.
  }
  return false;
}
