# 보험맵 APP 가이드북 (CTO 온보딩)

> 대상: 보험맵 프로젝트의 **CTO 역할 Claude**. 이 문서 하나로 모바일 앱 전체를 파악하도록 만든 **진입점**이다.
> 작성/기준: 2026-08-06 · 최신 커밋 `5a03511` · versionCode 5 (Play 알파 검토 중)
> 원칙 요약: **웹은 절대 수정하지 않는다. 앱(WebView 셸 + 네이티브)만 다룬다.**

---

## 0. 30초 요약 (TL;DR)

- **보험맵**은 보험설계사·보험대리점(GA)을 잇는 플랫폼. 웹(bohummap.com)이 본체이고, **앱은 그 웹을 감싼 하이브리드 WebView 셸 + 네이티브 기능**이다.
- 스택: **Expo SDK 57 (Managed/CNG) + React Native 0.86 + TypeScript**. 저장소: `github.com/supermanbohum/insurance-map-mobile` (로컬 `C:\Dev\insurance-community-mobile`).
- **앱에는 데이터 계층이 없다** — Supabase 클라이언트/API/Mock 전부 없음. 모든 데이터는 WebView가 로드하는 운영 웹이 처리.
- 앱이 하는 일 = **네이티브 이점**: 딥링크·공유·생체인증·QR·푸시·스플래시/아이콘 브랜딩·안정성.
- 현재: Phase 0/1 완료(브릿지+6개 네이티브 기능), Play 알파 출시됨, **V2 진행 중**(스플래시·아이콘 리뉴얼 완료).

---

## 1. 아키텍처 — 반드시 잡아야 할 멘탈 모델

```
┌───────────────────────────────────────────────┐
│  네이티브 셸 (이 저장소, Expo/RN)                │
│   · 스플래시/온보딩/오프라인/에러/토스트          │
│   · 딥링크·공유·생체인증·QR·푸시·햅틱             │
│  ┌─────────────────────────────────────────┐  │
│  │  window.__boheom 브릿지 (postMessage)     │  │
│  │  웹 ⇄ 앱 유일한 통신 채널                  │  │
│  ├─────────────────────────────────────────┤  │
│  │  WebView → https://bohummap.com (운영)    │  │
│  │  회원가입·로그인·검색·등록·결제·채팅·관리자  │  │
│  │  = 전부 웹이 구현, 앱은 표시만              │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

- 앱과 웹의 접점은 **오직 2개**: ① WebView가 로드하는 URL, ② `postMessage` 브릿지.
- 이 경계만 지키면 웹/앱은 서로 독립적으로 개발·배포 가능하다.
- **앱은 운영(production)에 직결**되어 있다(`APP_URL = https://bohummap.com`). 별도 테스트/스테이징 환경 없음 → **알파 테스터의 등록/업로드는 실제 운영 데이터**(단, 지점/설계사 등록은 관리자 승인 큐를 거쳐 공개됨).

---

## 2. 절대 규칙 (위반 금지)

1. **웹 저장소(`C:\Dev\Recovery\insurance-community-backup`, Next.js)와 `supabase/migrations`를 절대 수정하지 않는다.** 스키마/RPC가 필요하면 웹 담당(별도 Claude)에게 요청.
2. 앱 번들에 **`SUPABASE_SERVICE_ROLE_KEY` 금지.** 애초에 앱은 Supabase 클라이언트를 갖지 않는다.
3. **DB 쓰기는 전부 웹의 RPC로만** (앱은 직접 쓰지 않음). 앱이 서버에 남기는 유일한 데이터 = 푸시 토큰(브릿지→웹 `register_push_token`).
4. **신규 라이브러리는 사전 보고 후 설치** — (왜 필요/대체 가능성/유지보수 영향). 우선순위: RN코어 > 기존설치 > Expo공식SDK > 신규.
5. **모든 앱 작업은 Android/iOS 둘 다 정상 동작**하도록. 플랫폼 차이는 미리 고지.
6. 회원 판단은 **익명세션(auth.uid) ≠ 회원**. 실제 프로필 행 + `is_full_member()` 기준(웹 로직). 카카오/구글 로그인 = 탐색 전용.

> 상세 근거: [BACKEND_INTEGRATION_RULES.md](BACKEND_INTEGRATION_RULES.md), [APP_DEVELOPER_GUIDE.md](APP_DEVELOPER_GUIDE.md)

---

## 3. 저장소 구조

```
App.tsx                     # 루트 오케스트레이터(WebView + 모든 오버레이 조립)
index.ts                    # registerRootComponent (Expo 엔트리)
app.json / eas.json         # Expo 설정 / EAS 빌드 프로필
assets/                     # icon.png(브랜드 아이콘) 등
src/
├── config/
│   ├── constants.ts        # APP_URL, 스킴, 스토리지키, EAS_PROJECT_ID, 스플래시 타이밍
│   └── theme.ts            # 색상 토큰
├── bridge/                 # ⭐ 웹↔앱 통신
│   ├── protocol.ts         # WebToApp/AppToWeb 타입 + parseWebMessage
│   ├── injected.ts         # window.__boheom 설치 스크립트(주입)
│   ├── capabilities.ts     # 앱이 광고하는 기능 목록
│   ├── handlers.ts         # haptic/toast
│   └── useBridge.ts        # 메시지 라우터 + emitToWeb + sendReady
├── webview/navigation.ts   # URL 판별(외부링크/OAuth/앱도메인)
├── features/
│   ├── auth/oauth.ts       # 구글 Custom Tab 우회
│   ├── deeplink/           # resolve.ts + useDeepLinks.ts
│   ├── biometric/          # biometric.ts + lockPreference.ts + useAppLock.ts
│   ├── push/               # push.ts + usePush.ts
│   ├── share/share.ts
│   └── media/download.ts
├── components/             # AnimatedSplash, Onboarding, OfflineScreen, ErrorScreen,
│                           #   LoadingBar, ToastHost, AppLockScreen, QrScannerScreen
└── utils/                  # storage, logger, haptics, toast
```

---

## 4. 웹 ⇄ 앱 브릿지 (핵심 API)

- 설치: `injectedJavaScriptBeforeContentLoaded`로 웹 컨텍스트에 `window.__boheom` 주입.
- 웹 → 앱: `window.__boheom.send({type,...})` → WebView `onMessage` → `useBridge` 라우터.
- 앱 → 웹: `emitToWeb(...)` → `window.__boheom.onNativeEvent(...)` → 웹이 `__boheom.on(cb)`/`addEventListener('boheom:native')`로 수신.
- **핸드셰이크**: WebView 로드 완료 시 `ready`(platform, appVersion, capabilities) 전송 → 웹이 "앱 모드" 인지.
- 현재 **capabilities**: `haptic, deeplink, share, biometric, qr-scan, push, badge`.
- 규칙: 모든 메시지 JSON + `type`/`v`. **모르는 type은 조용히 무시**(하위/상위 호환).

> 전체 메시지 규격: [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md)

---

## 5. 현재 기능 현황

**완료 (main 반영)**
| 영역 | 상태 |
|---|---|
| WebView 셸 + 세션유지 + 구글 OAuth(Custom Tab) | ✅ |
| Bridge 기반 + ready/capabilities 핸드셰이크 | ✅ (Phase 0) |
| 딥링크(스킴 + 유니버설링크 앱측) | ✅ |
| Native Share / 생체인증 앱잠금 / QR 스캐너 | ✅ |
| 앱 UX: 로딩바·에러/재시도·인앱토스트·햅틱 | ✅ |
| Push(토큰→웹, 알림탭→딥링크, 뱃지) | ✅ |
| 오프라인 시 WebView 유지(폼 데이터 손실 방지) | ✅ |
| iOS 뒤로/앞으로 스와이프 제스처 | ✅ |
| **V2: 프리미엄 스플래시(로고→태그라인→보험맵)** | ✅ |
| **V2: 스카이블루 아이콘(검정 matte 제거·불투명)** | ✅ |

**V2 나머지 = 대부분 웹** (로그인 개선/열람 팝업/메뉴명/파트너스/TOP설계사 메뉴 등은 WebView 자동 반영). 앱측 남은 것: 간편로그인(Google) 제거(웹이 내린 뒤 앱 OAuth 코드 정리).

**V3 = 전부 웹** (TOP설계사 인증/연봉랭킹/명예전당/공식인증/OCR). 앱은 표시만.

> 로드맵 상세: [APP_FEATURE_ROADMAP.md](APP_FEATURE_ROADMAP.md) · 아이디어풀: [INSURANCE_APP_IDEAS.md](INSURANCE_APP_IDEAS.md)

---

## 6. 빌드 & 릴리스

- **Managed/CNG**: `android/` `ios/` 폴더 없음(gitignore). 네이티브는 빌드 시 생성 → **gradle 직접 빌드 불가, EAS 사용.**
- 프로필(eas.json): **`preview` = APK**(내부 테스트/공유용), **`production` = AAB**(Play 업로드), production `autoIncrement: true`.
- versionCode: 현재 **5**(Play 알파). 다음 production 빌드 시 자동 6.
- 명령:
  - APK: `eas build -p android --profile preview`
  - AAB: `eas build -p android --profile production`
- 서명: EAS가 키스토어 자동 관리(Play App Signing 호환).
- ⚠️ **이 개발 환경(현재 세션 머신)에서는 빌드 불가**: JDK/Android SDK 없음, eas-cli 미설치, EAS는 사용자 Expo 계정 인증 필요. → **빌드는 사용자(오너)가 직접 실행.** 코드/설정 준비까지만 담당.
- Play 출시 준비 체크리스트/제출 콘텐츠(Data Safety, Content Rating, 리스팅 텍스트): [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md)

---

## 7. 개발 워크플로우 (지켜온 규칙)

1. 기능 하나 = **구현 → 검증(tsc/expo-doctor, 순수로직 단위테스트) → 커밋 → Push** → 다음.
2. **main 직커밋**(1인+AI 협업, feature 브랜치 미사용).
3. Conventional commit: `feat(app):`, `fix(app):`, `chore(app):`, `refactor(app):`, `docs(app):`.
4. 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. 검증 수단: `npx tsc --noEmit`(항상), `npx expo-doctor`(의존성/릴리스), 순수 함수는 컴파일해 node 단위테스트. 디바이스가 없어 네이티브 동작은 사용자 실기기 확인.
6. 배포 가능 상태 상시 유지.

---

## 8. 알려진 이슈 / 대기 작업

| 항목 | 내용 | 담당 |
|---|---|---|
| **iOS 아이콘 원본** | 현재 icon.png는 사용자가 준 파일의 검정 matte를 제거해 full-bleed 불투명으로 정리함. 원본이 검정배경 export였음. iOS는 정상 동작하나, 더 완벽히 하려면 처음부터 full-bleed 원본 권장 | 앱 |
| **간편로그인(Google) 제거** | 웹이 Google 로그인 내린 뒤 앱의 OAuth 우회 코드(oauth.ts/navigation.ts/App.tsx) 정리. 순서 주의(웹 먼저) | 앱+웹 |
| **Privacy Policy URL** | Play 필수(민감권한). 웹 `/privacy` 필요 | 웹 |
| **UGC 모더레이션** | 채팅/프로필 신고·차단·약관 — Play 정책 | 웹 |
| **FCM 키** | 실제 푸시 발송에 EAS credentials 등록 필요 | 오너 |
| **유니버설 링크 `.well-known`** | assetlinks.json / apple-app-site-association 호스팅 | 웹 |
| **스테이징 빌드 분리** | 테스터가 운영 데이터 안 건드리게 APP_URL 분리 빌드(선택) | 앱 |
| **Play 리스팅 에셋** | 스크린샷/피처그래픽/512아이콘 | 오너 |

---

## 9. 문서 지도 (전체 인덱스)

| 문서 | 역할 |
|---|---|
| **APP_CTO_GUIDEBOOK.md** (이 문서) | CTO 온보딩 진입점 |
| [MOBILE_APP_MASTER_PLAN.md](MOBILE_APP_MASTER_PLAN.md) | 아키텍처/기술/전략 마스터 |
| [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md) | 웹↔앱 postMessage 전체 규격 |
| [BACKEND_INTEGRATION_RULES.md](BACKEND_INTEGRATION_RULES.md) | 공용 Supabase 연동 준수 규칙 |
| [APP_DEVELOPER_GUIDE.md](APP_DEVELOPER_GUIDE.md) | 웹팀 인수인계 원문 + 앱 현황 부록 |
| [APP_FEATURE_ROADMAP.md](APP_FEATURE_ROADMAP.md) | v1.0~v3.0 기능 로드맵 |
| [APP_UI_UX_GUIDE.md](APP_UI_UX_GUIDE.md) | 디자인 시스템 |
| [INSURANCE_APP_IDEAS.md](INSURANCE_APP_IDEAS.md) | 경쟁분석+차별화기능+수익모델 |
| [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md) | Play 출시 준비/제출 패키지 |
| [WEB_MASTER_ROADMAP.md](WEB_MASTER_ROADMAP.md) | 앱↔웹 요청/계약 동기화(앱측 관리) |
| `AGENTS.md` / `CLAUDE.md` | "Expo SDK 57 문서 먼저 읽어라" 규칙 |

---

## 10. CTO로서 첫 점검 포인트

1. **아키텍처 경계 이해**: 데이터 기능은 웹, 앱은 셸+네이티브. "앱에서 지점등록 만들자" 같은 요청은 웹 작업임을 인지.
2. **운영 직결 리스크**: 알파 테스트가 실운영 DB를 쓴다. 스테이징 분리 여부 결정 필요.
3. **출시 블로커(정책)**: Privacy Policy + Data Safety + UGC 모더레이션이 최우선(웹 협업).
4. **iOS 병행**: 지금까지 Android 중심 검증. iOS 실기기 검증 라인 확보 필요.
5. **의존성 게이트**: 신규 라이브러리는 보고 후. 현재 신규 = expo-local-authentication, expo-camera, expo-notifications, expo-linear-gradient (모두 Expo 공식).
6. **빌드 오너 의존**: 실제 빌드/업로드는 오너가 EAS로 실행. 코드/설정은 앱 담당이 배포 가능 상태로 유지.

---

## 11. 협업 구조

- **웹 담당 Claude**: `C:\Dev\Recovery\insurance-community-backup` (Next.js + 공용 Supabase). 앱 담당은 이 저장소를 **읽기만** 하고 수정하지 않는다.
- **앱 담당 Claude**: 이 저장소(모바일). 웹에 필요한 것은 [WEB_MASTER_ROADMAP.md](WEB_MASTER_ROADMAP.md)에 요청 정리.
- **CTO Claude(신규)**: 두 축을 조율하며 우선순위/정책/출시 결정. 실제 코드는 각 담당이, 결정·리뷰·경계 관리는 CTO가.

> 이 문서는 앱 담당이 유지한다. 큰 변화(새 기능/구조 변경/버전) 시 §5·§8·기준일을 갱신할 것.
