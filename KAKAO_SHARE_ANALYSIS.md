# 카카오톡 공유(Kakao.Share) in WebView — 조사 결과

## 🔴 실측 결과 (2026-08-11) — **공유가 지금 웹에서도 실패한다. 앱 문제가 아니다.**
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

**가장 유력한 원인: 등록 위치가 다르다.** 카카오 콘솔에는 도메인 입력란이 여러 곳이고 **서로 별개**다:
```
✅ 검사 대상   [내 애플리케이션 > 앱 설정 > 플랫폼 > Web] "사이트 도메인"   ← JS 공유·SDK가 보는 곳
❌ 무관        [앱 설정 > 앱 대표 도메인]        (CTO가 준 "대표 도메인=bohummap.com"이 이것일 가능성)
❌ 무관        [제품 설정 > 카카오 로그인 > Redirect URI]
❌ 무관        [앱 설정 > 비즈니스 > 도메인]
```
→ **오너 확인 요청**: [앱 설정 > **플랫폼 > Web**] 화면에 `https://bohummap.com` 과 `https://www.bohummap.com` 이 **둘 다** 들어 있는지, **저장**했는지. (스킴 `https://` 포함, 경로 없이 도메인만. 최대 10개 등록 가능)
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
