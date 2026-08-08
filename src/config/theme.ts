/**
 * 네이티브 UI 레이어 색상 토큰. APP_UI_UX_GUIDE.md 기준.
 * (WebView 내부 웹 화면은 웹팀 디자인을 따르므로 여기 값을 강제하지 않는다.)
 * 하드코딩된 색을 이 토큰으로 점진 교체한다.
 */
export const colors = {
  primary: '#2472EC', // 브랜드 블루 (스플래시/아이콘 배경·런처 아이콘과 동일 → 전 화면 색 연속)
  primaryPressed: '#1B57D9', // primary 눌림(동일 색상 10% 어둡게)
  primaryTint: '#5490F0', // ※미사용/잠정 - 디자인 확정값 대기
  glow: '#4C7CFF', // ※미사용/잠정 - 디자인 확정값 대기

  // 구 브랜드 네이비. primary 자리에서 물러나 텍스트·다크 서피스 용도로 보존(삭제 금지).
  ink: '#152D70',

  bg: '#FFFFFF',
  surface: '#F7F8FA',
  border: '#E5E7EB',

  text: '#111827',
  textSub: '#6B7280',
  textDisabled: '#9CA3AF',

  danger: '#B91C1C', // 오프라인 배너 등
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
