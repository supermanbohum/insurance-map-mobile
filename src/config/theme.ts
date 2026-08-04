/**
 * 네이티브 UI 레이어 색상 토큰. APP_UI_UX_GUIDE.md 기준.
 * (WebView 내부 웹 화면은 웹팀 디자인을 따르므로 여기 값을 강제하지 않는다.)
 * 하드코딩된 색을 이 토큰으로 점진 교체한다.
 */
export const colors = {
  primary: '#152D70', // 브랜드 네이비 (스플래시/아이콘 배경과 동일)
  primaryPressed: '#0E1F52',
  primaryTint: '#2A47A0',
  glow: '#4C7CFF',

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
