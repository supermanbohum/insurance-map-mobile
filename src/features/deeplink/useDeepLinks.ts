/**
 * 딥링크 수신 훅 - 앱이 링크(커스텀 스킴/유니버설 링크)로 열리거나 실행 중 링크를 받으면
 * 콜백을 호출한다. 콜드 스타트(앱이 링크로 실행됨)와 웜(실행 중 수신) 모두 처리한다.
 *
 * SDK 57 권장 API: Linking.useLinkingURL() - 초기 URL을 즉시 반환하고 이후 변경도 감지.
 */
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { resolveDeepLink, type ResolvedDeepLink } from './resolve';

export function useDeepLinks(onLink: (resolved: ResolvedDeepLink) => void): void {
  const url = Linking.useLinkingURL();

  useEffect(() => {
    if (!url) return;
    const resolved = resolveDeepLink(url);
    if (resolved) onLink(resolved);
  }, [url, onLink]);
}
