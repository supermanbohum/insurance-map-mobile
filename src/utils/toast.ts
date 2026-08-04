/**
 * 초경량 토스트 이미터 - 어디서든 toast.show(message)로 인앱 토스트를 띄운다.
 * ToastHost가 subscribe해서 실제 렌더링을 담당한다(플랫폼 무관 통일 UX).
 */
type Listener = (message: string) => void;

let listeners: Listener[] = [];

export const toast = {
  show(message: string): void {
    if (!message) return;
    for (const listener of listeners) {
      try {
        listener(message);
      } catch {
        // 리스너 오류는 무시(토스트가 앱을 멈추지 않게).
      }
    }
  },
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
