/**
 * 생체인증(Face ID / 지문) 래퍼 - expo-local-authentication.
 * 하드웨어/등록 여부를 확인한 뒤 인증을 시도하고, 실패해도 앱은 죽지 않는다.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { logger } from '../../utils/logger';

export interface AuthResult {
  ok: boolean;
  /** 실패 사유(간략). 예: 'not_available' | 'user_cancel' | 'failed' | 'exception' */
  error?: string;
}

/** 생체 스캐너가 있고 등록된 생체정보가 있는지. */
export async function isBiometricReady(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch (e) {
    logger.warn('생체인증 가용성 확인 실패', e);
    return false;
  }
}

/** 생체인증을 시도한다. 준비 안 됨/취소/실패는 ok:false + error로 반환. */
export async function authenticate(promptMessage: string): Promise<AuthResult> {
  try {
    if (!(await isBiometricReady())) return { ok: false, error: 'not_available' };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: '취소',
    });
    if (result.success) return { ok: true };
    return { ok: false, error: result.error ?? 'failed' };
  } catch (e) {
    logger.warn('생체인증 실패', e);
    return { ok: false, error: 'exception' };
  }
}
