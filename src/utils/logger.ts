/**
 * 얇은 로거 - 개발 중에만 콘솔 출력하고, 릴리스에서는 조용하다.
 * 웹(WebView)이 브릿지 'log' 메시지로 보낸 로그도 여기로 흘려보낸다.
 */
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, tag: string, ...args: unknown[]) {
  if (!__DEV__) return;
  const prefix = `[boheom:${tag}]`;
  if (level === 'error') console.error(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

export const logger = {
  info: (...args: unknown[]) => emit('info', 'app', ...args),
  warn: (...args: unknown[]) => emit('warn', 'app', ...args),
  error: (...args: unknown[]) => emit('error', 'app', ...args),
  /** 웹에서 온 log 브릿지 메시지 처리. */
  fromWeb: (level: Level, message: string) => emit(level, 'web', message),
};
