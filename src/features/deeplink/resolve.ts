/**
 * 딥링크 URL → 열어야 할 보험맵 웹 URL로 변환하는 순수 함수.
 *
 * 지원 형태:
 *   - 커스텀 스킴:   boheommap://designer/123      → https://bohummap.com/designer/123
 *   - 유니버설 링크: https://bohummap.com/designer/123 → 그대로
 *
 * 규칙:
 *   - OAuth 콜백(boheommap://auth-callback, /auth/callback)은 로그인 플로우가 전담하므로 무시.
 *   - 우리 도메인이 아닌 http(s)는 무시(외부 링크는 navigation.ts가 따로 처리).
 *   - query/hash는 보존한다.
 */
import { APP_HOST, APP_URL } from '../../config/constants';

export interface ResolvedDeepLink {
  /** 웹 경로. 예: '/designer/123' */
  path: string;
  /** WebView가 이동할 완전한 URL. 예: 'https://bohummap.com/designer/123' */
  webUrl: string;
}

const APP_SCHEME = 'boheommap:';
const IGNORED_SCHEME_HOSTS = new Set(['auth-callback']);
const ALLOWED_WEB_HOSTS = new Set([APP_HOST, `www.${APP_HOST}`]);

export function resolveDeepLink(rawUrl: string | null | undefined): ResolvedDeepLink | null {
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  let path: string;

  if (parsed.protocol === APP_SCHEME) {
    // boheommap://designer/123 → hostname='designer', pathname='/123'
    const host = parsed.hostname;
    if (!host || IGNORED_SCHEME_HOSTS.has(host)) return null;
    path = `/${host}${parsed.pathname}`;
  } else if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
    if (!ALLOWED_WEB_HOSTS.has(parsed.hostname)) return null;
    if (parsed.pathname === '/auth/callback') return null; // OAuth 전용
    path = parsed.pathname || '/';
  } else {
    return null;
  }

  // 중복 슬래시 정리 + 후행 슬래시(루트 제외) 제거는 하지 않음(웹 라우팅 존중).
  path = path.replace(/\/{2,}/g, '/');

  const suffix = `${parsed.search}${parsed.hash}`;
  const webUrl = `${APP_URL}${path}${suffix}`;
  return { path, webUrl };
}
