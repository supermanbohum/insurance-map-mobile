/**
 * OAuth 소셜 로그인 우회 인프라 (provider-agnostic). **삭제 금지 — 유지(CTO 2026-08-07).**
 *
 * Supabase authorize 흐름(소셜 로그인)은 WebView 안에서 차단되므로, Custom Tab(WebView 밖)에서
 * 진행하고 boheommap://auth-callback 스킴으로 복귀 → 웹의 /auth/callback 으로 결과를 넘긴다.
 *
 * 현재 상태: 웹에서 Google 로그인이 제거되어 이 경로는 **미발화(inert)**. 그러나 곧 도입 예정인
 * **카카오 OAuth가 동일 메커니즘을 재사용**하므로 인프라를 그대로 유지한다.
 * (카카오도 Supabase authorize → Custom Tab → 스킴 콜백의 동일 흐름. 재배선 불필요, 자동 동작.)
 */
import * as WebBrowser from 'expo-web-browser';
import { APP_URL, OAUTH_RETURN_URL } from '../../config/constants';
import { logger } from '../../utils/logger';

/**
 * authorize URL을 Custom Tab에서 열고, 성공 시 WebView에 주입할 최종 콜백 URL을 돌려준다.
 * 제공자(Google/Kakao 등) 무관. 실패/취소 시 null.
 */
export async function runOAuthAuthSession(authorizeUrl: string): Promise<string | null> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, OAUTH_RETURN_URL);
    if (result.type === 'success' && result.url) {
      return result.url.replace(OAUTH_RETURN_URL, `${APP_URL}/auth/callback`);
    }
  } catch (e) {
    logger.warn('OAuth 세션 실패', e);
  }
  return null;
}
