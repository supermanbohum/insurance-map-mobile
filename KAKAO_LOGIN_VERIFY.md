# 카카오 로그인 개통 — 앱 검증 (✅ 2026-08-09 통과)

## ✅ 결과 — 실기기 통과 (2026-08-09, vc6 APK, 오너 기기)
```
관문 2 (Custom Tab)  ✅ "브라우저창 뜨자마자 사라지고 카카오톡 이메일 입력→회원가입창 이동"
                        = Custom Tab 실행 = 인터셉션 작동 증거. 앱 안(WebView, 주소창 없음) 캡처 확인.
관문 5~6             ✅ /auth/callback 복귀 → kakaoMode 가입폼 → 제출 → 정회원(실시간 채팅 열림)
관문 8 (재로그인)     ✅ 재로그인 시 같은 계정 복귀(새 계정 생성 아님)
DB 확정              auth.users 카카오 계정 생성 · 이메일 정상 수신
폴백 A/B/C          미사용(불필요). 단 게이트 ON 전 손에 쥐고 있었던 것이 옳았음(실패 시 분 단위 복구).
```
**결론: 카카오 로그인 앱 경로 정상 작동.** Android JS발 nav→onShouldStartLoadWithRequest 발화 리스크는 **실기기에서 발화 확인됨**(Custom Tab이 떴으므로). oauth.ts는 HEAD에서 이미 `runOAuthAuthSession`(provider-agnostic)로 정합 — vc5/v6의 옛 이름 `runGoogleAuthSession`은 vc8에서 소멸.

> 아래는 게이트 ON 전 작성한 준비 문서(폴백 포함). 재발/회귀 대비 보존.

---

# (준비 문서) 카카오 로그인 개통 — 앱 검증 준비

> ⚠️ **코드 미수정.** 게이트(NEXT_PUBLIC_KAKAO_LOGIN_ENABLED) ON은 CTO 통보. 켜기 전 준비만.
> 목적: 켠 직후 **몇 분 안에 성공/실패 판정 → 실패 시 즉시 원인특정 + 게이트 OFF 요청 + 폴백 적용**.
> 이 흐름은 구글 로그인 제거 후 **한 번도 발화한 적 없음(inert)** — 카카오가 첫 실사용.

## 사전조건 (CTO 확인, 2026-08-09)
```
✅ account_email 선택동의 · /privacy 반영 · Supabase 허용목록 boheommap://auth-callback 추가
⏸ Vercel 게이트 NEXT_PUBLIC_KAKAO_LOGIN_ENABLED (오너 입력 대기)
```
앱 경로 완비: App.tsx:275 handleShouldStartLoad → isSupabaseAuthorizeUrl → handleOAuthAuthorize →
oauth.ts WebBrowser.openAuthSessionAsync(url, 'boheommap://auth-callback') → 복귀 URL을 APP_URL/auth/callback로 치환해 주입.

## 🔴 가장 불확실한 지점 (실기기로만 확정)
웹 `supabase.auth.signInWithOAuth()` → SDK가 **`window.location`을 authorize URL로 변경**.
**Android WebView에서 JS발 navigation이 `onShouldStartLoadWithRequest`를 발화시키는가?**
- 발화 O → 인터셉션 성공 → Custom Tab에서 로그인 → 앱 복귀 (설계대로)
- 발화 X → authorize가 **WebView 안에서** 열림 → Custom Tab 안 뜸 → 복귀 스킴 안 잡힘 (실패)
- ⚠️ react-native-webview는 **Android에서 JS발 navigation/redirect에 onShouldStartLoadWithRequest가 불안정하게 발화**하는 알려진 한계가 있음. **이게 이번 검증의 핵심 리스크.**

## 검증 체크리스트 (게이트 ON 직후 순서대로)
```
1. /signup 진입 → 카카오 버튼 노출
2. 버튼 탭 → Custom Tab(외부 브라우저) 뜨는가   ← WebView 안에서 열리면 이 시점 실패
3. 카톡 설치기기: 카톡 앱 전환 → 인증 → 복귀
4. 카톡 미설치기기: 카카오계정 웹 로그인 → 복귀
5. 복귀 후 WebView가 /auth/callback 로드하는가
6. 가입 폼(kakaoMode) 도달 → 제출 → 정회원 판정
7. 앱 완전 종료 후 재실행 → 세션 유지
8. 로그아웃 → 카카오 재로그인 → 기존 계정에 붙는가(새 계정 생성이면 사고=배포게이트5)  ← 제일 중요
+ iOS: ASWebAuthSession 복귀(app-switch) 확인 — KAKAO_LOGIN_RESEARCH의 iOS 복귀 리스크
```

## 실기기 로그 준비 (오너/CTO가 기기에서, 나는 실행 불가)
> ⚠️ **Alpha는 release 빌드라 앱 JS 로거(logger)가 조용함**(__DEV__ 게이트). 그래서 우리 console 로그는 안 뜸.
> 대신 **Custom Tab/브라우저 액티비티 실행 여부**로 2번 성패를 판정한다(이게 핵심 신호).

```bash
# 카카오 버튼 탭 시 외부 브라우저/Custom Tab이 뜨는지 = 인터셉션 성공 신호
adb logcat -c   # 클리어 후
adb logcat | grep -iE "ActivityTaskManager|ActivityManager|CustomTab|chrome|boheommap|auth-callback|supabase|kakao"
```
판정:
- 탭 직후 `START ... CustomTabActivity` 또는 chrome/browser 액티비티 → **인터셉션 성공(2번 통과)**.
- 브라우저 액티비티 없이 WebView가 kauth.kakao.com/supabase authorize를 로드 → **인터셉션 실패 → 폴백 적용.**
- 복귀 시 `boheommap://auth-callback` 또는 `bohummap.com/auth/callback` 나타나는지 → 5번.

## 🔧 실패 시 폴백 (미리 준비 — 코드는 게이트 실패 확인 후에만 적용)

### 2번 실패(Custom Tab 안 뜸, authorize가 WebView에서 열림)일 때
**폴백A(권장·robust): `onNavigationStateChange`에서 반응형 인터셉션.**
onNavigationStateChange는 JS발 nav에도 **실제 navigation 상태로 발화**하므로 onShouldStartLoad가 안 떠도 잡힌다.
```tsx
// App.tsx handleNavigationStateChange (현재 canGoBack만 설정) — 아래 가드 추가
const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
  setCanGoBack(navState.canGoBack);
  // 폴백: onShouldStartLoad가 JS발 nav를 못 잡을 때 authorize URL을 여기서 가로챈다.
  if (isSupabaseAuthorizeUrl(navState.url)) {
    webViewRef.current?.stopLoading();
    handleOAuthAuthorize(navState.url);
  }
}, [handleOAuthAuthorize]);
```
주의: authorize가 잠깐 로드되다 stop될 수 있음(경미한 깜빡임). 그래도 복귀는 Custom Tab으로 정상.

**폴백B(보완): `originWhitelist`로 supabase를 onShouldStartLoad로 강제 라우팅.**
```tsx
originWhitelist={['https://bohummap.com', 'https://*.bohummap.com', 'boheommap://*']}
// → supabase.co는 미화이트리스트라 WebView가 로드하지 않고 onShouldStartLoadWithRequest로 넘긴다.
// 부작용: 웹이 단일도메인이라 안전(타 origin 풀네비 없음). 지도 타일은 XHR/img라 무관.
```
**폴백C(해당 시): `setSupportMultipleWindows`.** 웹이 `window.open`(팝업)으로 OAuth를 열 경우에만. 현재 SDK는 window.location이라 우선순위 낮음. 팝업 흔적(로그) 보이면 재검토.

### 권장 순서
1. **폴백A 먼저**(가장 확실, 부작용 최소) → 2. 안 되면 A+B 병행 → 3. 팝업 흔적 시 C.
각 폴백은 **1커밋·즉시 새 Alpha 빌드 필요**(재빌드는 CTO). 그래서 게이트 ON 전에 이 패치를 손에 쥐고 있는 게 핵심.

### 8번 실패(재로그인 시 새 계정 생성)일 때
이건 **웹/Supabase 문제**(앱은 URL만 전달). 앱 폴백 없음 → 즉시 게이트 OFF + 웹에 이관. 앱은 사고 확대 안 시킴.

## 게이트 ON 전 준비 완료 조건
- [ ] 이 문서 숙지(오너/CTO 기기 담당자)
- [ ] adb logcat 필터 명령 대기
- [ ] 폴백 A/B 패치 스니펫 확보(위) — 실패 시 분 단위 적용
- [ ] iOS는 별도(ASWebAuthSession 복귀) — 안드로이드 먼저 검증
