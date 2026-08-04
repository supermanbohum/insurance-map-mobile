/**
 * AsyncStorage 얇은 래퍼 - 실패해도 앱이 죽지 않도록 조용히 처리한다.
 * 네이티브 로컬 상태(온보딩 여부 등)만 저장. 웹 세션/데이터는 WebView가 자체 보관한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../config/constants';
import { logger } from './logger';

async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    logger.warn('storage.get 실패', key, e);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    logger.warn('storage.set 실패', key, e);
  }
}

export const storage = { getItem, setItem };

/** 온보딩 노출 여부 헬퍼. */
export const onboarding = {
  hasSeen: async () => (await getItem(StorageKeys.onboardingSeen)) != null,
  markSeen: () => setItem(StorageKeys.onboardingSeen, '1'),
};
