/**
 * 앱 잠금 on/off 설정값 저장 - 민감도가 낮은 불리언 하나이므로 신규 secure-store 대신
 * 이미 설치된 AsyncStorage(storage 유틸)를 재사용한다(의존성 최소화 원칙).
 */
import { StorageKeys } from '../../config/constants';
import { storage } from '../../utils/storage';

export const lockPreference = {
  get: async (): Promise<boolean> => (await storage.getItem(StorageKeys.appLockEnabled)) === '1',
  set: (enabled: boolean): Promise<void> =>
    storage.setItem(StorageKeys.appLockEnabled, enabled ? '1' : '0'),
};
