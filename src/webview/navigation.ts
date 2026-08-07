/**
 * WebView URL 판별 로직 - "이 URL을 WebView 안에서 계속 로드할지, 외부 앱/브라우저로
 * 넘길지, 아니면 OAuth 우회를 태울지"를 결정한다. 순수 함수만 모아 테스트/재사용 쉽게 한다.
 */
import { Linking } from 'react-native';
import { APP_HOST, EXTERNAL_SCHEMES, OAUTH_HOST_SUFFIXES } from '../config/constants';
import { logger } from '../utils/logger';

/** 우리 앱(웹) 도메인이거나 Supabase 등 내부 처리 대상 호스트인가. */
export function isAppDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === APP_HOST || OAUTH_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * Supabase 소셜 로그인 authorize 시작 URL인가 (Custom Tab 우회 대상, provider-agnostic).
 * 현재 웹에 소셜 로그인이 없어 미발화이나, **카카오 OAuth 도입 시 그대로 재사용**하므로 유지한다
 * (CTO 2026-08-07, 삭제 금지). App.tsx handleShouldStartLoad에서 활성 상태로 계속 사용.
 */
export function isSupabaseAuthorizeUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname.endsWith('.supabase.co') && pathname.startsWith('/auth/v1/authorize');
  } catch {
    return false;
  }
}

/** WebView가 아니라 외부 앱/브라우저로 열어야 하는 URL인가. */
export function shouldOpenExternally(url: string): boolean {
  if (EXTERNAL_SCHEMES.some((scheme) => url.startsWith(scheme))) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return !isAppDomain(url);
  }
  // about:blank, data:, javascript: 등은 WebView 내부에서 그대로 처리.
  return false;
}

/** 외부 앱/브라우저로 열기 (대상 앱이 없으면 조용히 무시해 WebView가 멈추지 않게). */
export async function openExternally(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (e) {
    logger.warn('외부 링크 열기 실패', url, e);
  }
}
