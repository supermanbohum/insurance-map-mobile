/**
 * 딥링크/푸시 경로 → 실제 보험맵 웹 라우트로 정합화하는 순수 함수.
 *
 * 실제 웹 라우트(2026-08-07, web src/app/(main) 직접 확인):
 *   /branch/[slug], /ga/[slug], /planner-market/[plannerId], /post/[id],
 *   /board/[category], /chat(단일 글로벌 룸), /top-designer(+/[id],/apply),
 *   /salary-ranking(+/[year],/apply,/hall-of-fame,/detail/[id]),
 *   /region/[sido](+/[sigungu]), /my, /search, /map, /community, /popular,
 *   /contact, /find-id, /reset-password, /delete-account, /privacy, /terms 등
 *
 * 존재하지 않는(구) 경로는 신 경로로 매핑하거나 홈으로 안전 폴백한다. **절대 404로 보내지 않는다.**
 *   designer/{id}  → /planner-market/{id}
 *   chat/{any}     → /chat            (roomId 개념 없음)
 *   notice(/{id})  → /board/notice
 *   recruiting/*, ads/*, 미지 경로 → /  (홈)
 *   준비 중 스텁(jobs/events/best)   → /  (홈)
 */
import { APP_HOST, APP_URL } from '../../config/constants';

export interface ResolvedDeepLink {
  /** 매핑된 웹 경로. 예: '/planner-market/123' */
  path: string;
  /** WebView가 이동할 완전한 URL. */
  webUrl: string;
}

const APP_SCHEME = 'boheommap:';
const IGNORED_SCHEME_HOSTS = new Set(['auth-callback']);
const ALLOWED_WEB_HOSTS = new Set([APP_HOST, `www.${APP_HOST}`]);

/**
 * 실제로 존재하는 최상위 라우트(딥링크 통과 허용).
 * ⚠️ 웹이 최상위 세그먼트를 추가하면 여기에도 넣어야 한다(안 넣으면 홈 폴백됨).
 * 'partner' = 파트너센터(예: 푸시 착지점 /partner/branches/{id}/performance — 문의 도착 알림).
 */
const KNOWN_TOP = new Set([
  'branch', 'ga', 'planner-market', 'post', 'board', 'chat',
  'top-designer', 'salary-ranking', 'region', 'my', 'search', 'map',
  'community', 'popular', 'contact', 'find-id', 'reset-password',
  'delete-account', 'privacy', 'terms', 'refund-policy', 'login',
  'signup', 'write', 'top-register', 'partner', 'admin',
]);

/** 준비 중(스텁) - 딥링크 대상에서 제외하고 홈으로 폴백. */
const STUB_TOP = new Set(['jobs', 'events', 'best']);

/** 경로(pathname)를 실제 라우트로 매핑. 순수 함수. */
export function mapPathname(pathname: string): string {
  let p = `/${pathname}`.replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '/' || p === '') return '/';

  const segs = p.slice(1).split('/');
  const first = segs[0];
  const rest = segs.slice(1);

  switch (first) {
    case 'designer': // 구: 설계사 → 설계사마켓
      return rest.length ? `/planner-market/${rest.join('/')}` : '/planner-market';
    case 'chat': // 단일 글로벌 룸(roomId 없음)
      return '/chat';
    case 'notice': // 공지 → 게시판 notice 카테고리
      return '/board/notice';
    case 'recruiting':
    case 'ads':
      return '/'; // 대응 라우트 없음 → 홈
    default:
      break;
  }

  if (STUB_TOP.has(first)) return '/'; // 준비 중 → 홈
  if (KNOWN_TOP.has(first)) return p; // 실제 라우트 → 통과
  return '/'; // 알 수 없음 → 홈(404 방지)
}

/** 원시 경로(예: 푸시 data.path)를 매핑된 ResolvedDeepLink로 변환. */
export function resolvePath(rawPath: string | null | undefined): ResolvedDeepLink {
  if (!rawPath) return { path: '/', webUrl: `${APP_URL}/` };
  // 쿼리/해시 분리
  const hashIdx = rawPath.indexOf('#');
  const hash = hashIdx >= 0 ? rawPath.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? rawPath.slice(0, hashIdx) : rawPath;
  const qIdx = noHash.indexOf('?');
  const search = qIdx >= 0 ? noHash.slice(qIdx) : '';
  const pathname = qIdx >= 0 ? noHash.slice(0, qIdx) : noHash;

  const mapped = mapPathname(pathname);
  // 홈 폴백이면 쿼리/해시는 버린다(무의미). 실제 라우트면 보존.
  const suffix = mapped === '/' ? '' : `${search}${hash}`;
  return { path: mapped, webUrl: `${APP_URL}${mapped}${suffix}` };
}

/**
 * 딥링크 URL(커스텀 스킴/유니버설 링크)을 매핑된 ResolvedDeepLink로 변환.
 * OAuth 콜백/외부 도메인은 null(무시).
 */
export function resolveDeepLink(rawUrl: string | null | undefined): ResolvedDeepLink | null {
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  let rawPath: string;

  if (parsed.protocol === APP_SCHEME) {
    // boheommap://designer/123 → hostname='designer', pathname='/123'
    const host = parsed.hostname;
    if (!host || IGNORED_SCHEME_HOSTS.has(host)) return null;
    rawPath = `/${host}${parsed.pathname}`;
  } else if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
    if (!ALLOWED_WEB_HOSTS.has(parsed.hostname)) return null;
    if (parsed.pathname === '/auth/callback') return null; // OAuth 전용
    rawPath = parsed.pathname || '/';
  } else {
    return null;
  }

  return resolvePath(`${rawPath}${parsed.search || ''}${parsed.hash || ''}`);
}
