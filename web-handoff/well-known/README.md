# App Links 검증 파일 (웹 배치용) — B3

> 목적: `https://bohummap.com/...` 링크를 **앱이 설치돼 있으면 앱으로** 열기(Android App Links / iOS Universal Links).
> 없으면 https 링크가 브라우저로 열려 앱 설치 이점이 죽는다. (커스텀 스킴 `boheommap://` 는 이것과 무관하게 이미 동작)
>
> ⚠️ 앱팀은 웹 저장소를 수정하지 않는다. 이 폴더는 **웹팀이 그대로 배포**하도록 만든 딜리버러블이다.

## 배포 위치 (웹)
| 파일 | 서빙 경로 | Content-Type |
|---|---|---|
| `assetlinks.json` | `https://bohummap.com/.well-known/assetlinks.json` | `application/json` |
| `apple-app-site-association` | `https://bohummap.com/.well-known/apple-app-site-association` | `application/json` (**확장자 없음**, 리다이렉트 금지) |

두 경로 모두 **200 + 인증 없이 공개**여야 하고 https여야 한다.

## CTO가 채워야 할 값 (앱팀은 실값 미보유)
1. **`REPLACE_WITH_RELEASE_KEYSTORE_SHA256`** — 릴리스 키스토어 SHA-256 지문.
   - EAS Credentials 화면에 `45:49:...:F8:62` 형태(콜론 구분 대문자 HEX)로 노출. 그 값을 그대로 넣는다.
   - 값이 잘못되면 Android가 검증 실패 → 링크가 앱으로 안 열림(에러는 안 남, 조용히 실패).
2. **`REPLACE_APPLE_TEAM_ID`** — Apple Developer 팀 ID(10자, 예 `ABCDE12345`).
   - 최종 appID 형태: `ABCDE12345.com.bohummap.app`.

패키지/번들 ID는 확정값(`com.bohummap.app`)이라 채워져 있다.

## 검증 방법 (배포 후)
- Android: `https://developers.google.com/digital-asset-links/tools/generator` 또는
  `adb shell pm verify-app-links --re-verify com.bohummap.app` 후 `adb shell pm get-app-links com.bohummap.app` 가 `verified`.
- iOS: 기기에서 메모앱에 `https://bohummap.com/branch/xxx` 붙여넣고 롱프레스 → "보험맵에서 열기" 뜨면 성공.
- AASA 캐시: iOS는 CDN 캐시가 있어 앱 재설치/기기 재부팅 후 반영될 수 있음.

## 앱 쪽 이미 완료 (재확인용)
- `app.json` android.intentFilters: host `bohummap.com`, `autoVerify: true` ✅
- `app.json` ios.associatedDomains: `applinks:bohummap.com` ✅
- 딥링크 라우팅: `resolve.ts` 패스스루(도메인 bohummap.com 고정) ✅
→ **웹이 위 2파일만 배포하면 검증이 켜진다.** 앱 코드 추가 변경 불필요.

## AASA 최신 포맷(선택)
iOS 13+는 `details[].components` 형식도 지원한다. 현재는 호환성 넓은 `paths: ["*"]` 사용.
특정 경로만 앱으로 열려면(예: `/auth/*` 제외) 웹팀이 아래처럼 교체 가능:
```json
{ "appID": "TEAMID.com.bohummap.app", "components": [ { "/": "/auth/*", "exclude": true }, { "/": "*" } ] }
```
단 OAuth 복귀는 커스텀 스킴(`boheommap://auth-callback`)이라 https universal link와 충돌하지 않음 → 현재는 `*` 로 충분.
