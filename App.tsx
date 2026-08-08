import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';
import WebView, { type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';

import { APP_URL, MAX_SPLASH_MS, MIN_SPLASH_MS } from './src/config/constants';
import { colors } from './src/config/theme';
import { buildBridgeSetupScript } from './src/bridge/injected';
import { PROTOCOL_VERSION } from './src/bridge/protocol';
import { useBridge } from './src/bridge/useBridge';
import { useDeepLinks } from './src/features/deeplink/useDeepLinks';
import { resolvePath, type ResolvedDeepLink } from './src/features/deeplink/resolve';
import { useAppLock } from './src/features/biometric/useAppLock';
import { usePush } from './src/features/push/usePush';
import { scheduleRevisitReminder, cancelRevisitReminder } from './src/features/retention/localReminder';
import {
  PERF_DIAGNOSTICS_ENABLED,
  PERF_PROBE_JS,
  handlePerfMessage,
  logAppLoadTiming,
  recordLoadStart,
  recordLoadEnd,
} from './src/features/diagnostics/perf';
import { runOAuthAuthSession } from './src/features/auth/oauth';
import { downloadToGallery } from './src/features/media/download';
import { isSupabaseAuthorizeUrl, openExternally, shouldOpenExternally } from './src/webview/navigation';
import { showToast } from './src/bridge/handlers';
import { haptics } from './src/utils/haptics';
import { onboarding } from './src/utils/storage';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { Onboarding } from './src/components/Onboarding';
import { OfflineScreen } from './src/components/OfflineScreen';
import { AppLockScreen } from './src/components/AppLockScreen';
import { QrScannerScreen } from './src/components/QrScannerScreen';
import { LoadingBar } from './src/components/LoadingBar';
import { ErrorScreen } from './src/components/ErrorScreen';
import { ToastHost } from './src/components/ToastHost';

SplashScreen.preventAutoHideAsync().catch(() => {});

// 웹 컨텍스트에 window.__boheom 을 설치하는 스크립트 (매 페이지 로드 전 실행).
const BRIDGE_SETUP_JS = buildBridgeSetupScript();

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

function MainScreen() {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const { locked, unlock, setLockEnabled } = useAppLock();
  const [qrReqId, setQrReqId] = useState<string | null>(null);
  // 안정적인 콜백 참조 - 로딩 진행 등 잦은 리렌더에도 handleWebMessage/onMessage가 재생성되지 않게.
  const openQrScanner = useCallback((reqId: string) => setQrReqId(reqId), []);
  const { handleWebMessage, sendReady, emitToWeb } = useBridge(webViewRef, {
    onSetBiometricLock: setLockEnabled,
    onOpenQrScanner: openQrScanner,
  });

  // 성능 프로브 메시지는 브릿지로 넘기기 전에 가로채 로깅(진단 빌드에서만). 그 외는 브릿지 라우터로.
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (PERF_DIAGNOSTICS_ENABLED && handlePerfMessage(event.nativeEvent.data)) return;
      handleWebMessage(event);
    },
    [handleWebMessage]
  );

  const handleQrResult = useCallback(
    (value: string) => {
      if (qrReqId !== null) {
        emitToWeb({ v: PROTOCOL_VERSION, type: 'qr-result', reqId: qrReqId, value });
      }
      setQrReqId(null);
    },
    [qrReqId, emitToWeb]
  );

  const handleQrCancel = useCallback(() => {
    if (qrReqId !== null) {
      emitToWeb({ v: PROTOCOL_VERSION, type: 'qr-cancelled', reqId: qrReqId });
    }
    setQrReqId(null);
  }, [qrReqId, emitToWeb]);

  const [isConnected, setIsConnected] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState(false);
  const [uiStage, setUiStage] = useState<'splash' | 'onboarding' | 'app'>('splash');
  const [splashMounted, setSplashMounted] = useState(true);
  const backPressedOnceRef = useRef(false);
  const splashShownAtRef = useRef(Date.now());
  const splashHiddenRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const pendingDeepLinkRef = useRef<ResolvedDeepLink | null>(null);
  const webLoadingRef = useRef(true);
  const loadStartAtRef = useRef(Date.now()); // 진단: onLoadStart→onLoadEnd 소요 측정용.

  // 딥링크(커스텀 스킴/유니버설 링크)를 받으면 해당 웹 경로로 WebView를 이동시키고,
  // 웹에도 알린다(웹이 SPA 라우팅으로 반응할 수 있도록 - 없어도 이동은 보장됨).
  const applyDeepLink = useCallback(
    (resolved: ResolvedDeepLink, source: 'link' | 'cold-start') => {
      webViewRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(resolved.webUrl)}; true;`
      );
      emitToWeb({ v: PROTOCOL_VERSION, type: 'deeplink', path: resolved.path, source });
    },
    [emitToWeb]
  );

  // WebView가 아직 첫 로드 전이면(콜드 스타트) 대기시켰다가 onLoadEnd에서 적용한다.
  const handleDeepLink = useCallback(
    (resolved: ResolvedDeepLink) => {
      if (hasLoadedOnceRef.current) {
        applyDeepLink(resolved, 'link');
      } else {
        pendingDeepLinkRef.current = resolved;
      }
    },
    [applyDeepLink]
  );

  useDeepLinks(handleDeepLink);

  // 푸시 알림: 알림 탭 → 실제 라우트로 매핑(구경로/미지경로 안전 폴백) 후 이동.
  const handleNotificationPath = useCallback(
    (path: string) => {
      handleDeepLink(resolvePath(path));
    },
    [handleDeepLink]
  );
  const pushToken = usePush({ onNotificationPath: handleNotificationPath });
  const pushTokenRef = useRef<string | null>(null);

  const emitPushToken = useCallback(
    (token: string) => {
      emitToWeb({
        v: PROTOCOL_VERSION,
        type: 'push-token',
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    },
    [emitToWeb]
  );

  // 토큰이 도착하면 보관하고, 이미 첫 로드가 끝났으면 즉시 웹에 전달.
  useEffect(() => {
    pushTokenRef.current = pushToken;
    if (pushToken && hasLoadedOnceRef.current) emitPushToken(pushToken);
  }, [pushToken, emitPushToken]);

  // 네이티브 정적 스플래시(흰 화면 방지)는 애니메이션 오버레이가 화면을 덮자마자 내린다.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const advanceFromSplash = useCallback(() => {
    onboarding
      .hasSeen()
      .then((seen) => setUiStage(seen ? 'app' : 'onboarding'))
      .catch(() => setUiStage('app'));
  }, []);

  const handleOnboardingFinish = useCallback(() => {
    onboarding.markSeen();
    setUiStage('app');
  }, []);

  // 인터넷 끊김 감지.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  // 오프라인→온라인 복귀 처리. WebView는 언마운트하지 않으므로(작성 중 폼 보존),
  // 첫 로드조차 못한 경우(콜드 스타트 오프라인)에만 리로드해 화면을 복구한다.
  const wasConnectedRef = useRef(true);
  useEffect(() => {
    if (!wasConnectedRef.current && isConnected && !hasLoadedOnceRef.current) {
      handleReload();
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  // GPS 권한 - 지도에서 내 위치를 쓰므로 앱 시작 시 미리 요청.
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  // 로컬 재방문 알림(첫 주 이탈 방지) - 서버 무관. 앱이 지금 열려 있으니 우선 취소하고,
  // 백그라운드로 나갈 때 N일 뒤로 예약 / 다시 열면 취소한다(권한 없으면 조용히 무동작).
  useEffect(() => {
    cancelRevisitReminder();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') scheduleRevisitReminder();
      else if (state === 'active') cancelRevisitReminder();
    });
    return () => sub.remove();
  }, []);

  // 스플래시 최대 노출 시간 - 네트워크가 느려도 일정 시간 뒤엔 강제로 넘어간다.
  useEffect(() => {
    const maxTimer = setTimeout(() => {
      if (!splashHiddenRef.current) {
        splashHiddenRef.current = true;
        advanceFromSplash();
      }
    }, MAX_SPLASH_MS);
    return () => clearTimeout(maxTimer);
  }, [advanceFromSplash]);

  // 하드웨어 뒤로가기: 웹뷰 히스토리 → 두 번 눌러 종료. 스플래시 중엔 삼킨다.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = () => {
      if (uiStage === 'splash') {
        return true;
      }
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      if (backPressedOnceRef.current) {
        BackHandler.exitApp();
        return true;
      }
      backPressedOnceRef.current = true;
      haptics.warning();
      showToast('한 번 더 누르면 종료됩니다');
      setTimeout(() => {
        backPressedOnceRef.current = false;
      }, 2000);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [canGoBack, uiStage]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  // [A-001 정정] OAuth 우회 인프라는 유지한다(CTO 2026-08-07).
  // 웹의 Google 로그인 제거로 현재 Supabase authorize 흐름은 발생하지 않아 이 분기는
  // 미발화(inert) 상태이지만, **카카오 OAuth 도입 시 이 경로(Custom Tab 우회 +
  // boheommap://auth-callback 스킴 콜백)를 그대로 재사용**한다. 제공자 무관(provider-agnostic).
  const handleOAuthAuthorize = useCallback((authorizeUrl: string) => {
    runOAuthAuthSession(authorizeUrl)
      .then((finalUrl) => {
        if (finalUrl) {
          webViewRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(finalUrl)}; true;`
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const { url } = request;
      // Supabase authorize(소셜 로그인)는 WebView에서 차단되므로 Custom Tab 우회.
      // 현재 웹에 소셜 로그인이 없어 미발화. 카카오 도입 시 자동 동작.
      if (isSupabaseAuthorizeUrl(url)) {
        handleOAuthAuthorize(url);
        return false;
      }
      if (shouldOpenExternally(url)) {
        openExternally(url);
        return false;
      }
      return true;
    },
    [handleOAuthAuthorize]
  );

  /** Android 전용: WebView가 다운로드 파일을 만나면 앱이 받아 갤러리에 저장. */
  const handleFileDownload = useCallback(
    async (event: { nativeEvent: { downloadUrl: string } }) => {
      const result = await downloadToGallery(event.nativeEvent.downloadUrl);
      if (!result.ok) {
        Alert.alert('다운로드 실패', '파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      if (result.savedToGallery) {
        Alert.alert('다운로드 완료', `${result.fileName}\n갤러리(다운로드 폴더)에 저장되었습니다.`);
      } else {
        Alert.alert(
          '다운로드 완료',
          `${result.fileName}\n앱 임시 폴더에 저장되었습니다. (저장소 접근 권한 없음)`
        );
      }
    },
    []
  );

  const handleReload = useCallback(() => {
    setWebViewKey((k) => k + 1);
  }, []);

  // WebView 로드 실패 시 에러 화면을 띄우고, 재시도로 WebView를 새로 마운트한다.
  // 단, 활성 로딩 중(webLoadingRef)의 실패만 전체 에러화면으로 처리한다 - 이미 로드가
  // 끝난 뒤 발생하는 서브리소스(이미지 등) 오류로는 화면을 덮지 않는다(오탐 방지).
  const handleWebError = useCallback(() => {
    if (!webLoadingRef.current) return;
    webLoadingRef.current = false;
    setWebError(true);
    setWebLoading(false);
  }, []);

  const retryWeb = useCallback(() => {
    webLoadingRef.current = true;
    setWebError(false);
    setWebLoading(true);
    setLoadProgress(0);
    setWebViewKey((k) => k + 1);
  }, []);

  const handleLoadStart = useCallback((event?: { nativeEvent?: { url?: string } }) => {
    webLoadingRef.current = true;
    setWebLoading(true);
    setLoadProgress(0);
    if (PERF_DIAGNOSTICS_ENABLED) {
      loadStartAtRef.current = Date.now();
      recordLoadStart(event?.nativeEvent?.url);
    }
  }, []);

  const handleLoadProgress = useCallback((event: { nativeEvent: { progress: number } }) => {
    setLoadProgress(event.nativeEvent.progress);
  }, []);

  const handleLoadEnd = useCallback(() => {
    hasLoadedOnceRef.current = true;
    webLoadingRef.current = false;
    setWebLoading(false);
    // 로드가 실제로 끝났으면 에러 화면을 자동 해제(onError 오탐으로 고착되는 것 방지).
    setWebError(false);

    // 진단(개발 빌드만): 로드 카운터(짝 확인) + 앱-웹 로드 시간 + 웹 performance 추출(읽기 전용).
    if (PERF_DIAGNOSTICS_ENABLED) {
      recordLoadEnd();
      logAppLoadTiming('(current)', loadStartAtRef.current, Date.now());
      webViewRef.current?.injectJavaScript(PERF_PROBE_JS);
    }

    // 브릿지 핸드셰이크: 웹이 "앱 안"임을 인지하고 capabilities에 맞춰 UI를 전환하게 한다.
    sendReady();

    // 푸시 토큰이 이미 준비됐다면 ready 직후 웹에 전달(웹 BridgeProvider가 저장).
    if (pushTokenRef.current) emitPushToken(pushTokenRef.current);

    // 콜드 스타트 딥링크: 첫 로드가 끝난 뒤 대기 중인 링크를 적용한다.
    if (pendingDeepLinkRef.current) {
      const pending = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      applyDeepLink(pending, 'cold-start');
    }

    if (splashHiddenRef.current) return;
    const elapsed = Date.now() - splashShownAtRef.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => {
      if (splashHiddenRef.current) return;
      splashHiddenRef.current = true;
      advanceFromSplash();
    }, remaining);
  }, [advanceFromSplash, sendReady, applyDeepLink, emitPushToken]);

  const webViewElement = (
    <WebView
      key={webViewKey}
      ref={webViewRef}
      source={{ uri: APP_URL }}
      style={styles.webview}
      onNavigationStateChange={handleNavigationStateChange}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      onFileDownload={handleFileDownload}
      onLoadStart={handleLoadStart}
      onLoadProgress={handleLoadProgress}
      onLoadEnd={handleLoadEnd}
      onError={handleWebError}
      onRenderProcessGone={retryWeb}
      onContentProcessDidTerminate={retryWeb}
      onMessage={handleMessage}
      injectedJavaScriptBeforeContentLoaded={BRIDGE_SETUP_JS}
      // 로그인 유지: 쿠키/로컬스토리지를 지우지 않고 재사용.
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      domStorageEnabled
      javaScriptEnabled
      cacheEnabled
      incognito={false}
      // GPS: 웹의 navigator.geolocation 동작 허용(권한은 OS가 처리).
      geolocationEnabled
      // 카메라/갤러리 업로드(<input type="file">)는 WebView 기본 파일 선택창으로 동작.
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs={false}
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      startInLoadingState
      // iOS: 가장자리 스와이프로 WebView 히스토리 뒤로/앞으로 (Android 하드웨어 백과 짝).
      allowsBackForwardNavigationGestures
      // 당겨서 새로고침 - iOS 네이티브(@platform ios). Android는 미지원이지만
      // ScrollView 래핑 시 스크롤이 충돌하므로 감싸지 않고 WebView 네이티브 스크롤을 유지한다.
      pullToRefreshEnabled
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Android 15+(edge-to-edge 강제)에서 웹 헤더/하단탭이 시스템 바 밑으로
          들어가지 않도록 상/하단 inset을 흰 배경으로 채운다. */}
      <View style={{ height: insets.top, backgroundColor: colors.bg }} />
      {/* WebView는 항상 마운트 유지(오프라인에도 언마운트하지 않음) - 순단에 작성 중이던
          폼/스크롤 상태가 사라지지 않게 한다. 네이티브 스크롤 유지를 위해 감싸지 않는다. */}
      {webViewElement}
      <View style={{ height: insets.bottom, backgroundColor: colors.bg }} />
      <LoadingBar progress={loadProgress} visible={webLoading && loadProgress < 1} />

      {/* 오프라인: WebView를 덮는 오버레이(언마운트 대신). 재연결되면 자동으로 사라진다. */}
      {!isConnected && (
        <View style={styles.offlineOverlay}>
          <OfflineScreen onRetry={handleReload} />
        </View>
      )}

      {uiStage === 'onboarding' && (
        <View style={styles.overlayFill}>
          <Onboarding onFinish={handleOnboardingFinish} />
        </View>
      )}

      {splashMounted && (
        <AnimatedSplash visible={uiStage === 'splash'} onHidden={() => setSplashMounted(false)} />
      )}

      {/* 앱 잠금: 켜져 있으면 모든 화면 위를 덮는다(생체인증 해제 전까지). */}
      {locked && <AppLockScreen onUnlock={unlock} />}

      {/* QR 스캐너: 웹 요청 시 카메라 오버레이를 띄운다. */}
      {qrReqId !== null && (
        <QrScannerScreen onResult={handleQrResult} onCancel={handleQrCancel} />
      )}

      {/* WebView 로드 실패: 온라인인데 페이지를 못 불러온 경우. */}
      {isConnected && webError && (
        <ErrorScreen
          title="페이지를 불러오지 못했습니다"
          message={'일시적인 오류일 수 있어요.\n잠시 후 다시 시도해주세요.'}
          onRetry={retryWeb}
        />
      )}

      {/* 인앱 토스트(iOS/Android 통일) - 항상 최상단. */}
      <ToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  overlayFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  offlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    zIndex: 9,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
