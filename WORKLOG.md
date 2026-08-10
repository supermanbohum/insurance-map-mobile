# 앱팀 WORKLOG

> 전 팀 상시 지시. 작업 단위마다 **무엇 / 왜 / 결과 / 검증 / 관련** 형식으로 append.
> 담당: 모바일 앱(WebView 셸). 세션 894920e4.

---

## 2026-08-08

### A-014 P0 — 로딩 UX 롤백
- **무엇**: vc8의 느린로딩 안내 오버레이 + onError 자동재시도 제거(vc7 동작 복귀).
- **왜**: 실기기에서 안내문이 콘텐츠 위 겹침 + 로드 후 안 사라짐 + 자동재시도가 화면전환 렉 유발.
- **결과**: `00e6c49`. vc9에서 오너 "렉 없음" 확인 → 원인=자동재시도로 확정.
- **검증**: tsc 통과. 오너 실기기(vc9) 렉 해소 확인.
- **관련**: [[feedback_no_unverified_overlay_features]], PUSH_E2E 무관.

### B1 — 브랜드색 #2472EC 전면 통일
- **무엇**: theme.primary #152D70→#2472EC, pressed #1B57D9, 구네이비→colors.ink, 알림색 통일. primaryTint #5490F0(흰배경 텍스트 금지, AA 미달).
- **왜**: 스플래시(#2472EC)→네이티브 크롬(#152D70) 색 튐(오너 민감 지점).
- **결과**: `ffbcb48`, `169f64b`. APP_UI_UX_GUIDE §2 갱신.
- **검증**: tsc. 사용처 8곳 grep 확인(부작용 없음, cosmetic).
- **관련**: [[project_brand_color_split]].

### A-015 — 로컬 재방문 알림 비활성화(코드 보존)
- **무엇**: REVISIT_REMINDER_ENABLED=false. 심야 클램프/문구/구현 보존. 재개조건 주석.
- **왜**: 발행 실적 0 상태에서 "돌아왔는데 새 글 없음"→알림 권한 해제→FCM 개인화까지 사망하는 비대칭.
- **결과**: `db1a1d6`. active→cancel 배선 확인(기존 예약도 앱 실행 시 취소).
- **검증**: tsc.
- **관련**: 재개조건 = 발행 2주 실적(주기 7일로) 또는 FCM 개인화 가동 시 재검토.

### A-015 ④ — 스플래시 ⓑ 시도 후 revert
- **무엇**: 실루엣 fade-in ⓑ 구현(c476807) → 되돌림(66779b7).
- **왜**: "네이티브 로고 제거됨" 전제가 실제 app.json과 불일치(로고 여전히 표시). ⓐ가 스펙 원문 정답. 오너 4번째 확인 요구 회피.
- **결과**: 스플래시 vc9 상태 그대로 유지. SPEC-024 원문 준수.
- **검증**: app.json/AnimatedSplash 원복 확인, tsc.
- **관련**: [[feedback_cto_channel_authority_claims]](틀린 전제 위 지시 검증).

### 렉 진단 계측 + 로드 카운터 (dev-only)
- **무엇**: perf.ts(웹 performance 추출 주입 + 앱-웹 로드시간 + onLoadStart/End 카운터). __DEV__ 게이트.
- **왜**: "렉이 앱/웹 어느 탓"을 숫자로. 웹팀 Q1(onLoadEnd 누락 지점 탐지) 제안.
- **결과**: `2d2e372`, `4329fa4`. vc9 렉 해소로 (A)dev세션 불요 → 코드는 보존(재사용 대비).
- **검증**: tsc. 사용자 앱 무영향(게이트).
- **관련**: naver_maps_sdk.js(B7 stray 333KB) 삭제 — 앱 참조 0.

### B3 — App Links well-known 파일
- **무엇**: web-handoff/well-known/ assetlinks.json + apple-app-site-association + README.
- **왜**: https 링크가 앱으로 열리게(설치자). 없으면 브라우저로 감.
- **결과**: `c4dd814`. package 채움, SHA-256/팀ID는 CTO.
- **검증**: 착지 라우팅 resolve.ts 대조.
- **관련**: 웹 배포 대기.

### 푸시 E2E 절차서(오너용) + Play 플랜B
- **무엇**: PUSH_E2E_CHECKLIST.md(A/B/C 콜드·웜), PLAY_LAUNCH_PLANB.md(내부테스트+12명 요청서).
- **왜**: 오너 직접 검증 + 8/17 대비 병렬 준비.
- **결과**: `1cc79c6`, `195acd8`.
- **검증**: 착지값 resolve.ts 대조. 빌드준비 tsc+expo-doctor 20/20.
- **관련**: [[project_launch_8_17]].

### 아이콘 알파 검증
- **무엇**: icon.png(1024)·icon-512-store-v2.png jimp 알파검사.
- **왜**: iOS 아이콘 알파 금지 요건.
- **결과**: 둘 다 투명픽셀 0(불투명) → iOS 블로커 해소 확인.
- **검증**: jimp-compact.
- **관련**: [[feedback_app_workflow_rules]].

### 품질조 QA(앱 셸) + 4팀 공유
- **무엇**: QA_FINDINGS_APP.md. 모바일웹 빈상태 직접점검(홈/지도/커뮤니티) + 셸 코드리뷰 + 실기기 필요항목 분리. 웹/콘텐츠/디자인/CTO 직접 공유.
- **왜**: 오너 조편성(품질조=웹+앱), 8/17 전 QA.
- **결과**: `d8ae0b9`. P0 없음. C1(도메인이탈) 웹에 전달. 딥링크 정합성 resolve.ts 대조 확정.
- **검증**: Browser pane 모바일뷰포트(375) get_page_text/console. 실기기 항목은 8/10 테스터/스모크 위임.
- **관련**: PUSH_E2E_CHECKLIST, BUILD_SMOKE_CHECKLIST.

### Alpha 빌드 결정 + Play 경고 판정
- **무엇**: Alpha에 vc9 대신 HEAD 새 빌드 권고(vc9엔 로컬알림 켜져있음). 재설치/재등록 불필요 확인. Android15/16 대형화면 경고 = 비차단 판정.
- **왜**: 8/10 테스터 최선 빌드 + 오너 1회 안내. CTO 빌드 실패 대비 질의.
- **결과**: CTO가 HEAD로 production 빌드 시작. 경고는 orientation portrait+targetSdk36 advisory로 폰 영향 0, 8월말 백로그.
- **검증**: 커밋순서(db1a1d6가 vc9 이후) 확인. app.json orientation/sdk/google-services 확인.
- **관련**: [[project_launch_8_17]].

### 스토어 텍스트 콘텐츠 점검 반영
- **무엇**: PLAY_STORE_RELEASE §2.3·§9-1 필수2건(최상급 "대표" 제거, "이메일 인증"·"탐색 전용"·"구글 로그인" 폐지표현 교체) 선반영 + 푸시줄 조건부 표시.
- **왜**: 콘텐츠팀 점검(스토어=심사물 엄격기준), 8/7 거부 전례.
- **결과**: `e931af6`. Console 입력은 CT-013과 D-day 전 1회 일괄, 문서는 원본 정본으로 선반영.
- **검증**: 콘텐츠팀 교체 문안 원문 대조.
- **관련**: 전제=이메일 회원 지위 유지(웹 확인 대기).

### 테스터 안내문
- **무엇**: TESTER_GUIDE.md — 오너가 8/10 초대에 붙여넣는 5항목 확인목록 + 14일 옵트인 유지.
- **왜**: 12명에게 "무엇을 볼지" 줘야 피드백 나옴. CTO 요청.
- **결과**: `992ca9e`.
- **관련**: 실기기 항목 A1·A4·A5·A6·A7 커버. 푸시는 별도.

## 2026-08-09

### iOS 출시 가능성 검증 (Apple 문서)
- **무엇**: Apple App Review Guidelines 직접 확인(4.2.3 최소기능, 5.1.1(ix) 규제분야 법인제출, 3.1.1, 5.1.1(v) 계정삭제) + 개인/조직 계정 규정. iOS 위치 when-in-use 권한 문자열 보강.
- **왜**: 오너 "iOS 언제 되나" 질문 — 특히 개인계정 가능 여부(구글이 금융오신고로 막았던 건과 동일 리스크인지).
- **결과**: `0f92c64`(locationWhenInUsePermission 추가). 판정: 개인계정 가능성 높으나 ①법인이면 조직필수 ②5.1.1(ix) 규제분야 오분류 리스크(안드로이드와 동일) ③4.2 WebView셸(iOS 고유, 중간리스크). 8월말 병렬 가능하나 거부 시 9월.
- **검증**: developer.apple.com/app-store/review/guidelines WebFetch + WebSearch(계정규정).
- **관련**: [[project_launch_8_17]]. 미착수=Apple가입·팀ID·AASA배포·App Privacy.

### iOS 제출 준비 패키지 (팀ID 없이 선제작)
- **무엇**: IOS_SUBMISSION_PREP.md — 심사노트(4.2.3 방어), App Privacy(구글→애플 변환), AASA 확인, 카테고리(Business), iOS 스토어텍스트(Keywords/Subtitle 포함).
- **왜**: 오너 "24시간 풀근무" 지시 — 대기 말고 팀ID 없이 만들 수 있는 것 전부.
- **결과**: 커밋 예정. 개인계정 확정(오너 개인사업자 699-01-04079). 팀ID만 채우면 즉시 제출 단계.
- **검증**: Apple 가이드라인 4.2.3/5.1.1/3.1.1 대조. AASA 규격 확인.
- **관련**: [[project_launch_8_17]]. 팀ID 의존분만 잔여.

### 카카오 로그인 검증 준비 (게이트 ON 대비, 코드 미수정)
- **무엇**: KAKAO_LOGIN_VERIFY.md — 8단계 체크리스트 + adb logcat 필터(release라 JS로거 조용→Custom Tab 액티비티로 판정) + 실패 시 폴백 패치(A: onNavigationStateChange 반응형 인터셉션, B: originWhitelist, C: setSupportMultipleWindows) 사전작성.
- **왜**: CTO 지시 — 게이트 ON 후 몇 분 안에 성패 판정+실패 시 즉시 OFF+폴백. 이 흐름은 구글 제거 후 inert, 카카오가 첫 실사용.
- **결과**: 커밋 예정. 코드 미수정(준비만). 핵심 리스크=Android JS발 nav가 onShouldStartLoad 발화하는지(불확실)→폴백A가 robust.
- **검증**: App.tsx 현 props 확인(originWhitelist 미설정, setSupportMultipleWindows=false, handleNavigationStateChange는 canGoBack만).
- **관련**: KAKAO_LOGIN_RESEARCH(iOS 복귀 리스크), 8번(재로그인 계정매칭)=웹/Supabase 문제.

### 카카오 로그인 실기기 통과 기록 + 정합 확인
- **무엇**: KAKAO_LOGIN_VERIFY.md에 통과 결과 확정 기록(관문2 Custom Tab·5~6 가입·8 재로그인·DB). 함수명 정합 확인(HEAD=runOAuthAuthSession, 조치 불요). vc8 빌드준비 tsc green 재확인.
- **왜**: CTO 마감회의 — 통과 경로 문서화(#2), 함수명 검토(#3), vc8 준비(#1).
- **결과**: 카카오 앱 로그인 정상(2026-08-09 vc6, 폴백 미사용). #3는 이미 정합(vc5/v6만 옛 이름). #1 green.
- **검증**: 오너 실기기 통과(CTO 확인) + git grep(runGoogleAuthSession 잔존 0) + tsc.
- **관련**: vc5 판단오류 정정(직접 git show로 재확인 후 인정). 병목=테스터 2/12(오너 몫).

## 2026-08-10

### 전국 지점 지도(⑪) 앱영향 분석 (코드 미수정)
- **무엇**: MAP_NATIONWIDE_ANALYSIS.md — 마커 대량렌더 성능 + 네이버 외부이동 조건매트릭스.
- **왜**: 제품 개편(지점 홍보+랭킹 주력). CTO 분석 지시(미확정 기능).
- **결과**: 성능=웹 클러스터링+bounds면 OK/전국 일괄이면 저사양 렉(앱 레버 없음, 실기기 필수). 외부이동=https면 앱무변경/nmap://면 EXTERNAL_SCHEMES+iOS LSApplicationQueriesSchemes+재빌드.
- **검증**: navigation.ts EXTERNAL_SCHEMES 실코드 대조.
- **관련**: 웹 구현방식 확정 시 앱 판정. vc7 업로드는 오너 PC 대기(변동 없음).
