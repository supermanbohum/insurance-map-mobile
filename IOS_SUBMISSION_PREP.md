# 🍎 iOS App Store 제출 준비 패키지

> 팀ID 없이 지금 만들 수 있는 것 전부. 팀ID(오너 $99 가입 후)만 채우면 제출 가능.
> 확정 전제: 오너 **개인사업자**(사업자번호 699-01-04079, 가운데 "01") → **개인(Individual) 계정 가능, D-U-N-S 불필요.**
> 관련: [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md)(안드로이드), [web-handoff/well-known/](web-handoff/well-known/)(AASA).
> 근거: Apple App Review Guidelines 4.2.3 / 5.1.1 / 3.1.1 (2026-08-09 확인).

---

## 🔴 1. App Review Notes (심사 노트) — 4.2.3 방어의 핵심

> App Store Connect → 앱 버전 → "App Review Information → Notes"에 붙여넣기. **영문 권장**(리뷰어 다수 비한국어).
> 목적: Apple 4.2.3(WebView 셸 거부)을 **네이티브 기능 목록 + 확인 경로**로 방어 + 5.1.1(ix) 오분류 방어.

```
[App Review Notes]

Boheommap (보험맵) is a directory, community, and recruiting platform that CONNECTS
insurance agents (설계사) and General Agencies (GA / insurance agencies) in Korea.

IMPORTANT — Regulatory classification (re: Guideline 5.1.1(ix)):
This app does NOT sell, broker, underwrite, or provide any insurance products or
financial services. It is a professional directory + community + recruiting service
(similar to a B2B networking/jobs directory). No financial transactions occur in the app.

Native functionality (re: Guideline 4.2 — this is not a repackaged website):
1. Push notifications — permission requested on first launch; notification taps are routed
   natively to the matching in-app screen (deep-link resolution in the app layer).
2. Universal Links — https://bohummap.com/... links open directly in the app
   (apple-app-site-association hosted on the domain), including cold-start routing.
3. Native OAuth hand-off — Kakao sign-in is intercepted by the app and completed in a
   secure external auth session, then returns to the app via the custom scheme.
4. Location — the app requests location permission so the map can show the user's position.
5. Save-to-Photos — downloads are saved into the device photo library.
6. Native launch experience — animated splash, offline overlay with auto-recovery,
   error/retry screen, and native back-navigation handling.

How to test:
- Launch the app → native splash → allow notifications & location when prompted.
- Tap "지도에서 찾기" (Find on map) → grant location → map shows current position.
- Sign in with Kakao → an external auth session opens and returns to the app automatically.
- Turn off network → a native offline screen appears and recovers when back online.

⚠️ 앱팀 메모(제출 전 확인, 심사노트에 넣지 말 것): 앱에는 QR 스캐너·생체 앱잠금·네이티브
공유·햅틱도 **구현돼 있으나, 전부 웹이 브릿지를 호출해야 열린다.** 2026-08-11 웹 확인 결과
`open-qr-scanner` 호출부 **0건(QR은 사용자 도달 불가)**, 앱 잠금도 앱 내부 설정 UI가 없어
웹의 `set-biometric-lock` 없이는 켤 수 없음. **도달 불가 기능을 심사노트에 적으면 리뷰어가
찾다가 못 찾는다(= 허위 기재).** 웹이 브릿지를 호출하기 시작하면 그때 위 목록에 되살릴 것.

Test account (member features such as chat / registration require sign-in):
- Email: (오너가 발급)
- Password: (오너가 발급)
- Most browsing (search, map, viewing) works without login.

Account deletion (re: 5.1.1(v)): available in-app under account settings (/delete-account).
Privacy Policy: https://bohummap.com/privacy
```
⚠️ **주의**: 유니버설링크(#2)는 **AASA가 웹에 배포돼 있어야 리뷰어가 테스트 가능.** 미배포 상태로 제출하면 그 기능은 시연 불가 → AASA 배포를 iOS 제출 전에 맞춰야 함(팀ID 필요).
⚠️ 푸시(#1)는 서버 발송이라 리뷰어가 실제 알림을 못 받을 수 있음 → **리뷰어가 직접 확인 가능한** 유니버설링크·**카카오 OAuth 핸드오프(실기기 검증됨)**·위치 권한·네이티브 런치(스플래시/오프라인)로 4.2를 방어한다.
⚠️ **공유·QR·생체는 방어 논거로 쓰지 말 것**(2026-08-11 웹 grep: 발신부 0건 = 사용자 도달 불가). 리뷰어가 찾다 못 찾으면 나머지 논거의 신뢰까지 무너진다. 웹이 브릿지를 호출하기 시작하면 그때 되살릴 것.

🔴 **제출 게이트 — 스크린샷의 "친구에게 보험맵 공유하기" 버튼**(콘텐츠팀 제보, 앱 스크린샷 01-home에 찍혀 있음):
- 이 버튼은 **네이티브 공유가 아니라 웹 카카오 공유**(sharer.kakao.com)다. **네이티브 공유(도달 불가)와 별개 경로.**
- ⚠️ **그런데 이 웹 공유가 현재 실패한다** — 2026-08-11 실측: non-www·www **양쪽 모두** `KAPIError -401 domain mismatched`(카카오 콘솔 [앱 설정 > 제품 링크 관리 > 웹 도메인] 미등록). 화면에 **"요청 실패 / 잘못된 요청으로 인증에 실패하였습니다"**가 뜬다.
- → **심사관이 스크린샷을 보고 그 버튼을 누르면 실패 화면을 본다.** 제출 전 **① 도메인 등록으로 실동작시키거나 ② 그 버튼이 없는 스크린샷으로 교체** 중 하나가 반드시 끝나야 한다.
- ※ 콘텐츠팀 원고에 있던 **"웹 카카오 공유 = 실동작 확인됨(CTO 클릭 테스트)"는 사실이 아니다**(CTO 본인이 "팝업이 잡히지 않아 확인 실패지 성공이 아니다"라고 정정). 실동작이 확인되면 그때 이 문단을 갱신할 것.

---

## 2. App Privacy (애플판 Data Safety) — App Store Connect 입력용

> 구글 Data Safety(PLAY_STORE_RELEASE §3)를 애플 "Privacy Nutrition Label" 양식으로 변환.
> 공통 원칙: **Tracking = 아니오**(제3자 광고/추적 없음). 대부분 **App Functionality** 목적, 계정 기반이라 **Data Linked to You**.

| Apple 데이터 유형 | 수집 | You와 연결 | 추적 | 목적 |
|---|---|---|---|---|
| Contact Info — Name | 예 | 예 | 아니오 | App Functionality (리크루팅/프로필) |
| Contact Info — Email address | 예 | 예 | 아니오 | App Functionality, 계정 |
| Contact Info — Phone number | 예 | 예 | 아니오 | App Functionality (GA↔설계사 연락) |
| Location — Precise Location | 예 | 예 | 아니오 | App Functionality (주변 지점) |
| Location — Coarse Location | 예 | 예 | 아니오 | App Functionality |
| User Content — Photos or Videos | 예 | 예 | 아니오 | App Functionality (프로필/지점 업로드) |
| User Content — Other (채팅 메시지) | 예 | 예 | 아니오 | App Functionality (채팅) |
| Identifiers — Device ID (푸시 토큰) | 예 | 예 | 아니오 | App Functionality (알림) |
| Usage Data — Product Interaction (검색/조회) | 예 | 예 | 아니오 | App Functionality (추천/조회수) |

- **수집 안 함**: 금융정보(결제 미연동), 건강, 연락처(주소록 미접근), 검색기록 외 민감정보, 오디오(마이크 차단).
- **Data Used to Track You: 없음** (제3자 광고/데이터브로커 없음. Expo Push/FCM/APNs는 서비스 제공자=처리자, 추적 아님).
- **User ID(카카오)**: 카카오 로그인 활성화 시 "User ID" 추가. 구글은 제거됨(신고 안 함).

---

## 3. AASA (apple-app-site-association) — ✅ 템플릿 완성

- 파일: [web-handoff/well-known/apple-app-site-association](web-handoff/well-known/apple-app-site-association)
- 애플 규격 확인됨: `{ applinks.details[].appID: "TEAMID.com.bohummap.app", paths: ["*"] }`
- **팀ID만 채우면 됨**(오너 가입 후 확보). 웹이 `https://bohummap.com/.well-known/apple-app-site-association`에 **확장자 없이, application/json, 리다이렉트 없이** 배포.
- app.json `ios.associatedDomains: ["applinks:bohummap.com"]` 이미 설정됨 ✅.

---

## 4. 앱 카테고리 — **Business (Primary)**

| 후보 | 판정 | 근거 |
|---|---|---|
| **Business** ✅ | **채택** | GA·설계사 대상 B2B 디렉터리+리크루팅+커뮤니티. 안드로이드도 Business로 통일(정합). |
| Finance | ❌ 회피 | **5.1.1(ix) 규제분야 트리거.** 8/7 구글 거부가 정확히 금융 오분류였음. Finance 선택 시 심사자가 규제 검증 요구 가능. |
| Lifestyle | ❌ | 소비자향 뉘앙스. 우리는 전문가(설계사/GA) 도구라 부적합. |
| Secondary(선택) | Productivity 또는 미지정 | 필수 아님. 지정 시 Productivity(업무 도구) 정도. |

→ **Primary: Business, Secondary: 미지정(또는 Productivity).** Finance 절대 회피.

---

## 5. iOS 스토어 텍스트 — 안드로이드 점검본 기준(엄격기준 적용)

> Apple은 구글과 달리 **Keywords 필드(100자, 쉼표구분)** 가 별도로 있음. Subtitle(30자)도 있음.
> 콘텐츠팀 점검 반영본(최상급·구정책 표현 제거)을 기준으로. **최종 문안은 콘텐츠 A/B(푸시 스모크) 확정 후 동기화.**

- **App Name (30자)**: `보험맵 - 보험 GA·설계사 찾기`
- **Subtitle (30자)**: `전국 GA·지점·설계사 리크루팅`
- **Keywords (100자, 쉼표구분)**: `보험,GA,보험대리점,설계사,리크루팅,지점,보험이직,설계사구인,보험영업,연봉,TOP설계사,보험채용`
- **Promotional Text (170자)**: `전국 보험 GA·지점·설계사를 지도에서 찾고, 리크루팅과 커뮤니티까지 한 곳에서. (콘텐츠 A/B 확정 시 교체)`
- **Description (4000자)**: PLAY_STORE_RELEASE §2.3 수정본 그대로(「대표」 제거·「회원 가입 후」·푸시줄 조건부) + 말미 「※ 보험맵은 보험상품을 판매·중개하지 않습니다」(5.1.1(ix) 방어).
- **Support URL**: `https://bohummap.com` · **Marketing URL**(선택): `https://bohummap.com`
- ⚠️ 애플 심사가 더 깐깐 → 최상급/미구현 기능 서술 금지 원칙 안드로이드보다 엄격 적용. 푸시줄은 실기기 수신 확인(§9-5) 게이트.

---

## 6. 프로덕션 빌드 — iOS
- iOS도 **EAS 클라우드 빌드(맥 불필요)**: `eas build -p ios --profile production` (Apple 계정 로그인 + 팀ID 필요 → 오너/CTO 실행).
- `ios.buildNumber`는 EAS autoIncrement 또는 app.json에 지정. bundleId `com.bohummap.app` ✅.
- 안드로이드 AAB(vc7)는 별개로 이미 완료(eas submit은 서비스계정 키 대기, 오너 결정).

---

## 남은 것 = 팀ID 의존 (오너 $99 가입 후)
```
1. Apple Team ID 확보              → 2·3 완성
2. AASA에 팀ID 채워 웹 배포        → 유니버설링크 검증
3. eas build -p ios production     → IPA
4. App Store Connect 앱 생성 + 위 1~5 입력 + 심사용 계정 → 제출
```
**팀ID 없이 지금 완성된 것**: 심사노트·App Privacy·AASA템플릿·카테고리·스토어텍스트·권한설명문(위치 보강)·아이콘(알파0). → **오너가 가입만 하면 즉시 제출 단계.**
