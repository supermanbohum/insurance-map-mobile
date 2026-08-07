# 보험맵 브릿지 프로토콜 (BRIDGE_PROTOCOL)

> 작성일: 2026-08-04
> 상태: **계약(Contract) 문서 — 웹팀과 앱팀이 공유하는 단일 진실(Single Source of Truth)**
> 원칙: 이 스펙만 지키면 웹과 앱은 서로의 내부 구현을 몰라도 된다.
> 관련 문서: [MOBILE_APP_MASTER_PLAN.md](MOBILE_APP_MASTER_PLAN.md)

---

## 0. 개요

보험맵 앱은 `https://bohummap.com`을 WebView로 감싸는 하이브리드 구조다. 웹과 네이티브가 만나는 접점은 **오직 두 개**의 채널이다.

| 방향 | 채널 | API |
|---|---|---|
| **웹 → 앱** | `window.ReactNativeWebView.postMessage(json)` | WebView `onMessage` |
| **앱 → 웹** | `webViewRef.injectJavaScript(...)` → `window.__boheom.onNativeEvent(json)` | 웹이 등록한 콜백 |

- 모든 메시지는 **JSON 문자열**이다.
- 모든 메시지는 `type`(필수)과 `v`(스키마 버전, 필수)를 가진다.
- **알 수 없는 `type`은 조용히 무시한다** (양쪽 모두). 이것이 하위/상위 호환의 핵심.

---

## 1. 공통 규칙 (Envelope)

### 1.1 메시지 봉투(Envelope) 형식

```ts
interface BridgeEnvelope {
  v: 1;              // 프로토콜 버전. 하위호환 깨는 변경 시에만 증가
  type: string;      // 메시지 종류 (아래 목록)
  reqId?: string;    // 요청-응답 짝을 맞추기 위한 ID (응답이 필요한 요청만)
  // ...type별 추가 필드
}
```

### 1.2 버전 정책

- `v`는 **깨지는 변경(breaking change)**에만 올린다. 필드 추가는 버전 유지.
- 새 `type` 추가는 버전을 올리지 않는다 (모르는 type은 무시되므로 안전).
- 앱/웹은 **자신이 모르는 `v`의 메시지도 무시**하고 크래시하지 않는다.

### 1.3 요청-응답 패턴 (Request/Response)

응답이 필요한 기능(생체인증, QR 스캔 등)은 `reqId`로 짝을 맞춘다.

```
웹 → 앱 :  { v:1, type:'request-biometric', reqId:'bio-1699' }
앱 → 웹 :  { v:1, type:'biometric-result', reqId:'bio-1699', ok:true }
```

- `reqId`는 웹이 생성한다 (예: `${type}-${Date.now()}-${rand}`).
- 앱은 응답 메시지에 **동일한 `reqId`를 그대로 되돌려준다**.
- 웹은 `reqId`로 대기 중인 Promise를 resolve한다.
- 타임아웃(권장 15초) 내 응답이 없으면 웹이 reject 처리.

### 1.4 신뢰/보안 규칙

- 앱은 **`APP_HOST`(bohummap.com) 및 허용된 오리진에서 온 메시지만** 처리한다. 그 외 오리진(광고 iframe, 외부 사이트)의 메시지는 무시.
- 민감 동작(생체인증, 뱃지 등)은 앱이 자체 판단으로 실행하며, 웹의 요청은 "트리거"일 뿐 권한을 부여하지 않는다.
- 앱 → 웹 주입 시 값은 항상 `JSON.stringify`로 이스케이프한다 (스크립트 인젝션 방지).

---

## 2. 웹 → 앱 메시지 (WebToApp)

웹이 `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`로 보낸다.

### 2.1 타입 정의 (TypeScript)

```ts
type WebToApp =
  // ── 이미 구현됨 ──────────────────────────────
  | { v: 1; type: 'haptic'; style: HapticStyle }

  // ── Phase 1 (푸시/딥링크) ────────────────────
  | { v: 1; type: 'request-push-permission'; reqId: string }
  | { v: 1; type: 'push-token-ack'; ok: boolean }          // 웹이 토큰 저장 완료 통보
  | { v: 1; type: 'navigate'; path: string }               // 앱에게 특정 경로 이동 알림(선택)

  // ── Phase 2 (공유) ───────────────────────────
  | { v: 1; type: 'share'; url: string; title?: string; message?: string }
  | { v: 1; type: 'copy-to-clipboard'; text: string }

  // ── Phase 3 (보안/QR/카메라) ─────────────────
  | { v: 1; type: 'request-biometric'; reqId: string; reason?: string }
  | { v: 1; type: 'set-biometric-lock'; enabled: boolean }
  | { v: 1; type: 'open-qr-scanner'; reqId: string }
  | { v: 1; type: 'generate-qr'; reqId: string; value: string }
  | { v: 1; type: 'pick-image'; reqId: string; source: 'camera' | 'library' }

  // ── 공통 UX ──────────────────────────────────
  | { v: 1; type: 'set-badge'; count: number }
  | { v: 1; type: 'toast'; message: string }
  | { v: 1; type: 'set-status-bar'; style: 'dark' | 'light' }
  | { v: 1; type: 'keep-awake'; enabled: boolean }
  | { v: 1; type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

type HapticStyle = 'light' | 'medium' | 'success' | 'error' | 'selection';
```

### 2.2 메시지 상세

| type | 필드 | 동작 | 응답 | 상태 |
|---|---|---|---|---|
| `haptic` | `style` | 네이티브 햅틱 발생 | 없음 | ✅ 구현됨 |
| `request-push-permission` | `reqId` | OS 푸시 권한 요청 → 토큰 획득 | `push-token` 또는 `push-permission-denied` | Phase 1 |
| `push-token-ack` | `ok` | (웹이 저장 성공/실패 통보) 앱은 실패 시 재시도 예약 | 없음 | Phase 1 |
| `navigate` | `path` | 앱이 딥링크 상태를 동기화(선택) | 없음 | Phase 1 |
| `share` | `url`,`title?`,`message?` | 네이티브 공유 시트 표시 | 없음(취소 무시) | Phase 2 |
| `copy-to-clipboard` | `text` | 클립보드 복사 + 토스트 | 없음 | Phase 2 |
| `request-biometric` | `reqId`,`reason?` | Face ID/지문 인증 | `biometric-result` | Phase 3 |
| `set-biometric-lock` | `enabled` | 앱 잠금 on/off 저장 | 없음 | Phase 3 |
| `open-qr-scanner` | `reqId` | 네이티브 QR 스캐너 열기 | `qr-result` 또는 `qr-cancelled` | Phase 3 |
| `generate-qr` | `reqId`,`value` | QR 이미지 생성(모달 표시) | `qr-generated`(dataUrl) | Phase 3 |
| `pick-image` | `reqId`,`source` | 카메라/갤러리에서 이미지 선택 | `image-picked` | Phase 3 |
| `set-badge` | `count` | 앱 아이콘 뱃지 수 설정 | 없음 | Phase 4 |
| `toast` | `message` | 네이티브 토스트 | 없음 | 공통 |
| `set-status-bar` | `style` | 상태바 색 변경 | 없음 | 공통 |
| `keep-awake` | `enabled` | 화면 꺼짐 방지(예: QR 표시 중) | 없음 | 공통 |
| `log` | `level`,`message` | 앱 로그로 전달(디버깅) | 없음 | 공통 |

---

## 3. 앱 → 웹 메시지 (AppToWeb)

앱이 아래를 주입한다:

```ts
webViewRef.current?.injectJavaScript(
  `window.__boheom && window.__boheom.onNativeEvent(${JSON.stringify(msg)}); true;`
);
```

### 3.1 타입 정의

```ts
type AppToWeb =
  // ── 앱 준비 상태 ─────────────────────────────
  | { v: 1; type: 'ready'; platform: 'ios' | 'android'; appVersion: string;
      capabilities: Capability[] }               // 앱이 지원하는 기능 목록

  // ── Phase 1 (푸시/딥링크) ────────────────────
  | { v: 1; type: 'push-token'; reqId?: string; token: string; platform: 'ios' | 'android' }
  | { v: 1; type: 'push-permission-denied'; reqId?: string }
  | { v: 1; type: 'deeplink'; path: string; source: 'notification' | 'link' | 'cold-start' }
  | { v: 1; type: 'notification-received'; data: Record<string, unknown> }

  // ── Phase 3 (보안/QR/카메라) ─────────────────
  | { v: 1; type: 'biometric-result'; reqId: string; ok: boolean; error?: string }
  | { v: 1; type: 'qr-result'; reqId: string; value: string }
  | { v: 1; type: 'qr-cancelled'; reqId: string }
  | { v: 1; type: 'qr-generated'; reqId: string; dataUrl: string }
  | { v: 1; type: 'image-picked'; reqId: string; uri: string; base64?: string; mime: string }

  // ── 앱 생명주기 ──────────────────────────────
  | { v: 1; type: 'app-state'; state: 'active' | 'background' | 'inactive' }
  | { v: 1; type: 'network'; online: boolean }
  | { v: 1; type: 'back-pressed' };              // 안드로이드 하드웨어 백(웹이 소비 가능)

type Capability =
  | 'haptic' | 'push' | 'deeplink' | 'share' | 'biometric'
  | 'qr-scan' | 'qr-generate' | 'image-pick' | 'badge' | 'clipboard';
```

### 3.2 메시지 상세

| type | 필드 | 의미 | 상태 |
|---|---|---|---|
| `ready` | `platform`,`appVersion`,`capabilities` | 앱 준비 완료. **웹은 이걸 받으면 "앱 모드"로 전환**하고 `capabilities`로 기능 노출 여부 결정 | Phase 0 |
| `push-token` | `token`,`platform` | Expo Push Token. **웹이 서버에 저장** | Phase 1 |
| `push-permission-denied` | — | 사용자가 푸시 권한 거부 | Phase 1 |
| `deeplink` | `path`,`source` | 앱이 딥링크로 진입 → 웹이 해당 경로로 라우팅 | Phase 1 |
| `notification-received` | `data` | 포그라운드 알림 수신(앱이 배너 억제한 경우 등 웹이 인지) | Phase 1 |
| `biometric-result` | `ok`,`error?` | 생체인증 결과 | Phase 3 |
| `qr-result` | `value` | 스캔한 QR 값 | Phase 3 |
| `qr-cancelled` | — | 스캐너 취소 | Phase 3 |
| `qr-generated` | `dataUrl` | 생성된 QR 이미지(data URL) | Phase 3 |
| `image-picked` | `uri`,`base64?`,`mime` | 선택/촬영한 이미지 | Phase 3 |
| `app-state` | `state` | 포그라운드/백그라운드 전환 | Phase 3 |
| `network` | `online` | 네트워크 상태 변화 | 공통 |
| `back-pressed` | — | 안드로이드 백 버튼(웹 모달 닫기 등에 활용) | 공통 |

---

## 4. 핵심 플로우 예시

### 4.1 앱 감지 (웹이 "앱 안에서 열렸는지" 판별)

```js
// 웹 측
window.__boheom = {
  isApp: false,
  capabilities: [],
  onNativeEvent(msg) {
    if (msg.type === 'ready') {
      this.isApp = true;
      this.capabilities = msg.capabilities;
      document.documentElement.classList.add('is-app');   // 앱 전용 CSS 훅
      // 예: 앱에서는 웹 헤더의 "앱 다운로드" 배너 숨김
    }
    // ...다른 이벤트 처리 (deeplink 등)
    this._resolvers?.[msg.reqId]?.(msg);   // 요청-응답 짝 resolve
  },
};

// 앱에 메시지 보내는 헬퍼
window.__boheom.send = (msg) =>
  window.ReactNativeWebView?.postMessage(JSON.stringify({ v: 1, ...msg }));
```

> **주의**: 웹은 `ready`를 못 받아도(=일반 브라우저) 정상 동작해야 한다. `window.ReactNativeWebView`가 없으면 웹 폴백을 쓴다 (예: 공유는 `navigator.share`).

### 4.2 푸시 토큰 등록 (Phase 1)

```
1. 앱 시작 → capabilities 포함 'ready' 주입
2. 웹: 로그인 상태 & 앱이면 → send({ type:'request-push-permission', reqId })
3. 앱: OS 권한 요청 → 허용 시 Expo 토큰 획득
4. 앱 → 웹: { type:'push-token', reqId, token, platform }
5. 웹: 서버 API로 토큰 저장 → send({ type:'push-token-ack', ok:true })
6. (실패 시) 앱은 다음 앱 실행 때 재등록
```

### 4.3 QR 스캔 (Phase 3)

```
1. 웹: send({ type:'open-qr-scanner', reqId:'qr-1' })   // Promise 대기
2. 앱: 네이티브 카메라 스캐너 모달 → 코드 인식
3. 앱 → 웹: { type:'qr-result', reqId:'qr-1', value:'https://bohummap.com/designer/123' }
4. 웹: Promise resolve → 해당 프로필로 이동
   (취소 시 앱이 { type:'qr-cancelled', reqId:'qr-1' } → Promise reject)
```

### 4.4 공유 (Phase 2) — 앱/웹 폴백

```js
async function shareProfile(url, title) {
  if (window.__boheom?.isApp && window.__boheom.capabilities.includes('share')) {
    window.__boheom.send({ type: 'share', url, title });   // 네이티브 시트
  } else if (navigator.share) {
    await navigator.share({ url, title });                 // 웹 폴백
  } else {
    await navigator.clipboard.writeText(url);              // 최종 폴백
  }
}
```

---

## 5. 딥링크 경로 계약 (Deeplink Routes)

앱 → 웹 `deeplink`의 `path`. 정합화 로직은 `src/features/deeplink/resolve.ts`(순수 함수, 단위테스트). **패스스루 방식(A-013, 2026-08-08)**: 화이트리스트 없이 **구경로만 remap하고 나머지는 그대로 웹에 통과**시킨다 → 웹이 라우트를 추가해도 앱 수정 없이 자동 동작(미지 경로는 웹이 자체 404 렌더). 도메인은 항상 `bohummap.com`으로 고정(외부 URL로 열릴 경로 없음). 아래 표는 참고용이며, 표에 없어도 실제 웹 라우트면 통과된다.

**실제 라우트 (딥링크 통과)**
| 딥링크 | 웹 경로 | 설명 |
|---|---|---|
| `boheommap://branch/{slug}` | `/branch/[slug]` | 지점 상세 (※ id 아님, **slug**) |
| `boheommap://ga/{slug}` | `/ga/[slug]` | GA 상세 |
| `boheommap://planner-market/{plannerId}` | `/planner-market/[plannerId]` | 설계사 프로필(설계사마켓) |
| `boheommap://post/{id}` | `/post/[id]` | 커뮤니티 글 |
| `boheommap://board/{category}` | `/board/[category]` | 게시판(공지=`/board/notice`) |
| `boheommap://chat` | `/chat` | **단일 글로벌 룸(roomId 없음)** |
| `boheommap://top-designer[/{id}]` | `/top-designer`, `/top-designer/[id]` | TOP 설계사 |
| `boheommap://salary-ranking[/...]` | `/salary-ranking`(+`/[year]`,`/hall-of-fame`,`/detail/[id]`,`/apply`) | 연봉 랭킹 |
| `boheommap://region/{sido}[/{sigungu}]` | `/region/[sido]`(+`/[sigungu]`) | 지역 |
| `boheommap://my` / `boheommap://planner-market/notifications` | `/my` / `/planner-market/notifications` | 마이/알림 |
| `boheommap://partner/branches/{branchId}/performance` | `/partner/branches/[branchId]/performance` | 파트너 성과(문의 도착 푸시 착지점) |
| `boheommap://partner/...` / `boheommap://admin/...` | `/partner/*` / `/admin/*` | 파트너센터/관리자(로그인 게이트) |
| `boheommap://auth-callback` | — | OAuth 복귀 전용(딥링크에서 무시) |

**구경로 remap / 특수 처리** — `resolve.ts`가 자동 처리 (그 외 모든 경로는 웹으로 패스스루)
| 들어온 경로 | 처리 |
|---|---|
| `designer/{id}` | → `/planner-market/{id}` |
| `chat/{anything}` | → `/chat` |
| `notice(/{id})` | → `/board/notice` |
| `recruiting/*`, `ads/*` | → `/` (홈) |
| `jobs`,`events`,`best` 등 나머지 실제 라우트 | → 그대로 통과(웹이 렌더) |
| 알 수 없는 경로 | → 그대로 통과 → 웹이 자체 404. 도메인은 bohummap.com 고정 |

> 한글 slug는 자동 퍼센트 인코딩되어 이동한다(WebView가 디코딩해 매칭). 정상 동작.

---

## 6. 알림 페이로드 계약 (Push Payload)

서버가 Expo Push API로 보낼 때의 `data` 필드 규격. 앱은 이걸 파싱해 딥링크로 변환한다.

```ts
interface PushData {
  kind: 'chat' | 'profile-view' | 'branch' | 'ga' | 'post' | 'salary-ranking' | 'notice';
  path: string;          // 실제 웹 라우트여야 함. 예: '/planner-market/42', '/chat', '/branch/{slug}'
  id?: string;
  badge?: number;        // 앱 아이콘 뱃지에 반영할 값(선택)
}
```
> `path`는 **실제 라우트**로 보내는 것을 권장한다. 앱은 `resolve.ts`로 구경로/미지경로를 안전 폴백하지만, 정확한 경로를 보내면 그대로 이동한다. 채팅은 단일 룸이므로 항상 `/chat`.

Expo Push 메시지 예시(서버 → Expo):
```json
{
  "to": "ExponentPushToken[xxxx]",
  "title": "새 메시지",
  "body": "홍길동 설계사님이 메시지를 보냈습니다.",
  "sound": "default",
  "badge": 3,
  "data": { "kind": "chat", "path": "/chat" }
}
```
설계사 프로필 조회 알림 예시: `"data": { "kind": "profile-view", "path": "/planner-market/42", "id": "42" }`

---

## 7. 버전 이력 (Changelog)

| 프로토콜 `v` | 날짜 | 변경 |
|---|---|---|
| 1 | 2026-08-04 | 최초 정의. `haptic`은 기존 구현 반영. Phase 1~4 타입 예약 |

---

## 8. 웹팀 액션 아이템

이 계약에서 **웹팀이 구현해야 할 최소 사항**:

1. `window.__boheom.onNativeEvent(msg)` 콜백 등록 + `send()` 헬퍼
2. `ready` 수신 시 앱 모드 전환(`is-app` 클래스, 앱 전용 UI 분기)
3. `push-token` 수신 → 서버에 저장하는 API 1개
4. `deeplink` 수신 → 프론트 라우터로 이동
5. 공유/QR 등은 **폴백을 갖춘 헬퍼**로 감싸기 (앱이면 브릿지, 아니면 웹 API)
6. App/Universal Links 검증 파일 호스팅: `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association`

> 위 항목 외 웹 내부 로직은 앱이 관여하지 않는다. 브릿지는 얇게 유지한다.
