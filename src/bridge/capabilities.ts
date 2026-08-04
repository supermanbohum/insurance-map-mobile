/**
 * 앱이 현재 실제로 구현해 제공하는 브릿지 기능 목록.
 * 'ready' 핸드셰이크로 웹에 전달되어, 웹이 기능 노출 여부를 결정하는 근거가 된다.
 *
 * ⚠️ 정직하게 유지한다 - 실제 핸들러가 있는 것만 넣는다.
 * Phase 1에서 push/deeplink/share/biometric/qr 핸들러를 구현하며 하나씩 추가한다.
 */
import type { Capability } from './protocol';

export const APP_CAPABILITIES: Capability[] = ['haptic', 'deeplink', 'share'];
