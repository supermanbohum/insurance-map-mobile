# 보험맵 모바일 앱 마스터 플랜 (MOBILE_APP_MASTER_PLAN)

> 작성일: 2026-08-04
> 대상: 보험맵(보험설계사 플랫폼) 모바일 앱
> 원칙: **웹(PWA) 코드는 절대 수정하지 않는다.** 웹은 별도 담당(다른 Claude)이 유지한다.
> 이 문서는 **분석 + 설계 전용**이며, 이 단계에서는 앱 코드도 변경하지 않는다.

---

## 0. 현재 상태 분석 (Executive Summary)

이 저장소(`insurance-community-mobile`)는 **이미 초기 스캐폴드가 완료된 상태**다. 처음부터 만드는 것이 아니라, **이미 존재하는 WebView 래퍼 앱을 하이브리드 네이티브 앱으로 진화시키는 것**이 실제 과제다.

### 현재 기술 스택 (실측)

| 항목 | 버전 / 값 |
|---|---|
| 프레임워크 | **Expo SDK ~57.0.8** (Managed Workflow, CNG) |
| React Native | 0.86.0 |
| React | 19.2.3 |
| TypeScript | ~6.0.3 |
| 핵심 라이브러리 | `react-native-webview` 13.16.1 |
| 빌드 | EAS Build (projectId `c1ea2bd3-...`), Play Store 출시 준비 완료 |
| 패키지명 | `com.bohummap.app` (iOS/Android 공통) |
| 커스텀 스킴 | `boheommap://` |
| 감싸는 웹 | `https://bohummap.com` |

### 현재 아키텍처: **"단일 WebView 쉘"**

`App.tsx` 하나가 전체 앱이다. `https://bohummap.com`을 전체 화면 WebView로 띄우고, 그 위에 네이티브 기능을 얇게 얹은 구조.

```
┌─────────────────────────────────────────┐
│  App.tsx (SafeAreaProvider → MainScreen) │
│  ┌─────────────────────────────────────┐ │
│  │  AnimatedSplash (브랜드 스플래시)      │ │
│  │  Onboarding (최초 실행 3페이지)        │ │
│  │  OfflineBanner (netinfo 감지)         │ │
│  │  ┌───────────────────────────────┐   │ │
│  │  │   WebView → bohummap.com       │   │ │
│  │  │   (웹의 모든 기능이 여기서 동작)  │   │ │
│  │  └───────────────────────────────┘   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 이미 구현된 네이티브 기능 ✅

| 기능 | 구현 방식 |
|---|---|
| **Google OAuth** | Supabase `/auth/v1/authorize` 감지 → `WebBrowser.openAuthSessionAsync` (Custom Tab) → `boheommap://auth-callback` 복귀 → 웹 `/auth/callback`로 세션 전달. WebView 안에서는 구글이 로그인을 차단하기 때문에 필수 우회. |
| **햅틱 브릿지** | 웹이 `window.ReactNativeWebView.postMessage({type:'haptic', style})` 전송 → 네이티브 햅틱 (light/medium/success/error/selection) |
| **GPS** | `expo-location` 포그라운드 권한 + WebView `geolocationEnabled` |
| **파일 다운로드** | `onFileDownload` → `expo-file-system` 다운로드 → `expo-media-library` 갤러리 저장 |
| **카메라/갤러리 업로드** | WebView 기본 `onShowFileChooser` (권한만 승인되면 자동) |
| **외부 링크/스킴** | `tel:`, `sms:`, `mailto:`, `kakaotalk:`, `intent:` → 외부 앱으로 |
| **오프라인 감지** | `@react-native-community/netinfo` → 오프라인 배너 + 재시도 |
| **뒤로가기** | 하드웨어 백 → WebView 히스토리 → "한 번 더 누르면 종료" |
| **세션 유지** | `sharedCookiesEnabled`, `domStorageEnabled` (localStorage 공유) |
| **스플래시 + 온보딩** | `AnimatedSplash` + 최초 1회 온보딩(AsyncStorage 플래그) |

### 아직 없는 것 (이번 로드맵의 핵심) ❌

- **푸시 알림** (가장 임팩트 큼 — 채팅/리크루팅/알림용)
- **딥링크 라우팅** (공유 링크 → 특정 설계사/지점 화면으로 진입)
- **생체인증** (Face ID / 지문 앱 잠금)
- **QR 코드** (스캔 + 생성 — 명함/프로필 공유)
- **네이티브 공유 시트** (`expo-sharing` 의존성만 있고 미사용)
- **네이티브 화면** (지금은 100% WebView)

---

## 1. 앱 구조 (App Architecture)

### 1.1 채택 전략: **하이브리드 (WebView-First → 점진적 네이티브)**

처음부터 모든 화면을 네이티브로 다시 만들지 않는다. 이유:
- 웹이 **이미 모든 비즈니스 로직/DB/결제/관리자**를 가지고 있고 활발히 개발 중이다.
- 앱에서 화면을 네이티브로 복제하면 **웹과 앱이 영원히 두 벌씩 유지보수**되는 지옥이 열린다.
- 앱의 진짜 가치는 "화면을 다시 그리는 것"이 아니라 **웹이 못 하는 것(푸시, 딥링크, 생체인증, 네이티브 UX)**이다.

따라서 3계층으로 나눈다:

```
┌───────────────────────────────────────────────────────────┐
│  Layer 3 — 네이티브 전용 화면 (Native Screens)              │
│  · 앱 잠금(생체인증) · QR 스캐너 · 푸시 알림 센터            │
│  · 카메라 프로필 촬영 · (선택) 지도 네이티브화              │
├───────────────────────────────────────────────────────────┤
│  Layer 2 — 브릿지 (JS Bridge, 양방향)                       │
│  웹 ⇄ 네이티브 postMessage 프로토콜                          │
│  · haptic · push-token · deeplink · share · biometric · qr  │
├───────────────────────────────────────────────────────────┤
│  Layer 1 — WebView 쉘 (기존 웹 전체)                        │
│  bohummap.com — 회원가입/검색/등록/결제/채팅/관리자 등       │
└───────────────────────────────────────────────────────────┘
```

### 1.2 네비게이션

- **초기 단계**: 지금처럼 단일 WebView. 네이티브 화면은 **모달/오버레이**로 띄운다(QR 스캐너, 앱 잠금 등). 별도 라우터 불필요.
- **확장 단계**: 네이티브 화면이 3개 이상 되면 **Expo Router**(파일 기반 라우팅) 도입. WebView는 `app/(web)/index.tsx` 같은 하나의 라우트로 두고, 네이티브 화면을 형제 라우트로 추가.

> 지금 당장 Expo Router로 갈아엎지 않는다. 네이티브 화면이 늘어나는 시점(Phase 3)에 도입한다.

### 1.3 상태 관리

- 앱은 얇게 유지 → 전역 상태는 최소. 대부분의 상태는 **웹(WebView) 안에** 있다.
- 네이티브 쪽 상태(푸시 토큰, 생체인증 잠금 여부, 온보딩 플래그)는 **`AsyncStorage` + React 로컬 state**로 충분. Redux/Zustand 불필요.

---

## 2. 폴더 구조 (Folder Structure)

현재는 루트에 평평하게 있다(`App.tsx`, `components/`). 기능이 늘어나기 전에 아래로 정리한다.

```
insurance-community-mobile/
├── app.json                 # Expo 설정 (앱 이름/아이콘/권한/플러그인)
├── eas.json                 # EAS 빌드/제출 설정
├── App.tsx                  # 루트 (얇게 유지 — 조립만)
├── index.ts                 # registerRootComponent
│
├── src/
│   ├── config/
│   │   ├── constants.ts     # APP_URL, APP_HOST, OAUTH_RETURN_URL, 스킴 등
│   │   └── env.ts           # 환경별 설정 (dev/prod)
│   │
│   ├── webview/
│   │   ├── WebShell.tsx     # WebView 래퍼 (현재 MainScreen의 WebView 부분)
│   │   ├── injected.ts      # WebView에 주입할 JS (브릿지 초기화)
│   │   └── navigation.ts    # shouldOpenExternally / isAppDomain 등 URL 판별
│   │
│   ├── bridge/              # ⭐ 웹 ⇄ 네이티브 통신 핵심
│   │   ├── protocol.ts      # 메시지 타입 정의 (단일 소스, 웹과 공유할 스펙)
│   │   ├── handlers/
│   │   │   ├── haptic.ts
│   │   │   ├── push.ts      # 푸시 토큰 등록/전달
│   │   │   ├── share.ts     # 네이티브 공유 시트
│   │   │   ├── biometric.ts # 생체인증 요청
│   │   │   ├── qr.ts        # QR 스캔 요청/결과
│   │   │   └── deeplink.ts
│   │   └── useBridge.ts     # onMessage 라우터 훅
│   │
│   ├── native-screens/      # 네이티브 전용 화면
│   │   ├── AppLock.tsx      # 생체인증 잠금
│   │   ├── QrScanner.tsx
│   │   └── NotificationCenter.tsx
│   │
│   ├── features/
│   │   ├── auth/            # OAuth Custom Tab 로직
│   │   ├── push/            # expo-notifications 설정/핸들러
│   │   ├── deeplink/        # expo-linking 라우팅
│   │   └── offline/         # netinfo
│   │
│   ├── components/          # 재사용 UI
│   │   ├── AnimatedSplash.tsx   (기존 이동)
│   │   ├── Onboarding.tsx       (기존 이동)
│   │   └── OfflineBanner.tsx
│   │
│   ├── hooks/               # useBackHandler, useAppState 등
│   └── utils/               # storage, logger 등
│
├── assets/                  # 아이콘/스플래시 (현재 유지)
└── docs/
    ├── MOBILE_APP_MASTER_PLAN.md   (이 문서)
    └── BRIDGE_PROTOCOL.md          # 웹팀과 공유할 브릿지 스펙 (계약서)
```

> **마이그레이션 원칙**: 한 번에 옮기지 않는다. 새 기능(푸시 등)을 추가할 때 해당 폴더부터 만들고, 기존 `App.tsx`는 브릿지 라우터만 분리하는 정도로 점진 리팩터링.

---

## 3. 사용 기술 (Tech Stack)

### 3.1 현재 유지 (변경 없음)

| 영역 | 기술 |
|---|---|
| 런타임 | Expo SDK 57 (Managed / CNG), React Native 0.86, React 19 |
| 언어 | TypeScript |
| 웹뷰 | `react-native-webview` |
| 빌드/배포 | EAS Build + EAS Submit |
| 저장소 | `@react-native-async-storage/async-storage` |

### 3.2 신규 추가 예정 (모두 Expo SDK 57 공식 모듈)

| 기능 | 라이브러리 | 비고 |
|---|---|---|
| **푸시 알림** | `expo-notifications` | Expo Push Service 사용 (FCM/APNs 추상화) |
| **딥링크** | `expo-linking` (이미 의존성 존재) | 스킴 + Universal/App Links |
| **생체인증** | `expo-local-authentication` | Face ID / 지문 / 패턴 |
| **QR 스캔** | `expo-camera` (바코드 스캐닝 내장) | 별도 바코드 라이브러리 불필요 |
| **QR 생성** | `react-native-qrcode-svg` + `react-native-svg` | 명함/프로필 QR |
| **공유** | `expo-sharing` (이미 의존성 존재) | 네이티브 공유 시트 |
| **보안 저장** | `expo-secure-store` | 생체인증 잠금 상태 등 민감 플래그 |
| **앱 상태** | `expo-application`, `AppState` (RN) | 백그라운드 복귀 시 잠금 트리거 |

> ⚠️ 모든 버전은 반드시 `npx expo install <pkg>`로 설치해 **SDK 57 호환 버전**을 받는다. `npm install`로 임의 버전을 넣지 않는다. 코드 작성 전 반드시 https://docs.expo.dev/versions/v57.0.0/ 의 해당 모듈 문서를 확인한다 (AGENTS.md 규칙).

### 3.3 도입하지 않을 것 (의도적 배제)

- ❌ **Redux/MobX** — 앱이 얇아서 과함
- ❌ **네이티브 화면 전면 재작성** — 웹과 이중 유지보수 발생
- ❌ **별도 지도 SDK(초기)** — 웹의 지도가 이미 동작. 네이티브 지도는 Phase 4에서 성능 이슈 확인 후 결정
- ❌ **Flutter** — 아래 4번 참조

---

## 4. React Native vs Flutter 추천

### ✅ 결론: **React Native (Expo) 유지 — 재고의 여지 없음**

| 기준 | React Native (Expo) | Flutter |
|---|---|---|
| **현재 코드 재사용** | 100% (이미 구축됨) | 0% (전면 재작성) |
| **웹 통합(WebView 브릿지)** | 최상 — 웹과 같은 JS/TS 생태계 | WebView 지원은 되나 브릿지 DX 열세 |
| **웹팀과의 언어 통일** | TypeScript 단일 언어 → 브릿지 스펙/타입 공유 가능 | Dart 별도 학습, 타입 공유 불가 |
| **Expo 생태계** | 푸시/카메라/생체인증/OTA 등 배터리 포함 | 개별 패키지 조합 필요 |
| **OTA 업데이트** | EAS Update (JS 즉시 배포) | Shorebird 등 별도/유료 |
| **채용/유지보수** | 웹 개발자가 바로 투입 가능 | Dart 인력 별도 |

**핵심 논리**: 보험맵의 앱은 "웹을 감싸고 네이티브 기능을 얹는" 하이브리드다. 이 전략에서 **웹과 앱이 같은 언어(TS)를 쓰는 것**은 결정적 이점이다. 브릿지 프로토콜 타입 하나를 웹/앱이 공유하고, 웹 개발자가 앱 코드를 읽고 협업할 수 있다. Flutter는 이 시나리오에서 얻는 게 없고 잃는 게 많다.

또한 **이미 SDK 57로 Play Store 출시 준비까지 끝난 상태**를 버리는 것은 비합리적이다.

---

## 5. 웹 API 재사용 방식 (Web API Reuse)

### 5.1 대원칙: **API를 직접 호출하지 않는다**

앱은 웹의 REST/Supabase API를 **직접 부르지 않는다.** 대신 **WebView가 웹을 통째로 로드**하고, 웹이 자기 API를 호출한다. 이유:
- 웹이 인증/세션/결제/권한 로직을 이미 다 처리한다.
- 앱이 API를 직접 부르면 인증 토큰 관리, CORS, 버전 스큐 등 문제가 앱에도 복제된다.
- 웹은 계속 바뀌는데 앱이 API를 하드코딩하면 매번 깨진다.

```
┌──────────┐   loads    ┌────────────────┐  calls  ┌──────────┐
│  앱      │──────────▶│ bohummap.com    │───────▶│ Supabase │
│ (WebView)│           │ (웹이 API 담당)  │        │ / API    │
└──────────┘           └────────────────┘         └──────────┘
     ▲                        │
     └── postMessage 브릿지 ───┘  (네이티브 기능만 앱이 담당)
```

### 5.2 세션/인증 공유

- WebView가 `sharedCookiesEnabled` + `domStorageEnabled`로 **쿠키/localStorage를 유지** → 웹 로그인 세션이 그대로 앱에 유지됨 (이미 구현).
- Google OAuth만 Custom Tab 우회 (이미 구현).

### 5.3 앱이 API를 "직접" 써야 하는 유일한 경우: **푸시 토큰 등록**

푸시는 앱에서만 얻을 수 있는 토큰(Expo Push Token)을 서버에 저장해야 한다. 이건 WebView로 해결 안 된다. 두 가지 옵션:

- **옵션 A (권장)**: 앱이 푸시 토큰을 얻어 → **브릿지로 웹에 전달** → 웹이 자기 API로 Supabase에 저장. → 앱은 API를 몰라도 됨. 웹팀이 저장 엔드포인트만 만들면 됨.
- 옵션 B: 앱이 Supabase에 직접 upsert. → 앱이 Supabase 키/스키마를 알아야 함. 결합도 상승. **비권장.**

> **웹팀 협업 필요 지점**: "푸시 토큰 수신 → 저장" 엔드포인트(또는 웹 내 JS 함수) 1개. 이것이 웹팀에 요청할 거의 유일한 것.

---

## 6. Supabase 연동 방식

### 6.1 원칙: **앱은 Supabase를 직접 다루지 않는다 (거의)**

인증/DB/스토리지 접근은 전부 웹(WebView) 안에서 일어난다. 앱은 Supabase 클라이언트를 **번들하지 않는 것을 기본**으로 한다.

### 6.2 인증 흐름 (현재 구현)

```
[웹] Supabase auth/v1/authorize 요청 시작
        │
        ▼
[앱] onShouldStartLoadWithRequest가 감지 → return false (WebView 로드 차단)
        │
        ▼
[앱] WebBrowser.openAuthSessionAsync(authorizeUrl, "boheommap://auth-callback")
        │  (구글 로그인은 시스템 브라우저 = Custom Tab에서)
        ▼
[앱] 콜백 URL 수신 → APP_URL/auth/callback 으로 치환 → WebView에 주입
        │
        ▼
[웹] /auth/callback 에서 세션 코드 교환 (웹의 기존 로직 재사용)
```

### 6.3 푸시 토큰 저장 (신규, 옵션 A 채택)

- 앱: `expo-notifications`로 Expo Push Token 획득
- 앱 → 웹: `postMessage({ type: 'push-token', token, platform })`
- 웹: 로그인된 사용자의 Supabase row에 토큰 upsert (웹팀 구현)
- 서버(웹 백엔드 or Edge Function): 알림 이벤트 발생 시 Expo Push API로 발송

> 앱에 Supabase 키를 넣지 않으므로, 키 노출/RLS 우회 리스크가 없다.

### 6.4 예외 (Supabase Realtime 직접 연결)

채팅을 **네이티브 화면으로 전환**하는 Phase(선택)에서만 앱이 Supabase Realtime을 직접 붙인다. 그 전까지는 웹의 실시간 채팅을 그대로 쓴다 (7번 참조).

---

## 7. 실시간 채팅 구조

### 7.1 Phase 1~2 (권장 시작점): **웹 채팅 그대로 + 푸시로 보강**

채팅 UI/로직은 이미 웹에 있다. 앱은 **다시 만들지 않는다.** 대신 앱의 약점(백그라운드일 때 새 메시지를 모름)을 푸시로 메운다.

```
새 메시지 발생 (Supabase Realtime / DB Trigger)
        │
        ▼
웹 백엔드 / Supabase Edge Function
        │
        ├─▶ [앱이 포그라운드] 웹 채팅 화면이 Realtime으로 즉시 표시 (기존 그대로)
        │
        └─▶ [앱이 백그라운드] Expo Push 발송 → 알림 탭 → 딥링크로 해당 대화방 진입
```

- 알림 탭 → `boheommap://chat/{roomId}` 딥링크 → WebView가 해당 채팅 URL로 이동.
- 이 방식이면 웹 채팅을 전혀 안 건드리고도 "네이티브 앱처럼 푸시 오는 채팅"이 완성된다.

### 7.2 Phase 4 (선택, 성능 최적화): 네이티브 채팅 화면

WebView 채팅의 스크롤/키보드/입력 UX가 부족하다고 판단되면, 채팅 **화면만** 네이티브로 전환:
- `expo-notifications` + Supabase Realtime(JS 클라이언트) 직접 연결
- 메시지 목록은 `FlashList`(고성능), 입력은 네이티브 키보드 처리
- 단, 이 경우에만 앱이 Supabase 스키마/RLS를 알아야 하므로 **웹팀과 스키마 계약 필요**

> 판단 기준: 실사용자 피드백에서 "채팅 입력/스크롤 답답함"이 반복되면 착수. 아니면 Phase 1 방식 유지.

---

## 8. 푸시 알림 구조 (Push Notifications)

가장 임팩트가 크고 우선순위가 높은 신규 기능.

### 8.1 아키텍처

```
┌────────────┐  1.토큰요청   ┌──────────────────┐
│    앱      │─────────────▶│  Expo Push       │
│(expo-      │◀─────────────│  Service         │
│ notifica-  │  Expo Token  └──────────────────┘
│ tions)     │                       ▲
└─────┬──────┘                       │ 4. 발송 요청
      │ 2. 토큰 전달(브릿지)          │  (to: ExponentPushToken[...])
      ▼                              │
┌────────────┐  3. 토큰 저장  ┌──────────────────────┐
│    웹      │─────────────▶│  Supabase (토큰 테이블) │
│ (WebView)  │              │  + 백엔드/Edge Function │
└────────────┘              └──────────────────────┘
                                     ▲
                         이벤트(채팅/문의/리크루팅/광고승인)
```

### 8.2 알림 종류 (보험맵 도메인)

| 알림 | 트리거 | 딥링크 |
|---|---|---|
| 새 채팅 메시지 | 상대가 메시지 전송 | `boheommap://chat/{roomId}` |
| 리크루팅 제안 | 지점이 설계사에게 제안 | `boheommap://recruiting/{id}` |
| 프로필 조회 알림 | 내 설계사 프로필 열람 | `boheommap://designer/{id}` |
| 광고/결제 승인 | 관리자 승인 | `boheommap://ads/{id}` |
| 지점 등록 승인 | 관리자 승인 | `boheommap://branch/{id}` |
| 공지/이벤트 | 관리자 브로드캐스트 | `boheommap://notice/{id}` |

### 8.3 구현 단계

1. `npx expo install expo-notifications`
2. `app.json`에 `expo-notifications` 플러그인 + 아이콘/색상 추가, Android 알림 채널 설정
3. iOS: APNs 키를 EAS credentials에 등록 / Android: FCM 서버 키를 EAS에 등록
4. 앱 시작 시 권한 요청 → `getExpoPushTokenAsync()` → 브릿지로 웹에 전달
5. 알림 수신/탭 핸들러 → `expo-linking`으로 딥링크 라우팅 → WebView 이동
6. 웹팀: 토큰 저장 엔드포인트 + 이벤트별 Expo Push 발송 로직(백엔드/Edge Function)

### 8.4 포그라운드/백그라운드 처리

- 포그라운드: `setNotificationHandler`로 배너 표시 여부 결정 (채팅방을 보고 있으면 그 방 알림은 억제)
- 백그라운드/종료: OS가 알림 표시 → 탭 시 딥링크 처리

> **웹팀 협업 필요**: (1) 토큰 저장 API, (2) 이벤트별 발송 트리거. 앱은 토큰 획득/전달 + 수신/라우팅만 담당.

---

## 9. 앱 전용 기능 (Native-Only Features)

WebView로는 불가능하거나 열등한, 앱만의 가치.

| # | 기능 | 라이브러리 | 사용자 가치 | 우선순위 |
|---|---|---|---|---|
| 1 | **푸시 알림** | expo-notifications | 채팅/리크루팅 실시간 도달 (재방문 핵심) | ⭐⭐⭐ |
| 2 | **딥링크/공유** | expo-linking, expo-sharing | 설계사/지점 프로필을 카톡으로 공유 → 탭하면 앱 해당 화면 | ⭐⭐⭐ |
| 3 | **생체인증 앱 잠금** | expo-local-authentication, expo-secure-store | 영업 기밀(고객 DB, 연봉 인증) 보호 → 신뢰 | ⭐⭐ |
| 4 | **QR 명함** | expo-camera(스캔), qrcode-svg(생성) | 대면 미팅에서 내 프로필 QR로 즉시 교환 | ⭐⭐ |
| 5 | **네이티브 카메라 프로필** | expo-camera / expo-image-picker | 프로필/명함 사진 즉석 촬영·업로드 | ⭐ |
| 6 | **햅틱** | expo-haptics | 세밀한 촉각 피드백 (이미 구현) | ✅ |
| 7 | **GPS 정밀 위치** | expo-location | 내 주변 GA 지점 (이미 구현, 정밀도 개선 여지) | ✅ |
| 8 | **OTA 업데이트** | expo-updates (EAS Update) | 심사 없이 JS 즉시 배포 | ⭐⭐ |
| 9 | **앱 아이콘 뱃지** | expo-notifications | 안 읽은 알림 수 표시 | ⭐ |

### 9.1 딥링크 + 공유 상세 (앱의 바이럴 엔진)

- 설계사가 자기 프로필 화면에서 "공유" → `expo-sharing`으로 `https://bohummap.com/designer/{id}` 링크 공유
- **App Links(Android) / Universal Links(iOS)** 설정 → 그 링크를 앱 설치자가 탭하면 웹이 아니라 **앱이 열리고 해당 프로필로 진입**
- 미설치자는 웹으로 → 웹에 "앱 설치" 유도 배너 (웹팀과 협의, 단 웹 수정은 웹팀이)

### 9.2 생체인증 앱 잠금 상세

- 앱 백그라운드 → 포그라운드 복귀 시(`AppState`), 마지막 잠금 후 N분 경과면 생체인증 요구
- 인증 실패/취소 시 WebView 위에 잠금 오버레이 유지
- 설정 on/off는 `expo-secure-store`에 저장

---

## 10. 개발 일정 (Roadmap)

> 각 Phase는 독립 릴리스 가능. WebView 쉘은 항상 동작하므로 언제든 스토어 배포 가능.

### Phase 0 — 안정화 & 기반 정비 (1주)
- [ ] 폴더 구조 정리(2번) — `App.tsx`에서 브릿지 라우터 분리
- [ ] `docs/BRIDGE_PROTOCOL.md` 작성 → **웹팀과 브릿지 계약 합의**
- [ ] iOS 빌드 파이프라인 점검 (현재 Android 위주 → iOS credentials/APNs 준비)
- [ ] EAS Update(OTA) 설정

### Phase 1 — 푸시 알림 (2주) ⭐ 최우선
- [ ] expo-notifications 통합, 권한/채널/토큰 획득
- [ ] 브릿지로 토큰 전달 → **웹팀: 토큰 저장 API**
- [ ] 딥링크 라우팅(expo-linking) — 알림 탭 → WebView 이동
- [ ] **웹팀: 이벤트별 Expo Push 발송** (채팅 우선)
- [ ] 내부 테스트(EAS preview APK)

### Phase 2 — 딥링크 & 공유 (1.5주)
- [ ] App Links / Universal Links 설정 (도메인 검증 파일은 웹팀이 호스팅)
- [ ] `boheommap://` + `https://bohummap.com/*` → 앱 라우팅
- [ ] 네이티브 공유 시트(expo-sharing) 브릿지
- [ ] 공유 → 설치 유도 플로우

### Phase 3 — 보안 & QR (2주)
- [ ] 생체인증 앱 잠금(expo-local-authentication + secure-store + AppState)
- [ ] QR 스캐너(expo-camera) + QR 생성(qrcode-svg)
- [ ] 네이티브 화면이 늘어나므로 **Expo Router 도입** 검토
- [ ] 네이티브 카메라 프로필 촬영(선택)

### Phase 4 — 최적화 & 선택적 네이티브화 (지속)
- [ ] 성능 계측 → 필요 시 채팅/지도만 네이티브 전환
- [ ] 앱 아이콘 뱃지, 알림 센터
- [ ] iOS App Store 정식 출시

### 즉시 착수 권장: **Phase 0 → Phase 1(푸시)**
푸시가 앱의 재방문율을 가장 크게 끌어올리며, 웹으로는 불가능한 대표 기능이다.

---

## 11. 웹과 충돌 없이 병렬 개발하는 방법

웹과 앱은 **서로 다른 저장소**이고, 접점은 **오직 두 곳**뿐이다: ① WebView가 로드하는 URL, ② postMessage 브릿지. 이 접점을 계약으로 고정하면 충돌은 0에 수렴한다.

### 11.1 물리적 분리 (이미 확보됨)
- 앱 저장소: `insurance-community-mobile` (이 repo)
- 웹 저장소: 별도 (다른 Claude 담당)
- **앱 담당(나)은 웹 저장소를 절대 커밋하지 않는다.**

### 11.2 브릿지 계약 (Contract-First)
`docs/BRIDGE_PROTOCOL.md`를 **단일 진실**로 둔다. 웹/앱 양쪽이 이 스펙만 지키면 서로의 내부 구현을 몰라도 된다.

```ts
// BRIDGE_PROTOCOL.md 예시 — 웹 → 앱
type WebToApp =
  | { type: 'haptic'; style: 'light'|'medium'|'success'|'error'|'selection' } // 구현됨
  | { type: 'share'; url: string; title?: string }
  | { type: 'request-biometric' }
  | { type: 'open-qr-scanner' }
  | { type: 'set-badge'; count: number };

// 앱 → 웹 (WebView.injectJavaScript로 window.__boheom.onNativeEvent 호출)
type AppToWeb =
  | { type: 'push-token'; token: string; platform: 'ios'|'android' }
  | { type: 'qr-result'; value: string }
  | { type: 'biometric-result'; ok: boolean }
  | { type: 'deeplink'; path: string };
```

- 스펙 변경은 **버전 필드**(`v`)를 붙여 하위 호환 유지 → 구버전 앱도 안 깨짐.
- 웹이 새 브릿지 기능을 호출해도, 구버전 앱은 **모르는 메시지를 조용히 무시**(현재 `handleWebMessage`가 이미 그렇게 동작).

### 11.3 웹 변경이 앱을 깨지 않게 하는 방어선
- 앱은 웹의 **DOM/CSS/셀렉터에 의존하지 않는다** (JS 주입 최소화). URL 경로와 postMessage만 의존.
- 웹의 URL 구조가 바뀌면 딥링크가 영향받으므로, **딥링크 경로 목록**을 브릿지 문서에 함께 관리하고 웹팀과 공유.
- WebView 로드 실패/에러 대비: 오프라인 배너(구현됨) + 향후 에러 바운더리.

### 11.4 협업 인터페이스 (웹팀에 요청할 것 — 총 3가지)
1. **푸시 토큰 저장** 엔드포인트/함수 (Phase 1)
2. **이벤트별 Expo Push 발송** 로직 (Phase 1)
3. **App/Universal Links 도메인 검증 파일** 호스팅 — `/.well-known/assetlinks.json`(Android), `/.well-known/apple-app-site-association`(iOS) (Phase 2)

이 3가지 외에는 웹팀에 의존하지 않고 앱을 독립적으로 발전시킬 수 있다.

### 11.5 릴리스 독립성
- 웹: 서버 배포(즉시 반영) — 앱은 WebView라 자동 최신
- 앱: 스토어 심사 or **EAS Update(OTA)**로 JS 즉시 배포
- 두 배포 주기가 독립적 → 서로를 기다리지 않음

---

## 부록 A. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| 스토어 심사에서 "웹뷰 껍데기" 거부 (특히 Apple) | 푸시/생체인증/QR/카메라 등 **네이티브 기능을 실제로 제공**해 순수 래퍼가 아님을 입증 (Phase 1~3의 목적이기도 함) |
| 웹 URL 구조 변경으로 딥링크 파손 | 브릿지 문서에 딥링크 경로 계약 명시, 웹팀과 변경 시 공유 |
| SDK 57 → 상위 마이그레이션 | Expo 업그레이드 가이드 준수, EAS로 회귀 테스트 |
| 푸시 미도달(토큰 만료 등) | 토큰 갱신 리스너 + 앱 재실행 시 재등록 |
| iOS 미출시(현재 Android 위주) | Phase 1부터 iOS credentials 병행 준비 |

## 부록 B. 다음 액션 (이 문서 승인 후)
1. 이 플랜 리뷰 & 우선순위 확정
2. `docs/BRIDGE_PROTOCOL.md` 초안 작성 → 웹팀 공유
3. Phase 0 착수 (폴더 정리 + OTA + iOS 파이프라인)
4. Phase 1 (푸시) 개발 시작

> **이 문서는 설계 산출물이며, 코드 변경은 포함하지 않는다.** 실제 구현은 각 Phase 승인 후, 반드시 https://docs.expo.dev/versions/v57.0.0/ 문서를 확인하고 진행한다.
