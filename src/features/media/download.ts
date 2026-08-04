/**
 * WebView가 만난 다운로드 파일(blob/Content-Disposition)을 앱이 받아 갤러리에 저장한다.
 * UI(Alert)는 호출부가 담당하고, 여기서는 결과만 돌려준다.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { logger } from '../../utils/logger';

export type DownloadResult =
  | { ok: true; fileName: string; savedToGallery: boolean }
  | { ok: false };

export async function downloadToGallery(downloadUrl: string): Promise<DownloadResult> {
  try {
    const fileName = downloadUrl.split('/').pop()?.split('?')[0] || `download-${Date.now()}`;
    const dest = FileSystem.cacheDirectory + fileName;
    const { uri } = await FileSystem.downloadAsync(downloadUrl, dest);

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(uri);
      return { ok: true, fileName, savedToGallery: true };
    }
    return { ok: true, fileName, savedToGallery: false };
  } catch (e) {
    logger.warn('파일 다운로드 실패', downloadUrl, e);
    return { ok: false };
  }
}
