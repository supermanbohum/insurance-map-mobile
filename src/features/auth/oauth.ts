/**
 * ⚠️ 휴면(DORMANT) - 2026-08-07(A-001)부터 미사용.
 * 웹에서 간편로그인(Google 등 소셜/OAuth)이 완전히 제거되어 Supabase authorize 흐름이
 * 발생하지 않으므로 App.tsx의 배선을 해제했다. 파일은 재도입 대비 보존한다.
 * Google 재도입 시: App.tsx에서 isSupabaseAuthorizeUrl 감지 → runGoogleAuthSession 재배선.
 *
 * (원 동작) 구글 OAuth 우회 - Supabase authorize를 Custom Tab(WebView 밖)에서 진행하고,
 * boheommap://auth-callback 으로 복귀하면 웹의 /auth/callback 경로로 결과를 넘긴다.
 */
import * as WebBrowser from 'expo-web-browser';
import { APP_URL, OAUTH_RETURN_URL } from '../../config/constants';
import { logger } from '../../utils/logger';

/**
 * authorize URL을 Custom Tab에서 열고, 성공 시 WebView에 주입할 최종 콜백 URL을 돌려준다.
 * (실패/취소 시 null)
 */
export async function runGoogleAuthSession(authorizeUrl: string): Promise<string | null> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, OAUTH_RETURN_URL);
    if (result.type === 'success' && result.url) {
      return result.url.replace(OAUTH_RETURN_URL, `${APP_URL}/auth/callback`);
    }
  } catch (e) {
    logger.warn('구글 OAuth 세션 실패', e);
  }
  return null;
}
