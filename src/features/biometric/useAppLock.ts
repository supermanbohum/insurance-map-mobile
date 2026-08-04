/**
 * 앱 잠금 상태 관리 훅.
 * - 설정이 켜져 있으면 앱 실행 시 잠금 + 백그라운드→포그라운드 복귀 시 재잠금
 * - unlock(): 생체인증으로 잠금 해제
 * - setLockEnabled(): 잠금 켜기(본인 인증 요구) / 끄기
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { authenticate, isBiometricReady, type AuthResult } from './biometric';
import { lockPreference } from './lockPreference';

export function useAppLock() {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const enabledRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // 저장된 설정 로드 - 켜져 있으면 시작부터 잠금.
  useEffect(() => {
    lockPreference.get().then((e) => {
      enabledRef.current = e;
      setEnabled(e);
      if (e) setLocked(true);
    });
  }, []);

  // 백그라운드/비활성 → 활성 복귀 시 재잠금.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (enabledRef.current && /inactive|background/.test(prev) && next === 'active') {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async (): Promise<AuthResult> => {
    const res = await authenticate('보험맵 잠금 해제');
    if (res.ok) setLocked(false);
    return res;
  }, []);

  const setLockEnabled = useCallback(async (value: boolean): Promise<AuthResult> => {
    if (value) {
      // 켤 때: 생체인증 가능 여부 + 본인 확인.
      if (!(await isBiometricReady())) return { ok: false, error: 'not_available' };
      const res = await authenticate('앱 잠금을 켜기 위해 인증해주세요');
      if (!res.ok) return res;
    }
    await lockPreference.set(value);
    enabledRef.current = value;
    setEnabled(value);
    if (!value) setLocked(false);
    return { ok: true };
  }, []);

  return { enabled, locked, unlock, setLockEnabled };
}
