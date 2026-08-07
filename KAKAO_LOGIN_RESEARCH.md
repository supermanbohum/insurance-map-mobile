# 카카오 로그인 도입 조사 (A-004, 조사 전용)

> 작성: 2026-08-07 · 지시: CTO A-004(P2). **조사·보고만, 구현하지 않음.**
> 기준: Expo SDK 57 (https://docs.expo.dev/versions/v57.0.0/ 확인). 앱은 하이브리드 WebView 셸 + 웹(Supabase Auth) 위임 구조.
> 관련: [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md), [BACKEND_INTEGRATION_RULES.md](BACKEND_INTEGRATION_RULES.md)

## 배경
- 오너 전략: 인스타 광고 기반 유입 → **가입 퍼널 단축**이 핵심 → 카카오 로그인 도입 검토.
- 앱에는 이미 OAuth 우회 인프라(Custom Tab + `boheommap://auth-callback` 스킴 콜백)가 **유지**되어 있음(A-001 정정). 카카오는 이 흐름을 재사용 가능.
- 현재 웹 인증 주체 = Supabase Auth. 앱은 WebView가 웹 세션을 그대로 사용(앱은 인증 주체 아님).

## 확정 사항 (2026-08-07 오너 승인, CTO 통보)
- **카카오 로그인 도입 확정.** 카카오 사용자는 **정식 회원**(탐색 전용 아님). → 앱 문서의 "카카오/구글 = 탐색 전용" 서술은 낡음(정정 완료).
- 웹이 카카오 OAuth를 구현한다. **앱의 1차 목표 = WebView 안에서 웹 로그인 플로우가 깨지지 않게 하는 것.** 네이티브 카카오 SDK는 그 다음 판단(신규 의존성이므로 사전 보고 대상).
- A-004 우선순위 **P1로 격상**. 단, 구현은 웹 구현 확정 후 CTO 별도 지시.

## 🔑 핵심 검증: 카카오톡 앱 전환 → 복귀 경로
카카오톡 앱이 설치된 기기에서 로그인 시 **① 브라우저(Custom Tab/ASWebAuthSession) → ② 카카오톡 앱으로 전환(인증) → ③ 다시 우리 앱/WebView로 복귀** 흐름이 발생한다. **③ 복귀가 우리 WebView로 정확히 돌아오는지가 최대 리스크.**

- **흐름(옵션 ① 기준)**: 웹 `signInWithOAuth(kakao)` → 카카오 authorize(Custom Tab) → 카카오톡 앱 전환(`kakaotalk://`, 앱 `EXTERNAL_SCHEMES`가 처리) → 인증 후 카카오톡이 브라우저로 복귀 → Supabase `/auth/v1/callback` → `boheommap://auth-callback` → `openAuthSessionAsync` resolve → 앱이 웹 `/auth/callback` 주입 → 세션 확정.
- **Android**: Custom Tab에서 카카오톡 전환 후 복귀는 일반적으로 동작하나, 전환 왕복 시 Custom Tab 세션 유지가 기기/OS별로 불안정할 수 있음 → **실기기 검증 필요**.
- **iOS**: `ASWebAuthenticationSession`(openAuthSessionAsync)은 샌드박스 세션이라 **카카오톡 앱으로 나갔다 복귀할 때 세션이 안전하게 재개되지 않을 수 있음**(이 제약 때문에 카카오가 네이티브 SDK를 제공). → iOS 앱-투-앱 복귀가 최대 불확실성.
- **완화책(우선순위)**:
  1. (권고) 옵션 ①로 시작하되, **카카오톡 앱 전환이 불안정하면 "카카오 계정(웹) 로그인"**(앱 전환 없이 브라우저에서 아이디/비번 → 복귀)으로 폴백. 이 경로는 앱-투-앱 이슈가 없어 확실히 성공.
  2. 앱 전환 자동 복귀가 전략상 필수(카카오톡 원탭) → **옵션 ③(네이티브 SDK)** 로 iOS 앱-투-앱 처리. 신규 의존성·사전 보고 대상.
- **검증 체크리스트(웹 구현 후 실기기)**:
  · Android/iOS × (카카오톡 설치/미설치) 4조합에서 로그인 완료 + WebView 세션 확정 확인
  · 복귀 후 딥링크/뒤로가기 정상, 이중 로그인/무한 리다이렉트 없음
  · 취소(카카오톡에서 뒤로) 시 앱이 멈추지 않고 로그인 화면 복귀

## 옵션 비교

### ① 웹 카카오 OAuth를 WebView에서 사용 + 앱은 Custom Tab 전환/스킴 콜백만 (기존 인프라 재사용) — **권고**
- **메커니즘**: 웹이 `supabase.auth.signInWithOAuth({provider:'kakao'})` → 카카오 authorize URL → 앱 `isSupabaseAuthorizeUrl` 인터셉트 → `runOAuthAuthSession`(expo-web-browser Custom Tab) → 카카오 로그인 → `boheommap://auth-callback` 복귀 → 웹 `/auth/callback`에서 세션 확정. (Google에 쓰던 흐름과 동일, provider만 kakao)
- **카카오톡 앱 전환**: 카카오 authorize 페이지가 `kakaotalk://`/`intent://`로 앱 전환 시도 → 앱의 `EXTERNAL_SCHEMES`에 이미 `kakaotalk:`,`intent:` 포함 → `openExternally`가 처리(추가 작업 없음).
- **신규 의존성**: **없음**(expo-web-browser 기설치, 인프라 유지 중).
- **Android/iOS 차이**: Android=Custom Tab, iOS=ASWebAuthenticationSession(openAuthSessionAsync). ⚠️ iOS의 ASWebAuthenticationSession 안에서 카카오톡 "앱 전환" 로그인이 매끄러운지 **실기기 확인 필요**(제약 시 카카오 계정 웹 로그인으로 폴백).
- **카카오 콘솔 등록**: 웹 기준. **Redirect URI = Supabase 콜백** `https://<project-ref>.supabase.co/auth/v1/callback`, 카카오 JavaScript/REST 키. 앱 고유(키해시/네이티브키)는 **불필요**.
- **장점**: 앱 변경 거의 0(웹이 provider 켜면 동작), 웹 위임 아키텍처 일관, 유지보수 최소, 의존성 0.
- **단점**: 순수 네이티브 앱-투-앱보다 전환 UX가 한 단계 부드럽지 않을 수 있음(브라우저 경유). iOS 앱전환 제약 확인 필요.

### ② expo-auth-session 기반 (앱이 네이티브에서 직접 OAuth)
- **메커니즘**: 앱이 expo-auth-session(PKCE)으로 카카오 authorize에 직접 OAuth → 토큰 획득 → **Supabase 세션을 앱이 수립 후 WebView에 주입**해야 함.
- **신규 의존성**: `expo-auth-session` + `expo-crypto` (Expo 공식, **2개**, 사전 보고 대상).
- **Android/iOS 차이**: `makeRedirectUri` + 스킴(boheommap, 기보유). 문서상 큰 차이 없음. 내부적으로 WebBrowser 사용.
- **콘솔**: 카카오 REST 키 + Redirect URI(앱 스킴).
- **장점**: 앱 주도 제어.
- **단점**: **앱↔WebView 세션 이중화**(앱이 얻은 세션을 WebView에 주입·동기화 필요 → 복잡/버그 위험). 웹 위임 원칙과 어긋남. 의존성 2개. → 본 프로젝트에 **부적합**.

### ③ 네이티브 카카오 SDK (예: @react-native-seoul/kakao-login)
- **메커니즘**: 네이티브 카카오 SDK로 카카오톡 앱-투-앱 로그인(최상 UX) → 카카오 토큰 → Supabase에 전달해 세션 수립 → WebView 동기화 필요.
- **신규 의존성**: 네이티브 카카오 로그인 라이브러리(**비Expo, config plugin 필요, Expo Go 불가, 개발빌드 필요**). 사전 보고 + 유지보수 부담 큼.
- **Android/iOS 차이 큼**:
  · Android: 카카오 콘솔에 **키 해시**(릴리스 keystore SHA1→base64) 등록 필수, Android 11+ `<queries>`(카카오톡 패키지).
  · iOS: `Info.plist`에 `LSApplicationQueriesSchemes`(kakaokompassauth, kakaolink 등) + URL 스킴 `kakao{NATIVE_APP_KEY}` 등록. (config plugin으로 처리)
- **콘솔**: 네이티브 앱 키, Android 패키지 `com.bohummap.app`+키해시, iOS 번들ID `com.bohummap.app`+커스텀 스킴.
- **장점**: 카카오톡 원탭 전환 UX 최상.
- **단점**: 네이티브 신규 의존성 + config plugin + 세션 동기화 복잡 + 유지보수↑ + 웹 위임 아키텍처와 가장 이질적.

## 콘솔 등록값 요약
| 항목 | ① 웹 OAuth 재사용 | ② expo-auth-session | ③ 네이티브 SDK |
|---|---|---|---|
| 신규 의존성 | 없음 | expo-auth-session + expo-crypto | 네이티브 카카오 SDK(+plugin) |
| 카카오 앱 키 | JavaScript/REST(웹) | REST | **네이티브 앱 키** |
| Android 키해시 | 불필요 | 불필요 | **필수** |
| iOS 스킴/쿼리 | 불필요(스킴 기보유) | 스킴(기보유) | **LSApplicationQueriesSchemes+URL스킴** |
| Redirect URI | Supabase 콜백(웹) | 앱 스킴 | 앱 스킴/네이티브 |
| 세션 동기화 | 불필요(웹이 주체) | 필요 | 필요 |
| 앱 변경량 | 최소(≈0) | 중 | 큼 |

## 권고 (P1, 카카오 도입 확정 반영)
**1차 대응 = 옵션 ① (기존 OAuth 우회 인프라 재사용)로 웹 로그인 플로우를 WebView에서 보전.**
- 앱 1차 목표는 "웹의 카카오 로그인이 WebView에서 깨지지 않는 것" → 인프라 이미 유지 중(A-001)이므로 웹 구현 후 대부분 동작.
- 실기기에서 카카오톡 앱 전환→복귀 검증(위 체크리스트). iOS 앱-투-앱 복귀 불안정 시 "카카오 계정 웹 로그인" 폴백으로 확실히 성공시킴.
- **2차(선택)**: 카카오톡 원탭 UX가 필수면 옵션 ③(네이티브 SDK) 별도 도입 — 신규 의존성 사전 보고 후.

(참고) 옵션 ①의 정적 근거:
- 근거: 신규 의존성 0, 앱 변경 최소, 웹 위임 아키텍처 일관, 유지보수 최소. A-001 정정으로 인프라가 이미 유지됨 → 웹이 Supabase Kakao provider만 켜면 대부분 동작.
- 선행 조건(웹/오너):
  1. Supabase 프로젝트에 **Kakao provider 활성화** + 카카오 개발자 콘솔에 웹 Redirect URI(`.../auth/v1/callback`) 등록.
  2. 웹 로그인 페이지에 카카오 로그인 버튼 추가(웹 작업).
- 앱 확인(도입 시):
  3. iOS ASWebAuthenticationSession 내 카카오톡 앱 전환 동작 **실기기 검증**. 제약 시 카카오 계정 웹 로그인으로 폴백(그래도 로그인은 성공).
  4. 앱 코드 변경은 사실상 불필요(인프라 유지 중). 문서/capabilities만 갱신.
- 만약 "카카오톡 원탭 전환 UX"가 전략상 필수라면 → 그 부분만 ③를 추가 검토(신규 네이티브 의존성 사전 보고 필요). 단 세션 동기화 복잡도 감수.

> 본 문서는 조사 산출물이며 구현을 포함하지 않는다. 카카오 도입 확정 시 별도 지시(구현)로 진행한다.

---

## A-009: 실행 준비 (검증 체크리스트 · 폴백 기준 · 딥링크 상호작용)
> 2026-08-07 카카오 로그인 최우선 확정(전략 v2: 로그인+채널 알림). 조사·문서만, 코드 미수정. 아래는 웹 배포 즉시 실행 가능한 상태로 정리.

### 1) 딥링크 상호작용 — 충돌 없음 (코드 검증 완료)
- `src/features/deeplink/resolve.ts`: `boheommap://auth-callback`(스킴 host, L28/108)와 https `/auth/callback`(L112)을 **명시적으로 무시(null)** → A-002 딥링크 라우팅과 **충돌 없음**. 카카오 복귀 콜백이 딥링크 라우터에 잡혀 엉뚱한 화면으로 가지 않는다.
- OAuth 복귀는 `WebBrowser.openAuthSessionAsync(authorizeUrl, 'boheommap://auth-callback')`가 **내부 소비**(useDeepLinks/Linking을 타지 않음). 정상 경로에선 딥링크 핸들러와 무관.
- ⚠️ **iOS silent-stuck 실패 모드**: 카카오톡 앱 전환 중 ASWebAuthSession이 죽으면 복귀 콜백이 openAuthSessionAsync 대신 앱 전역 Linking 리스너로 갈 수 있다. 이때도 resolve.ts가 auth-callback을 무시하므로 **오라우팅/크래시는 없다(안전)**. 다만 로그인이 **조용히 미완료**로 남는다 → 이게 폴백 트리거 신호(S4).

### 2) 폴백(카카오 계정 웹로그인) 전환 기준 — 앱 관측 신호
`runOAuthAuthSession` 결과로 판정:
| 신호 | 감지 | 조치 |
|---|---|---|
| S1 취소/해제 | `result.type !== 'success'`(dismiss/cancel). iOS 앱전환 death 다수 | 실패 간주 → 재시도 안내 |
| S2 성공했으나 미로그인 | success + /auth/callback 주입했으나 세션 미확정 | 앱은 세션을 직접 모름 → **웹**이 미로그인 감지 시 폴백 |
| S3 타임아웃 | 일정 시간 내 미복귀 | 실패 간주 → 재시도 |
| S4 조용한 미완료 | 위 iOS silent-stuck | 로그인 화면 그대로 → 재시도 시 폴백 |
- **폴백 = 카카오 "계정 로그인"(앱 전환 없이 브라우저 자격증명)**. 앱 코드로 강제 불가(카카오/웹 설정 영역). **권고**: iOS 앱전환 복귀가 실기기 검증상 불안정하면 **iOS=계정 로그인 기본(앱전환 비활성) / Android=앱전환 유지**를 웹·카카오 콘솔에서 분기. 앱 코드 변경 0.
- 앱이 지금 할 수 있는 최소: 실패(S1/S3) 시 토스트/재시도 노출(소규모 앱 변경, **지시 시에만** 구현).

### 3) 웹 배포 즉시 실행 검증 체크리스트 (실기기, 빌드 후)
전제: 웹이 Supabase 카카오 provider + 버튼 배포 → 앱은 기배포 빌드로 자동 동작(옵션①, 앱 변경 0).
- [ ] **Android+카톡설치**: 로그인→카톡전환→인증→WebView 복귀→세션 확정→/my 로그인. 무한 리다이렉트/이중 로그인 없음.
- [ ] **Android+카톡미설치**: 카카오 계정 웹로그인 완료.
- [ ] **iOS+카톡설치**(최대 리스크): 앱전환→복귀 성공 여부. 실패 시 계정 로그인 폴백 동작.
- [ ] **iOS+카톡미설치**: 계정 웹로그인 완료.
- [ ] 공통: 취소(카톡 뒤로) 시 앱 멈춤 없이 로그인 화면 복귀. 로그인 후 딥링크/뒤로가기 정상.
- [ ] **채널 추가 동의** 화면 노출·동의 후 정상 진행(전략 v2의 본체 — 웹/카카오 설정).
- [ ] 로그인 후 `is_full_member()` 카카오 포함 반영(웹 처리, 앱은 UI만).
- 기록: 조합별 성공/실패 + 실패 시 `result.type`/증상.

### 4) 앱팀 사전 공유 메모(웹 `is_full_member()` 확장)
- 웹의 `is_full_member()` 카카오 포함 확장은 앱 판정 로직에 영향 없음(앱은 웹 위임). 문서(BACKEND_INTEGRATION_RULES A2)는 이미 "카카오=정식회원"으로 정정됨. 앱 코드 변경 불필요.
