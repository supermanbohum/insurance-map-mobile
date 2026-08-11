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
- **왜**: 오너 직접 검증 + 오픈 대비 병렬 준비.
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
- **왜**: 오너 조편성(품질조=웹+앱), 오픈 전 QA.
- **결과**: `d8ae0b9`. P0 없음. C1(도메인이탈) 웹에 전달. 딥링크 정합성 resolve.ts 대조 확정.
- **검증**: Browser pane 모바일뷰포트(375) get_page_text/console. 실기기 항목은 8/10 테스터/스모크 위임.
- **관련**: PUSH_E2E_CHECKLIST, BUILD_SMOKE_CHECKLIST.

### Alpha 빌드 결정 + Play 경고 판정
- **무엇**: Alpha에 vc9 대신 HEAD 새 빌드 권고(vc9엔 로컬알림 켜져있음). 재설치/재등록 불필요 확인. Android15/16 대형화면 경고 = 비차단 판정.
- **왜**: 8/10 테스터 최선 빌드 + 오너 1회 안내. CTO 빌드 실패 대비 질의.
- **결과**: CTO가 HEAD로 production 빌드 시작. 경고는 orientation portrait+targetSdk36 advisory로 폰 영향 0, 추후 백로그.
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
- **결과**: `0f92c64`(locationWhenInUsePermission 추가). 판정: 개인계정 가능성 높으나 ①법인이면 조직필수 ②5.1.1(ix) 규제분야 오분류 리스크(안드로이드와 동일) ③4.2 WebView셸(iOS 고유, 중간리스크). 오픈에 맞춰 병렬 가능하나 거부 시 지연 가능.
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

### 카카오톡 공유(Kakao.Share) WebView 조사 (코드 미수정)
- **무엇**: KAKAO_SHARE_ANALYSIS.md — 현재 스킴 처리 + Expo v57 요건(Android queries, iOS LSApplicationQueriesSchemes) 조사.
- **왜**: 오너 "카톡으로 앱 공유링크 보내기" 기능, 웹 구현 예정. CTO 조사 지시.
- **결과**: kakaolink/intent/kakaotalk 이미 EXTERNAL_SCHEMES에 있음(openURL 경로 존재). 🔴 Android 11+는 <queries> 필요(app.json 내장필드 없음→config plugin+재빌드), iOS는 openURL이라 plist 무필수(신뢰성 위해 권장). onShouldStartLoad JS발 발화는 기기 검증 필요.
- **검증**: navigation.ts/constants.ts 실코드 + Expo v57 문서 2건 WebFetch. 실행검증 불가(기기 없음) 명시.
- **관련**: 폴백=onNavigationStateChange 인터셉션(카카오로그인 폴백A 동형). 네이티브 SDK 불요.

### 오픈 날짜(8/17) 전면 제거
- **무엇**: 앱 repo 문서의 오픈/출시 날짜(8/17·8월말·8/24·9월) 전량 제거 → 날짜 없는 표현("오픈"·"일정 미정"). PLAY_LAUNCH_PLANB/PLAY_STORE_RELEASE/QA_FINDINGS_APP/WORKLOG.
- **왜**: 오너 지시 "8월17일 오픈 안 함, 숫자 지워라, 새 날짜 쓰지 마라".
- **결과**: grep 재검색 잔재 0. 빌드·커밋 등 역사적 날짜 + 8/10 테스터 설치일(운영)은 유지.
- **검증**: `grep 8/17|8월말|8/24|9월` = 0건.
- **관련**: [[project_launch_8_17]] 메모리도 갱신(오픈일 미정으로).

## 2026-08-11

### A-006 — 시드 삭제 후 0건 상태 화면 점검
- **무엇**: 지점 0건 상태에서 /map·/search·/search?q=·/region·/ga-ranking 렌더 점검 + 대조군 /community. QA_FINDINGS_APP.md에 표로 기록.
- **왜**: ga_branch 153건 전량 soft-delete → 오픈 초기 사용자가 실제로 볼 화면. CTO A-006 최우선 지시.
- **결과**: 4개 항목 전부 정상 — 지도 타일 8장 실제 로드(빈 지도 아님)·로더 잔존 0·안내문구+CTA·높이 붕괴 없음. 대조군 /community 글 9건 렌더로 "깨짐 아님" 확정. 신규 발견 A8(=/map에 푸터가 붙어 페이지 스크롤 가능→지도 팬과 충돌 여지, [기기] 확인 필요).
- **검증**: Browser pane 실제 Chromium 375x812에서 computed 높이·가시성·img naturalWidth 계측(curl/문자열 아님). ⚠️ 스크린샷은 pane 미표시로 생성 불가, 데스크톱 Chromium이라 실기기와 동일하지 않음(정직 고지).
- **관련**: #3 당겨서새로고침은 Android 기능 자체 없음(iOS 전용 prop) → iOS만 기기확인. #4는 webview flex:1이라 구조적 붕괴 불가.

### A-007 재점검 — 법률문서 vs 앱 구현
- **무엇**: A007_LEGAL_DOC_AUDIT.md에 재점검 절 추가. 운영 privacy/refund-policy 본문 실측(동의어 검색).
- **왜**: CTO A-007 지시("설명이 기능보다 먼저" 계열 탐색).
- **결과**: 8/7 지적 2건 해소/완화(구글 잔재 정정됨, 환불정책은 시행일 스코프 명시). **신규 P1 2건**: ① privacy에 앱 수집항목(푸시토큰·위치·카메라·Supabase/Expo 위탁) 전무 → Play Data Safety 신고와 불일치=심사 거부 리스크 ② 결제 개통 시 Apple 3.1.1/Play Billing 충돌 + "인앱결제 없음" 신고가 거짓이 됨.
- **검증**: privacy 본문 7,791자에서 카메라/앱/모바일 = 매칭 0, 위치·푸시는 무관 문구만. 동의어 재확인 후 단정(부재 주장 검증 원칙).
- **관련**: 웹 문서 미수정(범위 밖) → 웹팀·CTO 판단 요청. PLAY_STORE_RELEASE §3·§5와 대조.

### 개인정보 문안용 앱 구현 사실 확정 (콘텐츠팀 질의 5건)
- **무엇**: 위치·푸시토큰·카메라/사진·Supabase리전·알림위탁 5건에 대해 앱 코드 grep 검증 후 회신. PLAY_STORE_RELEASE §3.2에 확정 사실 기록.
- **왜**: 콘텐츠팀이 /privacy 앱 항목 작성 중, "추정 금지" 원칙으로 실제 구현 확인 요청.
- **결과**: **앱은 좌표 취득/전송 안 함**(권한 요청 1줄뿐, getCurrentPosition·coords 0건) → 서버 전송 여부는 웹 소관. **QR은 디코딩 문자열만 전달, 이미지 저장 0**(확정). 푸시토큰은 브릿지 전달만·삭제 트리거 없음. 사진 업로드/리전은 웹 소관(확인 불가로 회신).
- **검증**: grep(App.tsx, src/) — Location.·coords·getCurrentPosition·takePicture·MediaLibrary·logout.
- **관련**: 웹 답변(①좌표 서버전송 ②토큰 삭제로직 ③리전·알림본문) 오면 Data Safety §3 위치 항목 정정 예정.

### Data Safety 위치 항목 정정 (웹팀 코드 확인 반영)
- **무엇**: PLAY_STORE_RELEASE §3.1 위치 행 정정 — **정밀=수집 안 함 / 대략=수집(저장 안 함)**. §3.2에 근거 문장 기록. 웹에 3건(위치권한 주체·카메라 실기능·토큰 삭제경로) + 앱 식별 방법 회신.
- **왜**: 웹이 코드 전 경로 확인해 "GPS 좌표는 온디바이스, 단 searchThisArea의 bbox는 URL 쿼리로 서버 전달" 회신 → 기존 "확실치 않아 안전하게 수집" 상태에 근거 확보.
- **결과**: 신고서가 사실과 정합. 정밀을 '수집'으로 두면 과다신고, 대략을 '수집 안 함'으로 두면 허위신고 — 둘 다 회피.
- **검증**: 앱 측 grep 재확인(위치 코드 1줄=권한요청만, 촬영/업로드 0건, 토큰 삭제 0건, QR은 브릿지 open-qr-scanner로만 열림).
- **관련**: 카메라 문구는 **웹에 QR 진입점 UI가 실제로 있는지** 확인 후 확정(없으면 기재 금지). 결제 차단용 앱 식별 = `window.__boheom.isApp`(UA 미설정, 클라이언트 분기 필요).

### 🔴 도달 불가 네이티브 기능 발견 → 스토어/심사 문서 정정
- **무엇**: 웹 확인(open-qr-scanner 호출부 0건) + 앱 코드 확인(앱 잠금 설정 UI 없음, setLockEnabled 유일 호출부가 브릿지) → **QR·생체잠금·공유·햅틱은 웹이 브릿지를 호출해야만 동작**. 현재 QR은 확정 도달 불가. PLAY_STORE_RELEASE 긴설명에서 "QR 스캔/공유/생체" 제거, §5 권한매핑 정정, IOS_SUBMISSION_PREP 심사노트를 **실제 도달 가능한 기능만**으로 재작성.
- **왜**: 없는 기능을 스토어 설명·심사노트에 적으면 허위 기재(리뷰어가 찾다 못 찾음). 8/7 거부 전례.
- **결과**: 심사노트 = 푸시 라우팅·유니버설링크·**카카오 OAuth 핸드오프(실검증됨)**·위치권한·갤러리저장·네이티브 런치(스플래시/오프라인/에러/뒤로가기)로 축소. ⚠️ **iOS 4.2(WebView 셸) 방어 논거가 약해짐** → CTO에 리스크 상향 보고.
- **검증**: 웹팀 grep 회신(3곳 전부 타입선언·주석) + 앱 grep(setLockEnabled 호출부, 촬영/업로드 0건).
- **관련**: CAMERA 권한은 **유지 판단** — 웹 파일첨부의 카메라 촬영 경로가 권한에 의존하는지 미검증이라 제거 시 회귀 위험(A-014 교훈) + vc7 재빌드로 테스터 배포 지연. 웹이 브릿지를 쓰기 시작하면 기능 되살림.

### Data Safety 위치 재정정 — "저장 안 함" 철회
- **무엇**: §3.1 대략 위치 행에서 **Ephemeral("저장 안 함") 체크 금지**로 변경, §3.2에 근거·정정이력 3단계 기록.
- **왜**: 웹(+CTO)이 정정 — bbox가 URL 쿼리라 **서버 접근 로그(Vercel)에 남음**. Play의 "Data is not stored"는 메모리 처리 후 무흔적일 때만 해당. **DB만 저장소로 본 것이 오판.**
- **결과**: 신고서가 사실과 정합(정밀=수집 안 함 / 대략=수집, ephemeral 미체크). 방침에도 "저장하지 않습니다" 문구 미사용 합의.
- **검증**: 웹 코드 사실(searchThisArea → router.push(`/map?bbox=`)) + Play Ephemeral 정의 대조. 과소 기재는 접근 로그로 반박 가능해 더 불리하다는 판단.
- **관련**: 같은 항목 3회 정정 — 확신 없으면 보수적 신고 원칙 재확인.

### 🔴 카카오 공유 실측 — 웹에서도 실패(도메인 미등록) 발견
- **무엇**: 홈 「친구에게 보험맵 공유하기」를 모바일 UA로 실제 클릭. 결과를 KAKAO_SHARE_ANALYSIS.md 최상단에 기록.
- **왜**: CTO 지시 "추정하지 말고 눌러보라"(웹 GlobalShareButton에 앱 브릿지 분기 없음 확인 후).
- **결과**: **sharer.kakao.com/picker/failed → KAPIError -401 "domain mismatched! caller=https://bohummap.com"**. 카카오 콘솔 [플랫폼>Web>사이트 도메인] 미등록이 원인. **앱/WebView 문제 아님 — 웹 브라우저에서도 실패.** 오너가 콘솔에서 등록해야 함(코드 변경 불필요). 부수 확인: JS SDK 미로드, **https 링크 방식(kakaolink:// 스킴 아님)** → Android <queries> 불필요 가능성↑, 단 앱에선 외부 브라우저로 이탈.
- **검증**: window.open/iframe/링크 후킹으로 실제 전송·팝업 차단 후 URL만 포착 → error 파라미터 base64 디코드. UA는 Android Chrome 에뮬레이트(모바일 경로 확인).
- **관련**: 선행=오너 콘솔 등록 → 그 다음 실기기 재확인 → 앱은 브릿지 네이티브 공유 분기 권고(앱 작업 0).

### 브릿지 도달성 확정 — haptic만 살아있음
- **무엇**: 웹 grep 결과(6종 발신 0건, haptic만 1곳) 수신 + 앱 `parseWebMessage` 확인 → **앱은 `v` 미검사**(type만 확인, 타입도 `v?: number` 선택) → **haptic은 코드상 도달 가능**. protocol.ts Capability 주석에 "광고 ≠ 도달 가능" 경고 + 실측 결과 명시.
- **왜**: 웹이 "haptic 봉투에 v:1 없음, ReactNativeWebView.postMessage 직접 호출 — 앱이 검사하면 버려진다" 질의.
- **결과**: 앱 수신부는 관대(v 무관, 원시 postMessage 정상 수신) → haptic 유일 생존. 나머지(share·biometric 2종·set-badge·toast·qr) 도달 불가 확정 — 스토어 설명·심사노트에서 이미 제거됨. **haptic은 심사노트에 넣지 않음**(실기기 진동 미검증 + 리뷰어 도달 어려운 화면 3곳).
- **검증**: protocol.ts parseWebMessage 실코드. tsc 통과(주석만 변경, 동작 변화 0).
- **관련**: capabilities 광고가 함정이었다는 CTO 지적 → 코드에 경고 상주시켜 재발 방지.
