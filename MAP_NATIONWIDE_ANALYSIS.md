# 전국 지점 지도(⑪) — 앱 영향 분석 (조건 매트릭스)

> CTO 지시: 분석만. 코드 미수정. 아직 미확정 기능.
> 앱은 WebView 셸 → 지도/마커/데이터는 **웹이 구현**, 앱은 **런타임(디바이스) 제약**만 관여.
> 관련: [KAKAO_LOGIN_VERIFY.md], perf 계측(src/features/diagnostics/perf.ts, dev-only).

---

## 1. 마커 대량 렌더 성능 (수천~수만 개)

현재 지도 표시 지점 = 1개. 전국 원수사 포함이면 **수천~수만 마커.** 타겟이 40~50대 폰(저사양 가능성).

| 조건 | 판정 |
|---|---|
| ✅ **클러스터링**(naver.maps MarkerClustering) + **뷰포트(bounds) 기반 로딩**(현재 화면 범위 마커만 fetch/렌더) + **줌별 상한** | **OK.** 임의 시점 렌더 마커가 수십~수백 → 저사양 WebView도 감당 |
| ⚠️ 전국 마커를 **한 번에 렌더**하거나 **전국 데이터 초기 일괄 로드** | **문제.** 저사양 폰에서 jank·메모리 압박·크래시 위험 |
| ⚠️ **HTML 커스텀 마커**(DOM 오버레이) 다량 | **문제 가중.** DOM 마커는 canvas/네이티브 레이어보다 훨씬 무거움 → 클러스터링 필수 |
| ⚠️ 전국 좌표를 단일 페이로드로 전송(수 MB) | **문제.** 로드 지연 + 데이터 요금. (우리 dev 계측 transferKB/resourceCount로 측정 가능) |

- **앱 측 레버 = 사실상 없음.** WebView는 웹 렌더 성능을 대신 최적화 못 함. 하드웨어 가속은 기본 ON.
- **검증은 실기기 필수**(vc8 렉과 같은 계열 — 저사양에서만 드러남). 오너 폰=최신이라 거기서 렉이면 저사양은 더 심함.
- **권고**: 웹이 **클러스터링 + bounds 로딩**으로 구현하면 앱 문제 없음. 그 방식이 아니면 실기기(저사양) 검증 전 출시 금지.

## 2. 마커 클릭 → 네이버 지도 외부 이동

앱 `src/webview/navigation.ts`의 현재 규칙:
```
EXTERNAL_SCHEMES = ['tel:', 'sms:', 'mailto:', 'kakaotalk:', 'kakaolink:', 'intent:']
shouldOpenExternally(url):
  - EXTERNAL_SCHEMES로 시작 → 외부앱 (Linking.openURL)
  - http(s) && bohummap.com 아님 → 외부 브라우저
  - 그 외(커스텀 스킴 등) → false = WebView 내부 처리 시도
```

| 웹 구현 방식 | 앱 동작 | 판정 |
|---|---|---|
| ✅ **https:// 네이버 지도 링크**(map.naver.com / naver.me) | shouldOpenExternally=true → 외부 브라우저/네이버앱 | **OK. 앱 변경 0.** (안드로이드: 네이버앱/브라우저 선택, iOS: 사파리/네이버앱) |
| ✅ **intent:// (안드로이드)** | EXTERNAL_SCHEMES에 있음 → openExternally | **OK(안드로이드).** iOS는 intent 미사용 |
| ⚠️ **nmap:// 커스텀 스킴** | EXTERNAL_SCHEMES에 **없음** → false → WebView가 내부 로드 시도 → 실패 | **문제. 죽은 클릭/에러.** 앱 변경 필요 |

**nmap:// 로 갈 경우 필요한 앱 변경(재빌드 동반)**:
1. `EXTERNAL_SCHEMES`에 `'nmap:'` 추가(1줄).
2. **iOS**: `app.json ios.infoPlist.LSApplicationQueriesSchemes: ['nmap']` 추가 — iOS는 canOpenURL/openURL 대상 스킴을 화이트리스트해야 열림. 없으면 iOS에서 조용히 실패.
3. 재빌드 필요(설정 변경).

- **권고**: **웹이 https 링크로 구현하면 앱 변경 0**(가장 깔끔). nmap://로 갈 거면 **사전 통보** → 위 1·2 준비(재빌드에 묶음).
- UX 참고(제품 몫): 마커 클릭마다 앱을 **나가는** 동선이라, "지도 브라우징"엔 맞지만 이탈 유발 — 이건 오너/제품 판단.

---

## 요약 (CTO 전달용)
- **성능**: 웹이 **클러스터링+bounds 로딩**이면 OK / 전국 일괄 렌더면 저사양 렉·크래시 위험. **실기기 검증 필수**, 앱 측 레버 없음.
- **외부 이동**: 웹이 **https 링크**면 앱 무변경 OK / **nmap:// 스킴**이면 앱에 스킴 추가 + iOS plist + 재빌드 필요. → **웹 구현 방식 확정 시 판정.**
- **오늘**: 코드 미수정. 웹 방식 정해지면 앱 받을 것 판정.
