import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import WebView, { type WebViewNavigation } from 'react-native-webview';

// 실제 배포된 보험맵 웹을 그대로 감싼다 - 기존 웹/DB/API는 절대 건드리지 않는다.
const APP_URL = 'https://insurance-community.vercel.app';
const APP_HOST = 'insurance-community.vercel.app';

SplashScreen.preventAutoHideAsync().catch(() => {});

// 로그인(카카오/구글 OAuth)은 앱 도메인 -> Supabase -> Kakao/Google -> 다시 Supabase -> 앱 도메인
// 순서로 리다이렉트가 이어진다. 이 중 하나라도 "외부 브라우저"로 튕겨나가면 세션 쿠키가
// WebView가 아닌 시스템 브라우저에 저장되어 로그인이 끝나도 앱에는 반영되지 않는다.
// 그래서 이 도메인들은 반드시 WebView 안에서 그대로 이동해야 한다.
const OAUTH_HOST_SUFFIXES = ['.supabase.co', '.kakao.com', '.google.com', '.googleapis.com', '.googleusercontent.com'];

function isAppDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === APP_HOST || OAUTH_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

const EXTERNAL_SCHEMES = ['tel:', 'sms:', 'mailto:', 'kakaotalk:', 'kakaolink:', 'intent:'];

function shouldOpenExternally(url: string): boolean {
  if (EXTERNAL_SCHEMES.some((scheme) => url.startsWith(scheme))) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return !isAppDomain(url);
  }
  // about:blank, data:, javascript: 등은 WebView 내부에서 그대로 처리.
  return false;
}

async function openExternally(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // 카카오톡 등 대상 앱이 없는 경우 - 조용히 무시(웹뷰가 멈추지 않게).
  }
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

function OfflineBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.offlineBanner, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.offlineText}>인터넷 연결이 끊어졌습니다</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const MIN_SPLASH_MS = 1500;
const MAX_SPLASH_MS = 4000;

function MainScreen() {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  const [isConnected, setIsConnected] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const backPressedOnceRef = useRef(false);
  const splashShownAtRef = useRef(Date.now());
  const splashHiddenRef = useRef(false);

  // 인터넷 끊김 감지.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  // GPS 권한 - 지도 기능에서 내 위치를 쓰므로 앱 시작 시 미리 요청.
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  // 스플래시가 너무 짧게(깜빡) 보이거나 너무 오래(먹통처럼) 떠 있지 않도록
  // 최소/최대 노출 시간을 둔다 - 로딩이 아주 빨라도 최소 시간은 채우고,
  // 네트워크가 느려도 일정 시간 뒤에는 강제로 넘어간다.
  useEffect(() => {
    const maxTimer = setTimeout(() => {
      if (!splashHiddenRef.current) {
        splashHiddenRef.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, MAX_SPLASH_MS);
    return () => clearTimeout(maxTimer);
  }, []);

  // 하드웨어 뒤로가기: 웹뷰 히스토리가 있으면 웹뷰 뒤로, 없으면 두 번 눌러야 종료.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      if (backPressedOnceRef.current) {
        BackHandler.exitApp();
        return true;
      }
      backPressedOnceRef.current = true;
      showToast('한 번 더 누르면 종료됩니다');
      setTimeout(() => {
        backPressedOnceRef.current = false;
      }, 2000);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const { url } = request;
    if (shouldOpenExternally(url)) {
      openExternally(url);
      return false;
    }
    return true;
  }, []);

  /** Android 전용: WebView가 다운로드 가능한 파일(blob/Content-Disposition)을 만나면 호출된다. */
  const handleFileDownload = useCallback(async (event: { nativeEvent: { downloadUrl: string } }) => {
    const { downloadUrl } = event.nativeEvent;
    try {
      const fileName = downloadUrl.split('/').pop()?.split('?')[0] || `download-${Date.now()}`;
      const dest = FileSystem.cacheDirectory + fileName;
      const { uri } = await FileSystem.downloadAsync(downloadUrl, dest);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('다운로드 완료', `${fileName}\n갤러리(다운로드 폴더)에 저장되었습니다.`);
      } else {
        Alert.alert('다운로드 완료', `${fileName}\n앱 임시 폴더에 저장되었습니다. (저장소 접근 권한 없음)`);
      }
    } catch {
      Alert.alert('다운로드 실패', '파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  }, []);

  const handleReload = useCallback(() => {
    setWebViewKey((k) => k + 1);
  }, []);

  const handleLoadEnd = useCallback(() => {
    if (splashHiddenRef.current) return;
    const elapsed = Date.now() - splashShownAtRef.current;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => {
      if (splashHiddenRef.current) return;
      splashHiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }, remaining);
  }, []);

  return (
    <View style={styles.container}>
      {/* Android 15+(targetSdk 35 이상)는 edge-to-edge가 강제되어 이 padding 없이는
          웹페이지 자체의 헤더/하단탭이 상태바·제스처 내비게이션 바 밑으로 들어간다. */}
      <StatusBar style="dark" />
      {!isConnected ? (
        <View style={[styles.offlineContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <OfflineBanner />
          <View style={styles.offlineCenter}>
            <Text style={styles.offlineTitle}>오프라인 상태입니다</Text>
            <Text style={styles.offlineSubtitle}>Wi-Fi 또는 모바일 데이터 연결을 확인해주세요.</Text>
            <Text style={styles.retryButton} onPress={handleReload}>
              다시 시도
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={{ height: insets.top, backgroundColor: '#ffffff' }} />
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ uri: APP_URL }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onFileDownload={handleFileDownload}
            onLoadEnd={handleLoadEnd}
            // 로그인 유지: 쿠키/로컬스토리지를 지우지 않고 그대로 재사용.
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            cacheEnabled
            incognito={false}
            // GPS: 웹 페이지의 navigator.geolocation이 동작하도록 허용
            // (권한 다이얼로그는 ACCESS_FINE_LOCATION이 승인된 상태에서 OS가 자동으로 처리한다).
            geolocationEnabled
            // 카메라/갤러리 업로드(<input type="file">)는 Android WebView가 기본 제공하는
            // 파일 선택창(onShowFileChooser)을 통해 자동으로 동작한다 - CAMERA/저장소 권한만
            // 승인되어 있으면 별도 JS 처리가 필요 없다.
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs={false}
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            startInLoadingState
            pullToRefreshEnabled
          />
          <View style={{ height: insets.bottom, backgroundColor: '#ffffff' }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152D70',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  offlineContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  offlineBanner: {
    backgroundColor: '#B91C1C',
    paddingBottom: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  offlineCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  offlineSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 20,
    color: '#152D70',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#152D70',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
