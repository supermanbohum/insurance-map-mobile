# 보험맵 앱 ↔ 백엔드 연동 규칙 (BACKEND_INTEGRATION_RULES)

> 작성일: 2026-08-04
> 근거: 웹팀 공식 인수인계 문서 [APP_DEVELOPER_GUIDE.md](APP_DEVELOPER_GUIDE.md)
> 성격: 모바일 앱이 웹/앱 공용 Supabase 백엔드와 연동할 때 **반드시 준수해야 하는 규칙**. 위반 시 데이터 무결성·보안·웹 충돌 위험.

웹과 앱은 **같은 Supabase 프로젝트(DB/Auth/Storage)**를 공유하고 프론트만 분리된다. 백엔드 로직은 전부 웹팀이 관리하는 Postgres RPC/RLS/마이그레이션에 있다. 앱은 이 백엔드를 **재사용**하되 **절대 변경하지 않는다.**

---

## A. 절대 규칙 (Never)

| # | 규칙 | 이유 |
|---|---|---|
| N1 | 웹 저장소(`C:\Dev\Recovery\insurance-community-backup`)와 `supabase/migrations/`를 **절대 수정하지 않는다.** 스키마/RPC 변경이 필요하면 웹팀에 요청한다. | 백엔드는 웹팀 단일 소유. 앱이 마이그레이션을 만들면 스키마 충돌·이력 파손 |
| N2 | 앱 번들·클라이언트에 **`SUPABASE_SERVICE_ROLE_KEY`를 절대 포함하지 않는다.** anon 키만 사용. | 서비스롤은 RLS 전면 우회 = 치명적 보안 사고 |
| N3 | 테이블에 **직접 INSERT/UPDATE/DELETE 하지 않는다.** 쓰기는 100% RPC(`supabase.rpc()`). | 모든 테이블이 SELECT 정책만 존재 → 쓰기 정책 없음 → deny-by-default |
| N4 | 비공개 데이터(설계사 연락처, 인증 서류)를 테이블에서 **직접 읽지 않는다.** | 연락처는 `get_planner_contact`(크레딧 차감), 서류는 서버 발급 서명 URL로만 |
| N5 | **TOP설계사(`planner_certifications`)와 설계사 마켓(`planner_profiles`)을 혼동하지 않는다.** | 테이블/RPC/관리자화면 전부 별개 시스템. 통합 계획 없음 |
| N6 | 관리자 전용 기능(`/admin`, 서비스롤 필요)을 앱에 넣지 않는다. | 앱은 anon 권한만. 관리자는 웹 전용 |

---

## B. 판단 규칙 (Always)

| # | 규칙 | 근거 |
|---|---|---|
| A1 | "회원 여부"는 **프로필 행 존재 + `is_full_member()`**로 판단한다. `auth.uid()` 존재만으로 회원 판단 금지. | 미들웨어가 비로그인 방문자에게도 익명 세션 자동 발급 |
| A2 | **소셜 로그인(카카오/구글) 제거됨(2026-08-07, 웹).** 현재 회원가입/로그인은 **웹 폼(이메일 인증) 전용** → 실질적으로 **이메일 인증 회원만 존재**. 앱은 로그인 UI를 만들지 않고 웹 폼에 위임. 앱의 Google OAuth 우회는 A-001로 비활성화(휴면). | `is_full_member` = `provider='email' AND email_verified_at IS NOT NULL AND approved`. (과거 카카오/구글 "탐색 전용"은 소셜 제거로 해소) |
| A3 | 필드 수정은 **즉시반영 vs 재승인** 구분을 웹과 동일하게 반영. 불확실하면 WebView에 위임. | 지점·설계사 프로필 모두 필드별 정책 상이 (가이드 6·7절) |
| A4 | RPC 직접 호출 시 이름/파라미터는 **가장 큰 번호의 마이그레이션 정의**를 최종본으로 삼는다. | 같은 함수가 여러 마이그레이션에서 재정의됨 |
| A5 | 3개 identity(`users`/`ga_admin_users`/`admin_users`)를 섞지 않는다. 각각 별도 승인/활성 조건. | 하나의 Auth 세션 위 3개 독립 프로필 |

---

## C. 협업 규칙 (웹팀 인터페이스 — 요청 최소화)

앱이 웹팀에 요청하는 것은 최소로 유지한다. 현재 필요 목록:

| # | 요청 항목 | 시점 |
|---|---|---|
| W1 | **푸시 토큰 저장용 스키마/RPC 1개.** 앱은 Expo Push Token을 브릿지로 웹에 전달, 저장은 웹이 수행. | Phase 1 |
| W2 | 기존 인앱 알림(`planner_contact_view_notifications` 등)을 **Expo Push로 발송하는 트리거/함수.** (테이블은 이미 푸시 확장 가능하게 설계됨 — 가이드 15절) | Phase 1 |
| W3 | App/Universal Links 검증 파일 호스팅: `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association` | Phase 2 |
| W4 | (네이티브 채팅 도입 시) 채팅 라벨/아카이브 규칙·RLS 계약 확인 | Phase 4(선택) |

> 앱은 **절대 스스로 마이그레이션을 만들지 않는다.** 스키마가 필요하면 위 채널로 웹팀에 요청한다. ([BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md)의 `push-token` 흐름 참조)

---

## D. 전략 규칙 (하이브리드 원칙)

| # | 규칙 |
|---|---|
| S1 | 등록·수정·결제·관리자 등 **복잡/규제/자주 바뀌는 흐름은 WebView에 위임**한다. 앱은 푸시·딥링크·공유·생체인증·QR 등 **네이티브 이점**에 집중. |
| S2 | 네이티브 Supabase 직접 연동은 **성능이 필요를 증명한 화면**(예: 채팅)에서만 도입하고, 웹의 규칙(라벨 조인·자정 아카이브·RLS·RPC-only)을 **그대로 준수**한다. |
| S3 | 결제는 현재 **전부 스텁(항상 성공)**임을 인지한다. 실 PG 연동 전까지 앱 결제 플로우는 웹에 위임하고, 스토어 IAP 정책은 별도 검토한다. |
| S4 | OAuth 콜백(`/auth/callback`)과 커스텀 스킴(`boheommap://`)은 웹과의 계약으로 고정한다(구글 Custom Tab 우회는 이미 구현됨). |

---

## E. 충돌 위험 매트릭스 (요약)

| 위험 | 대응 규칙 |
|---|---|
| 익명 세션을 회원으로 오판 | A1 |
| 테이블 직접 쓰기 실패/무결성 훼손 | N3 |
| 푸시 토큰 저장이 웹 스키마 변경 유발 | W1, N1 |
| 서비스롤 키 노출 | N2 |
| 즉시반영/재승인 불일치 | A3, S1 |
| RPC 시그니처 드리프트 | A4, S1 |
| 채팅 이중 구현 불일치 | S2 |
| 결제 스텁 오해 | S3 |
| OAuth/딥링크 경합 | S4 |

---

## F. 자주 쓸 RPC / 뷰 빠른 참조 (읽기는 뷰, 쓰기는 RPC)

> 정확한 시그니처는 항상 웹 레포 `supabase/migrations/`의 최신 정의 확인(A4). 아래는 방향 참고용.

| 용도 | 방식 | 이름 |
|---|---|---|
| 현재 회원 조회 | 읽기 | `public.users`(auth_user_id로) + `is_full_member()` |
| 설계사 공개 프로필 목록 | 읽기(뷰) | `public_planner_profiles` |
| 설계사 연락처 확인(유료) | RPC | `get_planner_contact` |
| 열람 알림 목록/카운트/읽음 | RPC | `list_my_planner_contact_notifications` / `count_my_unread_planner_contact_notifications` / `mark_my_planner_contact_notifications_read` |
| 지점 신규 등록 | RPC | `submit_branch_registration` → `attach_registration_document` |
| 지점 즉시반영 수정 | RPC | `upsert_branch_contact` / `set_branch_insurers` / `create_branch_recruit` 등 |
| 지점 재승인 수정 | RPC | `save_branch_update_draft` → `submit_branch_update` |
| 설계사 즉시반영 수정 | RPC | `update_planner_market_profile_instant` |
| 설계사 재승인 수정 | RPC | `save_planner_trust_update_draft` → `submit_planner_trust_update` |
| 채팅 메시지 조회(라벨 포함) | RPC | `get_chat_message` (Realtime INSERT 구독과 함께) |
| TOP설계사 배지 요약(공개) | RPC | `get_branch_planner_badge_summary` |

---

> 이 문서는 [APP_DEVELOPER_GUIDE.md](APP_DEVELOPER_GUIDE.md)를 근거로 한 파생 규칙이다. 가이드가 갱신되면(마이그레이션 번호 상승) 이 규칙도 함께 검토한다.
