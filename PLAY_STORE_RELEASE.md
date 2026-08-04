# 보험맵 앱 — Google Play 출시 준비 (PLAY_STORE_RELEASE)

> 작성일: 2026-08-04
> 대상: Android(Google Play) 첫 출시. 패키지 `com.bohummap.app`, version `1.0.0`.
> 원칙: 웹 프로젝트는 수정하지 않는다. 이 문서는 출시 준비 상태 점검 + 업로드 직전 TODO.
> 관련: [MOBILE_APP_MASTER_PLAN.md](MOBILE_APP_MASTER_PLAN.md) · [APP_FEATURE_ROADMAP.md](APP_FEATURE_ROADMAP.md) · [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md)

---

## 1. 출시 체크리스트 (완료 / 미완료 / 출시 가능 여부)

### ✅ 완료된 기능 (Phase 0 + Phase 1, 모두 main 반영)
| 영역 | 상태 |
|---|---|
| WebView 쉘(bohummap.com 래핑) + 세션 유지 | ✅ |
| Google OAuth(Custom Tab 우회) | ✅ |
| GPS / 카메라·갤러리 업로드 / 파일 다운로드→갤러리 | ✅ |
| 웹↔앱 Bridge(ready/capabilities 핸드셰이크) | ✅ |
| Deep Link(커스텀 스킴 + 유니버설 링크 앱측) | ✅ |
| Native Share | ✅ |
| 생체인증 앱 잠금 | ✅ |
| QR 스캐너 | ✅ |
| 앱 UX(로딩바·에러/재시도·pull-to-refresh·인앱토스트·햅틱) | ✅ |
| Push 알림(토큰→브릿지→웹, 알림탭→딥링크, 뱃지) | ✅ |
| 스플래시 + 최초 온보딩 + 오프라인 처리 | ✅ |
| 아이콘/적응형아이콘/모노크롬/스플래시 에셋 | ✅ (1024²) |
| 권한 최소화(RECORD_AUDIO·READ_MEDIA_AUDIO 차단) | ✅ |

### ⏳ 미완료 (출시 전 필요 — 대부분 코드 아님)
| 항목 | 종류 | 담당 |
|---|---|---|
| Privacy Policy URL | 콘텐츠/호스팅 | 웹 (예: bohummap.com/privacy) |
| Data Safety 양식 작성 | Play Console | 앱 배포자 |
| 스크린샷(폰 2~8장) | 에셋 | 앱 배포자(기기/에뮬 캡처) |
| Feature Graphic 1024×500 | 에셋 | 디자인 |
| Play 스토어 아이콘 512×512 | 에셋 | icon.png 리사이즈 |
| EAS 푸시 credentials(FCM 서버키/APNs) | 빌드 설정 | 앱 배포자 |
| 유니버설 링크 `.well-known` 2파일 | 호스팅 | 웹 |
| Content Rating 설문(IARC) | Play Console | 앱 배포자 |
| 프로덕션 AAB 빌드 + 내부테스트 | 빌드 | 앱 배포자 |

### 🚦 출시 가능 여부
**기능적으로는 출시 가능 상태**입니다(핵심 UX + 네이티브 기능 완비, 순수 WebView 껍데기가 아님 → Apple/Google 반려 리스크 낮음).
**행정적으로 남은 필수 블로커는 2개**: ① **Privacy Policy URL**(민감권한 사용으로 필수), ② **Data Safety 양식**. 이 둘 + 스토어 리스팅 에셋(스크린샷/피처그래픽)만 준비하면 업로드 가능합니다. 코드/설정 측 준비는 완료되었습니다.

---

## 2. Google Play 등록 항목 점검

| 항목 | 상태 | 준비 내용 / 필요 작업 |
|---|---|---|
| **App Name** | ✅ 초안 | `보험맵` (또는 `보험맵 - 보험 GA·설계사 찾기`, 30자 이내) |
| **Short Description** | ✅ 초안 | 아래 3.1 (80자) |
| **Full Description** | ✅ 초안 | 아래 3.2 (4000자 이내) |
| **App Category** | ✅ 권장 | **비즈니스(Business)** — 설계사 대상 리크루팅/디렉터리 |
| **Content Rating** | ⏳ 설문 | IARC 설문 필요. 채팅(사용자간 소통) 있음 → 정직히 신고. 폭력/성적 콘텐츠 없음 → **전체이용가~3+ 예상** |
| **Target Audience** | ✅ 권장 | **만 18세 이상**(보험설계사 전문 도구). 아동 대상 아님 → "아동 포함 안 함" |
| **Data Safety** | ⏳ 작성 | 아래 3.3 매핑표 기준으로 Console 양식 작성 |
| **Privacy Policy** | ❌ 필수 | 호스팅 URL 필요(민감권한 사용). 웹에 `/privacy` 페이지 요청 |
| **Permissions** | ✅ 정리됨 | 아래 4.2 정당화 표 |
| **App Icon** | ✅/⏳ | 앱 아이콘 1024² 있음(빌드 자동 생성). **Play 리스팅용 512² 별도 업로드 필요** |
| **Splash** | ✅ | expo-splash-screen 구성됨 |
| **Screenshots** | ❌ 필수 | 폰 최소 2장(권장 4~8장). 기기/에뮬에서 캡처 |
| **Feature Graphic** | ❌ 필수 | 1024×500 PNG/JPG 제작 필요 |

---

## 3. 리스팅 콘텐츠 초안 & Data Safety 매핑

### 3.1 Short Description (80자)
```
전국 보험 GA·지점·설계사를 지도에서 찾고, 채팅·리크루팅까지 한 번에.
```

### 3.2 Full Description (초안)
```
보험맵은 보험설계사와 보험대리점(GA)을 위한 대한민국 대표 플랫폼입니다.

■ 내 주변 GA 지점 찾기
- GPS 기반으로 가까운 GA 지점을 지도에서 바로 확인
- 지역·회사·경력·상품군으로 정밀 검색

■ 설계사 리크루팅
- 구직 설계사 프로필 등록 / GA의 인재 탐색
- TOP 설계사·연봉 인증으로 신뢰도 확인

■ 지점 등록 & 홍보
- GA 지점을 직접 등록하고 관리
- 채용 공고 등록

■ 앱 전용 편의 기능
- 실시간 채팅 알림(푸시)
- 프로필·명함 QR, 네이티브 공유
- 생체인증 앱 잠금으로 안전하게

지금 보험맵에서 나에게 맞는 GA와 인재를 찾아보세요.
```
> 실제 문구/기능 노출은 웹 서비스 현황에 맞춰 최종 검수 필요.

### 3.3 Data Safety 매핑 (Console 양식 작성 근거)
| 데이터 유형 | 수집? | 목적 | 공유? | 비고 |
|---|---|---|---|---|
| 위치(대략/정밀) | 예 | 앱 기능(주변 지점) | 아니오 | 서버 미전송, 지도 표시용 |
| 사진(업로드) | 예 | 앱 기능(프로필/지점 사진) | 예(웹 백엔드 저장) | 사용자가 직접 업로드 |
| 이름·연락처·이메일 | 예 | 계정/리크루팅 | 예(웹 백엔드) | 웹 회원가입 시 |
| 기기 식별자(푸시 토큰) | 예 | 알림 발송 | 예(Expo Push/백엔드) | register_push_token |
| 채팅 메시지 | 예 | 앱 기능(소통) | 예(웹 백엔드) | 자정 아카이브 |
| 결제 정보 | 아니오(현재) | — | — | PG 미연동(스텁) |
- **전송 중 암호화**: 예(HTTPS).
- **데이터 삭제 요청 경로 제공**: 웹 정책에 명시 필요.

---

## 4. Android Manifest / 권한 / 심사 기준 점검

> Managed(CNG) 워크플로우 → AndroidManifest는 app.json에서 prebuild로 생성됨. 아래는 매니페스트에 반영되는 app.json 설정 점검.

### 4.1 Intent Filter / Deep Link / App Link
| 항목 | 설정 | 상태 |
|---|---|---|
| 커스텀 스킴 | `scheme: "boheommap"` | ✅ 동작 |
| App Link(https) | `android.intentFilters`(VIEW/BROWSABLE/DEFAULT, host `bohummap.com`, autoVerify) | ✅ (검증엔 `.well-known/assetlinks.json` 웹 호스팅 필요) |
| iOS 유니버설 링크 | `ios.associatedDomains: applinks:bohummap.com` | ✅ (AASA 웹 호스팅 필요) |
| OAuth 콜백 | `boheommap://auth-callback` | ✅ 구현 |

### 4.2 권한 정당화 (Play 권한 선언 대응)
| 권한 | 사용처 | 필수? |
|---|---|---|
| INTERNET | WebView/네트워크 | 필수 |
| CAMERA | QR 스캔 + 웹 파일 업로드(촬영) | 예 |
| ACCESS_FINE/COARSE_LOCATION | 주변 GA 지점(지도) | 예(전경만) |
| READ_MEDIA_IMAGES / VIDEO | 프로필/지점 이미지·영상 업로드 | 예 |
| READ_MEDIA_VISUAL_USER_SELECTED | Android 14 부분 사진 접근(프라이버시 강화) | 예 |
| POST_NOTIFICATIONS | 푸시 알림(Android 13+) | 예 |
| VIBRATE | 햅틱/알림 진동 | 자동 |
| ~~RECORD_AUDIO~~ | 사용 안 함(QR 전용) → **차단** | ❌ blockedPermissions |
| ~~READ_MEDIA_AUDIO~~ | 오디오 업로드 없음 → **차단** | ❌ blockedPermissions |
- **위치는 전경(포그라운드)만** 사용 — 백그라운드 위치 권한 없음(심사 단순화).
- **민감 권한 선언**: 카메라·위치·미디어·알림 → Privacy Policy 필수 사유.

### 4.3 기타 심사 관점
| 항목 | 상태 |
|---|---|
| Target API level | 36 (expo-build-properties) — Play 최소요건(34+) 충족 ✅ |
| 64-bit / App Bundle(.aab) | EAS production = app-bundle ✅ |
| Cleartext 트래픽 | HTTPS 전용 로드(기본 비허용) ✅ |
| 순수 웹뷰 껍데기 반려 리스크 | 푸시/생체인증/QR/공유 등 네이티브 기능 제공 → 낮음 ✅ |
| 마이크 권한 오해 | RECORD_AUDIO 차단으로 제거 ✅ |

---

## 5. Release Build (EAS) 준비 상태

| 항목 | 상태 | 비고 |
|---|---|---|
| eas.json production 프로필 | ✅ | distribution store, android app-bundle, autoIncrement |
| appVersionSource | ✅ local | app.json versionCode 기준 |
| EAS projectId | ✅ | `c1ea2bd3-...` (app.json extra + EAS_PROJECT_ID 상수) |
| Android 키스토어 | ⏳ | 최초 빌드 시 EAS가 자동 생성/관리(확인 필요) |
| **FCM 서버 키(푸시)** | ❌ | EAS credentials에 등록해야 실제 푸시 발송 |
| eas submit 설정 | ⏳ | `submit.production` 비어있음 → Google 서비스계정 JSON 필요 |
| 빌드 명령 | — | `eas build -p android --profile production` |

### 빌드 전 검증
- `npx tsc --noEmit` — ✅ 통과(전 기능)
- `npx expo config` — ✅ 정상 해석
- Expo Doctor 권장: `npx expo-doctor` 실행으로 의존성 정합성 확인(업로드 전 1회)

---

## 6. Play Console 업로드 직전 TODO

### A. 반드시 (블로커)
- [ ] **Privacy Policy URL 확보** — 웹에 `/privacy` 페이지 요청(민감권한 필수)
- [ ] **Data Safety 양식 작성** — 3.3 매핑표 기준
- [ ] **스크린샷 캡처** — 폰 최소 2장(홈/검색/지점/채팅 권장 4~8장)
- [ ] **Feature Graphic 1024×500 제작**
- [ ] **Play 리스팅 아이콘 512×512** — icon.png 리사이즈
- [ ] **Content Rating 설문(IARC)** 완료 — 채팅(사용자간 소통) 신고
- [ ] **Target Audience/광고 여부** 설정 — 만 18세+, 광고 없음(현재)

### B. 빌드/배포
- [ ] `npx expo-doctor` 통과
- [ ] **FCM 서버 키를 EAS credentials에 등록**(푸시 발송용)
- [ ] `eas build -p android --profile production` → AAB 생성
- [ ] 내부 테스트 트랙 업로드 → 실기기 스모크 테스트
  - [ ] Deep Link(스킴) 진입 / 공유 / 생체인증 / QR / 푸시 수신·탭 / pull-to-refresh(Android)
- [ ] `eas submit` 용 Google 서비스계정 JSON 준비(또는 수동 업로드)

### C. 웹 협업(코드 아님, 웹팀)
- [ ] `bohummap.com/.well-known/assetlinks.json`(Android App Link 검증)
- [ ] `bohummap.com/.well-known/apple-app-site-association`(iOS)
- [ ] `bohummap.com/privacy`(개인정보처리방침)
- [ ] BridgeProvider가 `push-token` 수신 → `register_push_token` RPC 저장(웹 "준비됨")

### D. 권장(출시 후라도)
- [ ] 알림용 모노크롬 아이콘(notification icon) 추가 — 현재 앱 아이콘 실루엣 사용
- [ ] Sentry 등 크래시 모니터링
- [ ] EAS Update(OTA) 채널 구성

---

## 7. 코드/설정 측 수정 완료 내역 (이번 출시 준비)
- app.json 권한 최소화: `POST_NOTIFICATIONS` 명시 추가, `RECORD_AUDIO`/`READ_MEDIA_AUDIO` `blockedPermissions`로 제거
- (기존) intentFilters/associatedDomains, 플러그인별 권한 설명 문구, 각 기능 플러그인 구성 완료

> 결론: **코드/설정 준비는 완료**. 남은 것은 스토어 리스팅 에셋 + Privacy Policy/Data Safety(행정) + FCM 키(빌드 설정)뿐이며, 이는 6번 TODO로 관리한다.
