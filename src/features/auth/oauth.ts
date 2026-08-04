/**
 * 구글 OAuth 우회 - Supabase authorize를 Custom Tab(WebView 밖)에서 진행하고,
 * boheommap://auth-callback 으로 복귀하면 웹의 기존 /auth/callback 경로로 결과를 넘긴다.
 * 웹의 콜백 처리 로직은 그대로 재사용하며, 앱은 세션에 관여하지 않는다.
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
