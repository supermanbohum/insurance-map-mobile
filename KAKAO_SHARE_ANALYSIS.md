# 카카오톡 공유(Kakao.Share) in WebView — 조사 결과

# ✅ 최종 결론 (2026-08-11 종결) — **앱 변경 없음. 재빌드 사유 없음.**
```
③ 오너 실기기 결과 = ⓐ "문제없이 공유됨" (카카오톡 정상 실행)
④ 판정 확정:
   intent:// 처리        RN Linking.openURL이 정상 처리함 (우려했던 Uri.parse 실패 없음)
   Android <queries>     ❌ 불필요  ← 잠정 판정이 실기기로 확정됨
   kakaolink 재조립 대응안 ❌ 불필요  ← 준비만 하고 미사용
   재빌드                ❌ 불필요. vc7 그대로 간다
```
**검증 경로 4단계 전부 통과**: ①SDK 도메인 등록(오너) → ②데스크톱 UA(CTO·앱팀, 양쪽 호스트) → ②모바일 UA 스킴 캡처(앱팀) → ③실기기(오너).

### 📌 준비했으나 쓰지 않은 대응안 — **폐기하지 않고 근거와 함께 보존**
> 다음 사람이 같은 우려를 처음부터 다시 판단하지 않도록 남긴다.
- **우려였던 것**: `intent://send?…#Intent;scheme=kakaolink;…`를 RN `Linking.openURL`이 `Uri.parse` 기반으로 처리해 **ActivityNotFoundException**이 날 수 있다(폴백 URL도 없어 무반응). → **실기기에서 정상 동작 확인, 기우였음.**
- **준비했던 대응안(미사용)**: `intent://`를 만나면 fragment의 `scheme=kakaolink`를 읽어 `kakaolink://send?…`로 재조립해 openURL. `kakaolink:`는 이미 `EXTERNAL_SCHEMES`에 있음.
- **`<queries>` config plugin이 불필요한 이유**: 캡처된 URL에 **`package=` 지정이 없다** → 특정 패키지 **조회**가 아니라 **암시적 인텐트 실행(startActivity)** 이라, Android 11+ 패키지 가시성 제한 대상이 아니다.
- **재검토 조건**: 카카오 SDK가 향후 `package=com.kakao.talk`를 붙이거나 `canOpenURL` 기반 분기를 쓰기 시작하면 그때 다시 판단.

### 📌 share 브릿지(앱 이탈 없는 네이티브 공유) — **착수 조건 변경**
ⓐ로 확인되어 **사용자 경험은 이미 온전하다**(카카오톡이 정상 실행). 따라서 지금 붙일 이유가 약하다.
→ **착수 조건: Apple 개발자 가입 완료 + iOS 심사 준비 시점**(4.2 방어 보강용). 그 전에는 착수하지 않는다. 앱 수신부는 이미 구현돼 있어 웹 분기 한 줄이면 되고 재빌드도 불필요하다.

---

## ✅ 해결 확인 (2026-08-11, 오너가 JavaScript SDK 도메인 등록 후 재실측)
```
데스크톱 UA   bohummap.com      → window.open("https://sharer.kakao.com/picker/link")   ✅ 정상 picker
             www.bohummap.com  → 동일 ✅                     (이전: /picker/failed -401)
SDK 상태      kakao.min.js 2.8.2 로드 + isInitialized() === true   (이전: window.Kakao 자체가 없었음)
error 파라미터 없음
```
→ **웹 카카오 공유 살아났다. 원인은 확정대로 ①JavaScript SDK 도메인 미등록이었다.** 양쪽 호스트 모두 통과.

### 🔴 그런데 **모바일 UA에서는 동작이 다르다** — 앱 판정에 직결
같은 버튼을 **모바일 UA(Android Chrome 에뮬레이트)**로 누르면:
```
window.open 호출 없음 · 페이지 이동 없음 · iframe 없음 · 에러 없음  → 브라우저에선 "아무 일도 없음"
```
= SDK가 **모바일 경로(카카오톡 앱 실행 = 커스텀 스킴/인텐트)**를 시도하고, 데스크톱 Chromium엔 카카오톡이 없어 조용히 끝난 것으로 판단된다.
### ✅ 스킴 실물 캡처 성공 (Navigation API 후킹, 모바일 UA)
`window.navigation`의 `navigate` 이벤트로 **커스텀 스킴 이동 시도까지 포착**했다(총 6,951자):
```
intent://send?appkey=1c136b8d…&appver=1.0&linkver=4.0&extras={"KA":"sdk/2.8.2 os/javascript …}
        …&template_id=3139#Intent;scheme=kakaolink;launchFlags=0x14008000;end;
```
| 항목 | 값 | 판정 의미 |
|---|---|---|
| 스킴 | **`intent://`** (kakaolink:// 직접 아님) | Android intent scheme |
| Intent fragment | `#Intent;scheme=kakaolink;launchFlags=0x14008000;end;` | 실제 목표 스킴은 **kakaolink** |
| **`package=`** | **없음** | 패키지 미지정 = **암시적 인텐트** → `startActivity`는 Android 11+ 가시성 제한과 무관 → **`<queries>` 불필요 가능성 높음** |
| **`S.browser_fallback_url=`** | **없음** | 실패해도 **폴백이 없다** → 실패 시 "아무 일도 안 일어남"(ⓑ)이 된다 |

**→ ④ Android `<queries>` 판정: 필요 없을 가능성이 높다**(패키지 조회가 아니라 암시적 인텐트 실행이므로). ⚠️ **대신 새 변수가 드러났다**:
> **RN `Linking.openURL("intent://…")`이 이 URL을 처리하지 못할 수 있다.** RN Android는 `Intent.parseUri(url, URI_INTENT_SCHEME)`가 아니라 `Uri.parse`로 처리하므로, `intent://`를 그대로 열면 **ActivityNotFoundException**이 날 수 있다(브라우저/WebView가 하던 파싱을 앱이 대신 해야 함). 폴백 URL도 없어 조용히 실패한다.
>
> **대응안(실기기 결과가 ⓑ일 때만 적용)**: `intent://` 를 만나면 fragment의 `scheme=kakaolink`를 읽어 **`kakaolink://send?…`로 재조립해 `openURL`** 한다(1~2줄). `kakaolink:`는 **이미 EXTERNAL_SCHEMES에 있다** ✅. 재빌드 필요.

⚠️ **단정하지 않는다**: RN 버전별 동작 차이가 있을 수 있어 **실기기 결과로 확정**한다. 아래 3분기 그대로:
```
오너 폰에서 앱의 공유 버튼 클릭 시
  ⓐ 카카오톡이 열린다        → 스킴 정상 처리. Android <queries> 불필요 or 이미 충족
  ⓑ 아무 일도 안 일어난다     → 🔴 스킴 차단. Android <queries>(com.kakao.talk) config plugin + 재빌드 필요
  ⓒ 외부 브라우저로 sharer.kakao.com 이 열린다 → https 폴백. 동작하나 앱 이탈
```

---

## (이력) 실측 결과 (2026-08-11 오전) — **공유가 웹에서도 실패했다. 앱 문제가 아니었다.**
홈 히어로의 「친구에게 보험맵 공유하기」를 **모바일 UA(Android Chrome/Pixel 8 에뮬레이트)에서 실제로 클릭**한 결과:
```
이동한 URL : https://sharer.kakao.com/picker/failed?app_key=1c136b8d…&error=…
error(base64 디코드):
  {"name":"KAPIError",
   "msg":"domain mismatched! caller=https://bohummap.com. check out registered web domains.",
   "code":-401, "recovery_action":"NONE"}
화면 문구  : "요청 실패 / 잘못된 요청으로 인증에 실패하였습니다"
```
→ **원인: 카카오 개발자 콘솔의 [플랫폼 > Web > 사이트 도메인]에 `https://bohummap.com`이 등록돼 있지 않음.**
※ CTO가 준 "앱 대표 도메인 = https://bohummap.com"과 **별개 설정**이다. 대표 도메인만으로는 JS 공유가 통과하지 않는다. app_key는 JavaScript 키와 일치 → **키는 맞고 도메인 등록만 빠졌다.**
→ **조치 주체: 오너(카카오 콘솔). 앱·웹 코드 변경 불필요.** 등록 후 재확인하면 된다.

### 🔴 재확인 (오너 등록 직후, 2026-08-11) — **여전히 실패. "www 유무" 가설은 반증됨**
오너가 `https://bohummap.com`을 추가했다는 통보를 받고 **양쪽 호스트에서 각각 클릭**(실제 전송은 후킹으로 차단):
```
https://bohummap.com      → picker/failed · "domain mismatched! caller=https://bohummap.com"
https://www.bohummap.com  → picker/failed · "domain mismatched! caller=https://www.bohummap.com"
                             ^^^^ 등록돼 있었다던 www 도 거부됨
```
**두 호스트 모두 거부** → 원인은 www 유무가 아니다. **카카오가 검사하는 곳에 우리 도메인이 하나도 등록돼 있지 않다는 뜻.**

**원인 = 도메인 등록. 단 등록해야 할 곳이 두 군데이고 서로 별개다** (카카오 공식 문서로 확정, 2026-08-11 앱팀 직접 확인 + CTO 원문 인용):

| # | 설정 | 콘솔 위치 | 용도 | 현재 |
|---|---|---|---|---|
| ① | **JavaScript SDK 도메인** | `[앱] > [앱 설정] > **플랫폼 키** > JavaScript 키 카드` | **JS 키를 쓸 수 있는 호출 도메인**. 「JavaScript 키는 등록된 JavaScript SDK 도메인에서만 사용할 수 있으며, **이외에서의 요청은 거절됩니다**」 | 🔴 **미등록 = -401의 직접 원인** |
| ② | **웹 도메인** | `[앱] > [제품 링크 관리] > [웹 도메인]` | **스크랩 대상 웹페이지** 도메인. 「스크랩할 웹 페이지의 도메인은 … [제품 링크 관리] > [웹 도메인]에 등록돼 있어야 합니다」 | ✅ 오너가 등록함 |

→ **오너가 등록한 건 ②였고, `-401 domain mismatched(caller=…)`는 ①이 막고 있는 것이다.** ②만으로는 안 풀린다.
→ **오너 조치**: **①[플랫폼 키 > JavaScript 키 > JavaScript SDK 도메인]** 에 `https://bohummap.com`(+필요시 `https://www.bohummap.com`) 등록 후 저장.
※ 카카오 문서: http/https는 한쪽만 등록해도 둘 다 사용 가능. **단 www 유무는 별개 호스트로 취급되므로 둘 다 쓰려면 둘 다 등록.**
※ 앱 키 대조 완료: 오너 콘솔 JavaScript 키 = 우리 `NEXT_PUBLIC_KAKAO_JS_KEY` = `1c136b8d…` **일치**(앱/키 불일치 가능성 소거).

> 🔻 **경로 정정 이력**: ①앱팀 "플랫폼 > Web 사이트 도메인"(메뉴명은 낡았으나 **대상은 옳았음**) → ②CTO가 콘솔 메뉴에 "플랫폼"이 없다는 이유로 "제품 링크 관리"로 정정 → ③**카카오 공식 문서 원문으로 재정정: 둘 다 필요하며 -401은 JavaScript SDK 도메인 쪽**. **화면에 메뉴 이름이 안 보인다고 그 개념이 없는 게 아니었다.**
※ app_key는 JavaScript 키와 일치하므로 **다른 앱을 보고 있는 것은 아님**. 반영 지연 가능성도 남아 있어 **재등록 확인 후 재시도**하면 판정된다.

## ✅ 부수 확인 — 구현 방식이 예상과 달랐다(앱에 유리)
```
window.Kakao        undefined  (JS SDK 로드 안 됨, kakao script 태그 0개)
실제 동작            sharer.kakao.com/picker 로 **https 이동**
```
→ **`kakaolink://` 커스텀 스킴이 아니라 https 링크 방식**이다. 따라서:
- 아래 §3에서 우려한 **Android `<queries>` config plugin이 필요 없을 가능성이 높다**(커스텀 스킴을 앱이 열 필요가 없음).
- 앱에서는 sharer.kakao.com이 bohummap.com이 아니므로 `shouldOpenExternally` → **외부 브라우저로 열린다**(현재 동작). 기능은 되지만 **사용자가 앱을 벗어난다.**
- ⚠️ 단 도메인 등록 후 카카오가 **모바일에서 스킴으로 분기**할 수도 있으므로, 등록 후 **실기기 재확인 필요**(그때 §3 queries 판단을 확정).

## 권고
1. **[오너] 카카오 콘솔에 웹 사이트 도메인 등록** → 그래야 웹·앱 양쪽에서 공유가 산다. **이게 선행**이다.
2. **[웹] 앱에서는 브릿지 네이티브 공유로 분기**(`window.__boheom.isApp` → `send({type:'share',…})`) → 앱을 벗어나지 않고 카카오톡 포함 전 앱으로 공유. 앱 수신부는 이미 구현돼 있어 **앱 작업·재빌드 0**.
3. 위 1이 끝난 뒤 **실기기에서 재확인**(스킴 분기 여부 → queries 필요성 확정).

---


> CTO 요청: 조사만. 코드 미수정. ⚠️ 앱팀 **실기기·빌드 검증 불가** → 코드/문서로 확인 가능한 것만. 실기기 필요 항목은 **[기기]** 표시.
> 근거: Expo SDK 57 문서(docs.expo.dev/versions/v57.0.0/sdk/linking, docs.expo.dev/linking/into-other-apps) 직접 확인.
> 카카오 앱: 비즈앱 ID 1521008, 네이티브키 14957dc0…, JS키 1c136b8d…, 대표도메인 bohummap.com.

---

## 1. 현재 WebView의 커스텀 스킴 처리 (실코드 확인)
```
constants.ts  EXTERNAL_SCHEMES = ['tel:','sms:','mailto:','kakaotalk:','kakaolink:','intent:']
navigation.ts shouldOpenExternally: EXTERNAL_SCHEMES로 시작 → true
              openExternally: Linking.openURL(url)   ← canOpenURL 아님(openURL만)
App.tsx       handleShouldStartLoad: shouldOpenExternally(url) → openExternally(url); return false
```
→ **`kakaolink://`·`intent://`·`kakaotalk://`는 이미 "외부 앱으로 넘김" 대상**(WebView 내부 로드 안 함). **스킴 라우팅 코드는 이미 있다.** openURL만 쓰므로 iOS canOpenURL 화이트리스트 의존도 낮음.

⚠️ **[기기] 미검증 전제**: Kakao.Share는 보통 `window.location`을 kakaolink://(또는 intent://)로 바꾼다. **Android WebView가 이 JS발 nav에 onShouldStartLoadWithRequest를 발화시키는지**가 전제. 카카오 로그인은 https(authorize)로 발화 확인됐지만, **커스텀 스킴(kakaolink://) 핸드오프는 아직 실기기 검증 안 됨**(로그인은 Custom Tab이었고 앱전환 스킴이 아니었음).

## 2. Expo v57 기준 외부 앱 열기 요건
- `Linking.openURL(url)` = "설치된 앱으로 URL 열기 시도". intent:// URL도 처리(단 Android 11+ 가시성 영향).
- 우리 스킴(boheommap)은 수신용으로 이미 정의됨 — 이건 "남을 여는 것"과 별개.
- **결론: openURL 경로는 갖춰져 있음.** 관건은 아래 3·4(플랫폼 패키지 가시성).

## 3. 🔴 Android 11+ (API 30+) — `<queries>` 선언 필요 (v57 문서 확인)
- 문서: **"Android 11+에서는 앱이 다룰 인텐트/패키지를 AndroidManifest에 명시해야 한다."** 없으면 openURL이 KakaoTalk을 **못 찾아 조용히 실패**할 수 있음(패키지 가시성 제한).
- ⚠️ **Expo app.json엔 `android.queries` 내장 필드가 없다** → **config plugin(withAndroidManifest) 작성 필요.** 현재 우리 app.json엔 queries 없음.
- 필요 선언(예): 카카오톡 패키지 `com.kakao.talk` + kakaolink 스킴.
- **→ Android는 config plugin + 재빌드가 필요할 가능성 높음**(kakaolink:// 방식이면).
- 대안: 웹이 **intent:// URL**(package=com.kakao.talk + 브라우저 fallback 포함)로 만들면 fallback 덕에 더 견고할 수 있으나, **패키지 가시성은 동일하게 적용** → queries 권장.

## 4. iOS — `LSApplicationQueriesSchemes`
- v57 문서: **openURL엔 필수 아님**(canOpenURL에만 필수). 우리는 openURL만 쓰므로 **iOS는 화이트리스트 없이도 열릴 가능성.**
- 단 **신뢰성/카카오 권장**: `ios.infoPlist.LSApplicationQueriesSchemes: ['kakaolink','kakaotalk','kakaokompassauth','kakaoplus']` 추가 권장(카카오 SDK가 내부적으로 canOpenURL 쓰는 경우 대비).
- 설정 위치(app.json):
```json
"ios": { "infoPlist": { "LSApplicationQueriesSchemes": ["kakaolink","kakaotalk","kakaokompassauth","kakaoplus"] } }
```
- **→ iOS는 openURL이라 무변경으로도 될 가능성, 신뢰성 위해 plist 추가 권장(재빌드 동반).**

---

## 조건 매트릭스 (되는 조건 / 문제 조건)
| 상황 | 판정 |
|---|---|
| 웹 Kakao.Share가 kakaolink:// 발생 + **onShouldStartLoad 발화(Android)** + KakaoTalk 설치 + queries 있음 | ✅ 앱전환 공유 |
| queries **없음**(현재) + Android 11+ | ⚠️ **openURL이 KakaoTalk 못 찾아 조용히 실패 가능** → config plugin+재빌드 필요 |
| onShouldStartLoad가 **JS발 kakaolink nav를 안 잡음**(Android) | ⚠️ WebView 내부 로드 시도→실패. → 폴백(onNavigationStateChange 인터셉션, 카카오로그인 폴백과 동형) 필요 |
| iOS openURL | ✅ 될 가능성(화이트리스트 없이). 신뢰성 위해 plist 권장 |
| 카카오톡 **미설치** 기기 | 웹 Kakao.Share가 보통 웹 공유(카카오계정 웹)로 fallback — 웹 SDK 동작에 의존 |

## 권고 (실행은 웹 구현 확정 후)
1. **웹 구현 방식부터 확인**: kakaolink:// 인가 intent:// 인가, 그리고 미설치 fallback 처리.
2. **가장 가능성 높은 앱 작업(재빌드 1회에 묶음)**:
   - Android: **config plugin으로 `<queries>`(com.kakao.talk + kakaolink 스킴) 추가** — 이게 핵심.
   - iOS: `LSApplicationQueriesSchemes` 추가(신뢰성).
   - 폴백: onShouldStartLoad 미발화 시 onNavigationStateChange에서 kakaolink/intent 인터셉션(카카오 로그인 폴백 A와 동형 — 이미 검증된 패턴).
3. **네이티브 SDK 도입 불필요**(WebView 셸 유지) — 웹 JS 공유 + 스킴 핸드오프로 충분할 것. queries/plist가 "스킴 처리 한 줄"에 해당하는 실제 작업.
4. ⚠️ **전부 실기기 검증 필수** — "웹에선 되는데 앱에서 조용히 죽는" 전형 자리(카카오 로그인 때 Supabase 허용목록 한 줄과 동일 계열). 검증 전 "된다" 단정 금지.

## 앱팀이 지금 확정할 수 있는 것 / 없는 것
- ✅ 확정: kakaolink/intent/kakaotalk 스킴은 이미 EXTERNAL_SCHEMES에 있어 **외부 넘김 경로는 존재**. openURL 사용. queries·LSApplicationQueriesSchemes는 **현재 없음**.
- ❌ 미확정(기기 필요): 실제 KakaoTalk 앱 전환 성공 여부, Android 11+ queries 없이도 되는지, onShouldStartLoad 발화 여부.
