# 웹 마스터 로드맵 — 모바일 앱 연동 관점 (WEB_MASTER_ROADMAP)

> 갱신: 2026-08-04
> 성격: **모바일 앱팀이 유지하는, "앱을 위해 웹이 해줘야 할 것" 동기화 문서.**
> ⚠️ 앱팀은 웹 저장소(`C:\Dev\Recovery\insurance-community-backup`)를 절대 수정하지 않는다. 이 문서는 요청/현황 정리이며, 실제 웹 구현은 웹 담당(다른 Claude)이 수행한다.
> 관련: [APP_DEVELOPER_GUIDE.md](APP_DEVELOPER_GUIDE.md) · [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md) · [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md)

---

## 1. 현재 모바일 앱 상태 (2026-08-04)

Phase 0 + Phase 1 완료(main 반영). 하이브리드(WebView + 네이티브 브릿지) 구조.
- 완료: 딥링크 · Native Share · 생체인증 앱잠금 · QR 스캐너 · 앱 UX(로딩바/에러재시도/pull-to-refresh/인앱토스트/햅틱) · Push 알림
- 브릿지 capabilities: `haptic, deeplink, share, biometric, qr-scan, push, badge`
- 출시 준비: 코드/설정 완료, 행정/에셋만 남음([PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md))

## 2. 웹이 구현/제공해야 할 항목 (우선순위)

| # | 항목 | 상태 | 세부 |
|---|---|---|---|
| W1 | **BridgeProvider가 `push-token` 수신 → `register_push_token` RPC 저장** | 웹 "준비됨"(사용자 확인) | 앱은 ready 직후 `{type:'push-token', token, platform}` 전송. 앱은 DB 직접 접근 안 함 |
| W2 | **`ready` 수신 → 앱 모드 전환** | 확인 필요 | `__boheom.on()`/`boheom:native` 구독. 앱 전용 UI 분기, 다운로드 배너 숨김 등 |
| W3 | **`/.well-known/assetlinks.json`** | 미완 | Android App Link 검증(package `com.bohummap.app` + 릴리스 SHA256) |
| W4 | **`/.well-known/apple-app-site-association`** | 미완 | iOS 유니버설 링크(appID `TEAMID.com.bohummap.app`) |
| W5 | **`/privacy` 개인정보처리방침** | 미완(Play 필수) | 카메라·위치·미디어·푸시 수집 고지 + 삭제 요청 경로 |
| W6 | 공유/QR 등 브릿지 헬퍼(폴백 포함) | 선택 | 앱이면 브릿지, 아니면 `navigator.share` 등 |
| W7 | 딥링크 경로 안정성 | 상시 | `/designer|branch|ga|chat|recruiting|notice/{id}` 변경 시 앱에 공유 |
| W8 | 푸시 발송 트리거 | 후속 | 채팅/리크루팅/열람알림 이벤트 → Expo Push(`data.path` 포함) |

## 3. 딥링크 경로 계약 (실제 웹 라우트 기준, 2026-08-07 확인)

| 경로 | 화면 |
|---|---|
| `/branch/{slug}` | 지점 상세 (id 아님, **slug**) |
| `/ga/{slug}` | GA 상세 |
| `/planner-market/{plannerId}` | 설계사 프로필(설계사마켓) |
| `/post/{id}` | 커뮤니티 글 |
| `/board/{category}` | 게시판(공지=`/board/notice`) |
| `/chat` | 채팅 — **단일 글로벌 룸(roomId 없음)** |
| `/top-designer`(+`/{id}`) | TOP 설계사 |
| `/salary-ranking`(+`/{year}`,`/hall-of-fame`,`/detail/{id}`) | 연봉 랭킹 |
| `/region/{sido}`(+`/{sigungu}`) | 지역 |
| `/my`, `/planner-market/notifications` | 마이/알림 |
| `/partner/branches/{branchId}/performance` | 파트너 성과 — **문의 도착 푸시 착지점** |
| `/partner/*`, `/admin/*` | 파트너센터/관리자(로그인 게이트) |
| `/auth/callback` | OAuth 복귀(앱이 별도 처리, 딥링크 무시) |

> 구경로(`/designer`,`/chat/{id}`,`/notice`,`/recruiting`,`/ads`)와 미지/스텁 경로는 앱 `resolve.ts`가 신경로 매핑 또는 홈으로 안전 폴백(404 방지). 웹이 라우트를 추가/변경하면 이 표 + 앱 `resolve.ts`의 `KNOWN_TOP`를 갱신.

## 4. 푸시 페이로드 계약

서버 → Expo Push 메시지의 `data`(**실제 라우트로 보낼 것**):
```json
{ "kind": "chat|profile-view|branch|ga|post|salary-ranking", "path": "/planner-market/42", "id": "42", "badge": 3 }
```
- 앱은 알림 탭 시 `data.path`를 실제 라우트로 매핑해 이동. 채팅은 항상 `/chat`.
- `badge`(선택)는 앱 아이콘 뱃지에 반영 가능.

## 5. 변경 이력
- 2026-08-04: 최초 작성(Phase 1 완료 + Play 출시 준비 시점). 앱↔웹 계약/요청 정리.
- 2026-08-07: 딥링크/푸시 경로 계약을 실제 웹 라우트로 정합화(A-002). `/designer|chat/{id}|notice|recruiting|ads` → 신경로/폴백.
