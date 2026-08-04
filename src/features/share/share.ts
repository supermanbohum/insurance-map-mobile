/**
 * 네이티브 공유 시트 - 설계사/지점 프로필 URL 등을 카톡·문자 등으로 공유한다.
 * react-native의 Share(코어 API)를 쓰므로 신규 의존성이 필요 없다.
 *
 * 플랫폼 차이:
 *   - iOS: message와 url을 분리해 전달 가능(둘 다 공유 시트에 반영)
 *   - Android: url 필드가 무시되므로 message에 합쳐야 링크가 함께 공유된다
 */
import { Platform, Share } from 'react-native';
import { logger } from '../../utils/logger';

export interface ShareInput {
  url?: string;
  title?: string;
  message?: string;
}

export type SharePlatform = 'ios' | 'android';

/** RN Share.share에 넘길 콘텐츠 구성(순수 - 플랫폼을 인자로 받아 테스트 가능). */
export function buildShareContent(
  input: ShareInput,
  platform: SharePlatform
): { title?: string; message?: string; url?: string } {
  const url = input.url?.trim() || undefined;
  const message = input.message?.trim() || undefined;
  const title = input.title?.trim() || undefined;

  if (platform === 'android') {
    // url을 message 끝에 합친다(둘 다 없으면 빈 값).
    const merged = [message, url].filter(Boolean).join('\n') || undefined;
    return { title, message: merged };
  }

  return { title, message, url };
}

/** 공유 시트를 띄운다. 공유할 내용이 없거나 실패해도 앱은 죽지 않는다. */
export async function shareContent(input: ShareInput): Promise<void> {
  const platform: SharePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  const content = buildShareContent(input, platform);
  if (!content.message && !content.url) return;

  // RN ShareContent 유니온(message 또는 url 중 하나는 필수) 충족.
  const rnContent =
    content.message != null
      ? { title: content.title, message: content.message, ...(content.url ? { url: content.url } : {}) }
      : { title: content.title, url: content.url as string };

  try {
    await Share.share(rnContent, { dialogTitle: input.title });
  } catch (e) {
    logger.warn('공유 실패', e);
  }
}
