# 보험맵(bohummap.com) 앱 개발자 가이드

> 출처: 보험맵 웹(PWA) 담당 Claude가 작성한 **공식 인수인계 문서** (2026-08-04 전달분, 마이그레이션 0045 기준).
> 이 파일은 웹팀이 전달한 원문을 모바일 저장소에 보존한 것이다. **웹 저장소(`C:\Dev\Recovery\insurance-community-backup`)와 웹 코드는 절대 수정하지 않는다.**
> 모바일 관점의 요약·충돌검토·준수규칙은 [BACKEND_INTEGRATION_RULES.md](BACKEND_INTEGRATION_RULES.md) 참고.

이 문서는 보험맵 웹(PWA)을 담당하는 Claude가, 모바일 앱을 담당하는 Claude/개발팀에게 전달하는 공식 인수인계 문서입니다. 웹과 앱은 **같은 Supabase 프로젝트(같은 DB/Auth/Storage)를 공유**하지만 프론트엔드는 완전히 분리되어 있습니다. 이 문서는 "앱이 웹의 백엔드를 그대로 재사용하려면 무엇을 알아야 하는가"에 초점을 맞춥니다.

- 웹 레포: `C:\Dev\Recovery\insurance-community-backup` (Next.js 14 App Router)
- 운영 도메인: https://bohummap.com (Vercel 배포)
- 마지막 갱신: 2026-08-04 기준, 마이그레이션 `0045`까지 적용됨

---

## 1. 프로젝트가 하는 일

보험맵은 보험대리점(GA) 디렉터리 서비스에서 출발해, 현재는 **GA/지점/설계사가 서로를 찾는 양방향 리크루팅 플랫폼**으로 확장 중입니다. 핵심 축은 4가지이며, **서로 독립적으로 운영**됩니다(하나를 등록해도 다른 권한이 생기지 않음):

1. **일반 회원** — 카카오/구글/이메일 로그인, 즐겨찾기·실시간채팅·GA 소속 변경요청 이용
2. **설계사 등록(설계사 마켓, 리크루팅)** — 구직 중인 설계사가 공개 프로필 등록, GA가 유료 열람권으로 연락처 확인
3. **지점 등록** — GA가 자기 지점을 등록/관리, 관리자 승인 후 지도·검색에 노출
4. **TOP설계사 인증** — 지점 소속 고소득 설계사 인증 배지 (설계사 마켓과 **완전히 별개** 시스템, 절대 혼동 금지 — 8절 참고)

---

## 2. 기술 스택 & 환경변수

- **프론트엔드**: Next.js 14 (App Router), React Server Components 위주, `'use server'` Server Actions로 쓰기 처리
- **백엔드**: Supabase (Postgres + Auth + Realtime + Storage), 별도 백엔드 서버 없음 — 모든 로직이 Postgres RPC(`SECURITY DEFINER` 함수)에 있음
- **배포**: Vercel (웹만). Supabase 프로젝트는 웹/앱 공용
- **결제**: PG 미연동 상태, 스텁 프로바이더로 항상 성공 처리 (10절 참고)

환경변수 (앱에서도 동일하게 필요):

| 변수 | 공개 여부 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | anon 클라이언트 키 (RLS 적용됨) |
| `SUPABASE_SERVICE_ROLE_KEY` | **비공개** | 관리자 전용 서버사이드 클라이언트 키. 절대 클라이언트/앱 번들에 포함 금지 |

Storage 공개 파일 URL 패턴 (버킷이 public인 경우): `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}`

---

## 3. 인증 구조 — 반드시 이해해야 하는 3개의 독립된 identity 시스템

가장 중요한 개념입니다. 보험맵에는 **하나의 Supabase Auth 세션 위에 3개의 서로 다른 프로필 테이블**이 있고, 각각 별도의 승인/활성 조건을 가집니다. 앱에서 "로그인됨"을 판단할 때 이 셋을 절대 섞으면 안 됩니다.

### 3.1 미들웨어의 익명 세션 (매우 중요)

`src/middleware.ts`는 `/admin`을 제외한 모든 요청에서, 기존 Supabase 세션이 없으면 `supabase.auth.signInAnonymously()`를 자동 호출합니다. **즉 로그인하지 않은 방문자도 `auth.uid()`가 항상 존재하고 `role='authenticated'`입니다.** 그래서 RLS/RPC에서 절대로 `auth.uid() is not null`만으로 로그인 여부를 판단하면 안 되고, 반드시 아래 헬퍼로 실제 프로필 존재 여부까지 확인해야 합니다. 앱도 동일한 함정을 피해야 합니다 — Supabase 세션이 있다고 "회원"인 게 아닙니다.

### 3.2 일반 회원 (`public.users`)

- 로그인 수단: 카카오 OAuth / 구글 OAuth / 이메일+비밀번호(+이메일 인증)
- 소셜 로그인은 `/auth/callback`(OAuth 콜백)에서 최초 로그인 시 `users` 행을 자동 생성. 이메일 로그인은 이메일 인증 완료 시점(`confirm_email_signup` RPC)에 프로필을 생성합니다(회원가입 즉시가 아님 — auth.uid()가 확실히 유효한 시점까지 미룬 구조).
- `provider` 컬럼: `'kakao' | 'google' | 'email'`. OAuth 콜백에서 `auth.user.app_metadata.provider` 기준으로 기록됩니다.
- **"완전한 회원"(is_full_member) 조건**: `provider='email' AND email_verified_at IS NOT NULL AND approval_status='approved'`. 즉 **카카오/구글 로그인 사용자는 "탐색 전용"이며 채팅·지점등록·설계사등록 등 실사용 기능에는 이메일 인증 완료 회원만 가능**합니다. SQL 헬퍼: `public.is_full_member()`.
- 세션 조회: `src/lib/auth/session.ts` → `getCurrentUser()` (앱에서 동일 로직을 직접 구현하려면 `supabase.auth.getUser()` 후 `public.users`를 `auth_user_id`로 조회)
- `public.users`는 클라이언트 직접 UPDATE가 완전히 막혀 있음(0028에서 회수) — 모든 수정은 RPC(`update_my_contact` 등)로만.

### 3.3 GA 파트너 관리자 (`public.ga_admin_users`)

- 별도 회원가입 없음 — 일반 회원(이메일 인증 완료)이 `/partner/register`에서 `signup_ga_admin` RPC를 호출하면 현재 로그인 세션에 그대로 연결되어 `ga_admin_users` 행이 생성됩니다(멱등 — 이미 있으면 그대로 반환).
- `ga_company_id`, `branch_id`를 가지며, 소속 GA/지점의 데이터만 쓸 수 있음(`is_ga_admin_for_branch()` 헬퍼로 검사).
- 세션: `src/lib/partner/session.ts` → `getCurrentPartner()` / `requirePartner()`

### 3.4 플랫폼 관리자 (`public.admin_users`)

- `/admin/login`에서 이메일+비밀번호로 로그인. 완전히 별도 로그인 화면(일반 회원 로그인과 무관).
- `admin_users` 테이블은 RLS로 완전히 잠겨 있어 서비스롤 클라이언트로만 조회 가능.
- 세션: `src/lib/admin/session.ts` → `getCurrentAdmin()` / `requireAdmin()`
- 관리자 클라이언트: `src/lib/supabase/admin.ts`의 `createAdminClient()` — `SUPABASE_SERVICE_ROLE_KEY` 사용, RLS 완전 우회. **서버 코드에서만 사용, 절대 클라이언트/앱에 노출 금지.**

---

## 4. DB 쓰기 원칙 — RPC-only, RLS deny-by-default

이 프로젝트 전체에서 일관되게 지켜지는 규칙이며, 앱에서 Supabase를 직접 호출할 때도 반드시 따라야 합니다.

> **모든 테이블에 RLS가 켜져 있지만, `SELECT` 정책만 존재합니다. `INSERT`/`UPDATE`/`DELETE` 정책은 어떤 테이블에도 없습니다.** Postgres RLS는 정책이 없는 작업을 기본 거부하므로, 결과적으로 **모든 쓰기는 `SECURITY DEFINER` Postgres 함수(RPC)를 통해서만 가능**합니다. 각 RPC 내부에서 `current_member_id()` / `is_ga_admin_for_branch()` / `current_admin_id()` 등으로 자체 권한 검사를 합니다.

즉 앱에서 어떤 데이터를 쓰려면 **테이블에 직접 insert/update 하지 말고 반드시 대응하는 RPC를 `supabase.rpc('함수명', {...})`로 호출**해야 합니다. 읽기(`SELECT`)는 SELECT 정책이 허용하는 범위 내에서 테이블/뷰를 직접 조회해도 됩니다.

SELECT 정책의 일반적인 모양: "공개 상태(approved/visible)인 것은 누구나, 소유자/관리자는 상태 무관하게 자기 것" — 예를 들어 `ga_company`는 익명 사용자에게 `approval_status='approved' AND status='visible'`인 행만 보이고, 소속 GA 관리자는 자기 회사 행을 상태와 무관하게 봅니다.

---

## 5. Storage 버킷

| 버킷 | 공개 | 크기제한 | 허용 타입 | 용도 |
|---|---|---|---|---|
| `post-images` | 공개 | 5MB | jpeg/png/webp | 커뮤니티 게시글 이미지 |
| `branch-images` | 공개 | 5MB | jpeg/png/webp | 지점 대표사진/사무실사진 |
| `branch-videos` | 공개 | 200MB | mp4/webm/quicktime | 지점 소개 영상 |
| `company-logos` | 공개 | 2MB | jpeg/png/webp | GA 로고 |
| `branch-verification-docs` | **비공개** | 10MB | jpeg/png/webp/pdf | 지점 등록 시 임대차계약서/명함 |
| `planner-verification-docs` | **비공개** | 10MB | jpeg/png/webp/pdf | TOP설계사 인증 원천징수영수증 등 |
| `planner-market-profile-photos` | 공개 | 5MB | jpeg/png/webp | 설계사 마켓 프로필 사진 |
| `planner-market-income-docs` | **비공개** | 10MB | jpeg/png/webp/pdf | 설계사 마켓 연봉인증 서류 |
| `banner-images` | 공개 | 5MB | jpeg/png/webp | 광고 배너 (관리자 업로드) |

비공개 버킷은 서명된 URL(`createSignedUrl`)을 서버(관리자 클라이언트)에서 발급해야 조회 가능합니다.

---

## 6. 지점(GA/Branch) 시스템

- **계층**: `ga_company`(보험대리점 법인, 얇은 identity) → `ga_branch`(실제 지점, 주소/연락처/사진/소개 등 대부분의 데이터) → `branch_media`/`branch_contacts`/`branch_recruit`/`branch_event`/`branch_links`/`branch_insurers` 등 자식 테이블
- **GA 마스터 데이터는 잠겨 있음**: 신규 GA 법인을 자유롭게 만들 수 없고, 사전에 큐레이션된 공식 50개 GA 리스트(0019) 중에서 선택해 지점을 등록하는 구조입니다.
- **신규 지점 등록 흐름**: `submit_branch_registration` RPC → `ga_branch` 행을 즉시 생성하되 `registration_status='pending', status='hidden'`으로 강제(비공개) → 등록자정보/임대차계약서/명함 첨부(`attach_registration_document`) → 관리자 승인(`review_branch_registration`)해야 `status='visible'`로 전환.
- **지점 수정은 필드별로 정책이 다릅니다** (자주 헷갈리는 부분):
  - **즉시 반영**: 연락처/카카오톡/홈페이지(`upsert_branch_contact`), 취급보험사(`set_branch_insurers`), 채용공고(`create_branch_recruit`/`update_branch_recruit`/`close_branch_recruit`), SNS링크(`upsert_branch_link`)
  - **관리자 재승인 필요**("신뢰도 항목"): 지점명/주소/지역/소개글/설계사수/편의시설/사진/운영시간 등 → `submit_branch_update` RPC로 `branch_registrations` 큐(`request_type='update'`)에 적재
- **임시저장 + 대기중 수정(0043, 최신)**: `branch_registrations`는 지점당 열려있는(`status IN ('draft','pending')`) 수정요청이 **최대 1개**로 강제됩니다(유니크 인덱스). `save_branch_update_draft`로 임시저장, `submit_branch_update`로 제출 — 이미 대기중이어도 자유롭게 다시 수정해 재제출 가능하며 관리자는 항상 최신 내용만 봅니다. `before_snapshot` 컬럼에 제출 시점의 실제 이전 값을 스냅샷으로 저장해, 승인 후 시점이 지나도 "변경 전/후" 이력이 정확하게 유지됩니다(과거엔 승인 후 라이브 데이터를 재조회해서 diff가 사라지는 버그가 있었음 — 이제 해결됨).
- 지점 노출/추천(`is_recommended`, `recommended_rank`)은 광고 상품 구매·승인 결과로만 결정되며, 어디서도 직접 쓰지 않고 `sync_branch_ad_exposure()`가 계산합니다(15분마다 pg_cron).

---

## 7. 설계사 마켓 (리크루팅) 시스템

무료로 구직 프로필을 등록한 설계사와, 유료 열람권으로 연락처를 확인하는 GA를 잇는 **양방향 마켓플레이스**입니다. TOP설계사(8절)와는 DB/API/승인 완전히 분리.

- **테이블**: `planner_profiles`(핵심, 1인당 1행) + `planner_profile_insurers` + `planner_market_certifications`(구 버전, 현재는 배지시스템으로 대체) + `planner_badge_types`/`planner_badges`(확장형 배지) + `planner_market_credit_*`(열람권 크레딧) + `planner_contact_view_notifications`(열람 알림)
- **공개/비공개 분리**: 활동지역/경력/전문분야/자기소개/사진/희망조건 등은 공개(`public_planner_profiles` 뷰로만 노출), **이름/연락처/이메일/카카오톡은 GA가 열람권을 써야만** `get_planner_contact` RPC로 확인 가능
- **열람권 크레딧**: GA가 회사 단위로 구매(`purchase_planner_market_credits`), `get_planner_contact`가 동시성 안전하게 잔액을 차감합니다 — `unique(ga_company_id, planner_profile_id)` 제약 + `insert ... on conflict do nothing`으로 같은 설계사를 두 번 열람해도 두 번 과금되지 않습니다.
- **필드별 즉시반영/재승인 분리(0044, 최신)**: 예전엔 프로필의 아무 필드나 수정하면 전체가 `pending_review`로 돌아가 검색결과에서 사라지는 문제가 있었습니다. 지금은:
  - **즉시 반영**(`update_planner_market_profile_instant`): 이름/연락처/이메일/카카오톡/사진/전문분야/현재근무여부/구직상태/희망입사시기/연락가능시간/자기소개/희망지역/희망조건
  - **재승인 대상**(`submit_planner_trust_update`, `planner_profiles`의 `pending_*` 컬럼 사용): 활동지역/경력/희망GA — 연봉인증은 별도 배지 승인 큐(`planner_badges`)로 이미 분리되어 있어 여기 포함 안 됨
  - 브랜치처럼 `save_planner_trust_update_draft`로 임시저장 가능, `trust_before_snapshot`으로 정확한 이력 유지
- **확장형 배지 시스템**(0038): `planner_badge_types`(코드/라벨/아이콘/서류필요여부/자가신청여부) + `planner_badges`(부여 기록). 연봉인증(`income_verified`, 서류 업로드+관리자 승인), 본인인증(`verified_identity`, 등록 즉시 자동 승인) 등이 이미 있고, 새 배지 종류를 추가해도 이 테이블/RPC 패턴만 재사용하면 됩니다(DB/UI 변경 최소화가 설계 목표).
- **기본 정렬**: `public_planner_profiles`가 ①연봉인증 → ②TOP설계사 → ③최신등록 순으로 정렬 가능한 플래그(`has_income_verified`, `has_top_planner`)를 함께 반환합니다.
- **열람 알림(0045, 최신)**: GA가 특정 설계사의 연락처를 **최초로** 열람하면(재열람은 무시) `planner_contact_view_notifications`에 알림이 쌓입니다. 열람한 GA 관리자가 특정 지점 소속이면 지점명 노출 + 클릭 시 지점 상세로 이동, 아니면 "리쿠르터"로만 익명 표시됩니다. 조회: `list_my_planner_contact_notifications`, `count_my_unread_planner_contact_notifications`, `mark_my_planner_contact_notifications_read`.

---

## 8. TOP설계사 인증 — 설계사 마켓과 절대 혼동 금지

- 테이블: `planner_certifications`, `planner_certification_history` (0024) — **설계사 마켓의 `planner_profiles`/`planner_badges`와 완전히 다른 테이블**입니다.
- 개념: 이미 특정 지점에 소속된 설계사의 "고소득 인증" 배지(지점 스코프, `branch_id` 필수). 인증 유효기간 1년, 조회 시점에 만료 계산.
- 공개 노출은 배지 카운트만(`get_branch_planner_badge_summary`), 개인정보 없음.
- RPC: `submit_planner_certification`, `renew_planner_certification`, `review_planner_certification`, `submit_top_planner_application`(파트너 로그인 없이도 공개 신청 가능)
- 관리자 화면 경로가 `/admin/planners`로 설계사 마켓의 `/admin/planner-market`와 이름이 비슷하니 주의.

---

## 9. 실시간 채팅

- 플랫폼 전체가 공유하는 **단일 채팅방**(1:1이나 그룹 채팅 아님). `chat_messages` 테이블, `is_full_member()` 회원만 읽기/쓰기 가능.
- Supabase Realtime의 `postgres_changes`(INSERT 이벤트, `public.chat_messages`)를 구독하는 방식 (`src/lib/chat/useChatMessages.ts` 참고). 새 메시지가 오면 `get_chat_message` RPC로 조인된 형태(닉네임+소속GA 라벨 포함)를 다시 조회해 붙입니다.
- 발신자 라벨("(소속GA) 닉네임")은 스냅샷을 저장하지 않고 항상 조회 시점에 조인 계산 — GA 소속변경이 승인되면 30초 주기 라벨 새로고침으로 이미 렌더링된 과거 메시지에도 반영됩니다.
- 매일 자정(KST) `pg_cron`으로 `chat_messages`를 비우고 `chat_messages_archive`로 보관(삭제 아님).

---

## 10. 결제 / 구독

- **실제 PG 미연동 상태**입니다. `src/lib/payments/`의 `PaymentProvider` 인터페이스(`chargeRecurring`, `chargeOnce`, `registerPaymentMethod`, `verifyWebhookSignature`)를 스텁 구현체(`stub-provider.ts`, 항상 성공)가 채우고 있습니다. 실 PG(예: 토스페이먼츠) 연동 시 이 인터페이스를 구현하는 어댑터 하나만 추가하면 됩니다.
- **구독형**(지점 노출료/설계사 애드온): `subscriptions`, `payment_transactions` (0025) — grace period, 자동 만료 처리(`advance_grace_period_expirations`, pg_cron)
- **1회성 구매**(열람권/광고상품): 각각 독립된 원장 테이블 — `planner_market_credit_purchases`, `ad_payments`. 구독 테이블을 재사용하지 않고 매번 새 원장 테이블을 만드는 것이 이 코드베이스의 컨벤션입니다(엔티티마다 병렬-독립 테이블).

---

## 11. 지점 광고 상품 (2번째 독립 수익 스트림)

- `branch_ad_products` + `ad_payments`. 구매(`purchase_branch_ad_product`) → 관리자 승인(`admin_review_branch_ad_product`) → `sync_branch_ad_exposure()`가 `ga_branch.is_recommended`/`recommended_rank`를 계산해 반영(15분 주기 pg_cron).
- product_type 7종 중 현재 "추천지점(featured_branch)"만 실제 노출 로직이 연결되어 있고 나머지 6종은 결제/승인 인프라만 존재(추후 확장 예정).

---

## 12. 관리자 승인 큐 — 반복되는 패턴

이 프로젝트 전체에서 "제출 → 관리자 검토 → 승인/반려" 흐름은 항상 같은 모양을 반복합니다. 새 기능을 앱에서도 만들게 된다면 이 패턴을 따르는 것이 좋습니다:

1. 상태값: `pending`(대기) → `approved` | `rejected`, 최근 추가된 곳들은 `draft`(임시저장) 상태도 포함
2. 신청 테이블에 `reviewed_by_admin_id`, `reviewed_at`, `review_reason` 컬럼
3. 승인 시 실제 반영 테이블에 값을 적용하는 것은 관리자 전용 RPC 하나(`review_*`/`admin_review_*`)가 전담
4. 최신 설계(0043/0044)에서는 "제출 시점 이전 값" 스냅샷(`before_snapshot`)을 함께 저장해, 승인 후에도 정확한 변경 이력을 재구성할 수 있게 함
5. 관리자 화면은 항상 `/admin/(protected)/기능명/page.tsx`(목록, 상태/유형 탭) + `/admin/(protected)/기능명/[id]/page.tsx`(상세, diff 표시 + 승인/반려 버튼 컴포넌트) 2개 페이지 세트

예: `branch_registrations`(지점), `user_ga_change_requests`(회원 GA변경), `planner_badges`(배지), `planner_profiles`의 `pending_*` 컬럼(설계사 재승인), `branch_ad_products`(광고).

---

## 13. 관리자 기능 전체 목록 (`/admin/(protected)/*`)

| 경로 | 기능 |
|---|---|
| `/admin` | 대시보드 |
| `/admin/ga`, `/admin/ga/[gaId]`, `/admin/ga/new` | GA 법인 관리 |
| `/admin/branches`, `/admin/branches/[branchId]` | 지점 관리 |
| `/admin/change-requests` | 지점 신규/수정 승인 큐 (신규/수정 탭 분리) |
| `/admin/ga-change-requests` | 회원 GA 소속변경 승인 큐 |
| `/admin/planners`, `/admin/planners/[certificationId]` | TOP설계사 인증 승인 (설계사 마켓과 별개) |
| `/admin/planner-market`, `/admin/planner-market/[profileId]` | 설계사 마켓 프로필 승인 + 재승인(활동지역/경력/희망GA) diff |
| `/admin/planner-market/badges/[badgeId]` | 설계사 배지(연봉인증 등) 승인 |
| `/admin/planner-market/credits` | 열람권 구매내역/수동지급/환불 |
| `/admin/ad-products/[id]` | 지점 광고상품 승인/연장 |
| `/admin/billing` | 구독/결제 현황 |
| `/admin/recruits` | 채용공고 관리 |
| `/admin/inquiries` | 문의 관리 |
| `/admin/event-popup` | 홈 이벤트 팝업 콘텐츠 |
| `/admin/design/[page]` | 페이지 섹션 순서/노출 제어 |
| `/admin/login` | 관리자 로그인 (일반회원 로그인과 별개) |

---

## 14. 앱 개발자가 반드시 알아야 하는 내용 (요약)

1. **로그인=회원이 아닙니다.** 미들웨어가 모든 방문자에게 익명 Supabase 세션을 자동 발급합니다. "이 사람이 실제로 뭘 할 수 있는가"는 항상 `public.users`/`ga_admin_users`/`admin_users` 중 어느 테이블에 실제 행이 있는지, 그리고 `is_full_member()` 조건을 만족하는지로 판단해야 합니다.
2. **카카오/구글 로그인은 "탐색 전용"입니다.** 채팅, 지점등록, 설계사등록 등은 이메일 인증 완료 회원(`provider='email' AND email_verified_at IS NOT NULL`)만 가능합니다. 앱 로그인 UX를 설계할 때 이 제약을 그대로 반영해야 합니다.
3. **모든 쓰기는 RPC로만.** 테이블에 직접 insert/update를 시도하면 RLS에 막혀 실패합니다. 정확한 RPC 이름과 파라미터는 `supabase/migrations/`의 최신 `create or replace function` 정의를 확인하세요(같은 함수가 여러 마이그레이션에서 재정의되므로 **항상 번호가 가장 큰 파일의 정의가 최종본**입니다).
4. **TOP설계사(`planner_certifications`)와 설계사 마켓(`planner_profiles`)은 완전히 다른 시스템**입니다. 이름이 비슷해서(둘 다 "설계사 인증/배지") 혼동하기 쉽지만 테이블/RPC/관리자화면이 전부 분리되어 있고, 앞으로도 하나로 합칠 계획이 없습니다.
5. **결제는 전부 스텁입니다.** 실제 PG 연동 전까지는 모든 구매가 `PaymentProvider.chargeOnce`/`chargeRecurring`의 스텁 구현으로 항상 성공 처리됩니다. 앱에서 결제 플로우를 만들 때 이 사실(실제 카드 승인이 일어나지 않음)을 인지하고 있어야 합니다.
6. **비공개 데이터는 뷰/RPC를 통해서만.** 예를 들어 설계사 연락처는 `planner_profiles` 테이블을 직접 읽을 수 없고 반드시 `get_planner_contact` RPC(크레딧 차감 포함)를 호출해야 합니다. 지점 등록 서류도 비공개 버킷+서명URL로만 접근 가능합니다.
7. **서비스롤 키(`SUPABASE_SERVICE_ROLE_KEY`)는 절대 앱 클라이언트에 포함하면 안 됩니다.** RLS를 완전히 우회하는 키입니다. 관리자 전용 기능이 앱에도 필요하다면, 앱이 이 키를 갖는 게 아니라 서버(웹의 API 또는 별도 백엔드)를 경유해야 합니다.
8. **필드별 즉시반영/재승인 구분에 주의하세요.** 지점 수정, 설계사 프로필 수정 둘 다 "이 필드는 저장 즉시 반영되는지, 관리자 승인이 필요한지"가 필드마다 다릅니다(6절, 7절 표 참고). 앱에서 수정 폼을 만들 때 이 구분을 그대로 반영하지 않으면 사용자가 "저장했는데 왜 안 바뀌지"라고 혼란스러워할 수 있습니다.
9. **마이그레이션 번호 = 진실의 소스.** 이 문서는 스냅샷입니다. 실제 최신 스키마/RPC 시그니처가 궁금하면 항상 `supabase/migrations/` 폴더에서 해당 테이블/함수가 마지막으로 언급된 가장 큰 번호의 파일을 확인하세요.
10. **웹 레포 경로에 주의**: 이 세션의 기본 작업 디렉터리가 `C:\Dev\insurance-community-mobile`(모바일 앱 레포)로 표시되더라도, 실제 웹 프로젝트는 `C:\Dev\Recovery\insurance-community-backup`에 있습니다. 최신 스키마를 확인할 때 착각하지 마세요.

---

## 15. 알려진 제한사항 / 아직 안 된 것

- 지점/설계사 **신규 등록(최초 제출) 폼에는 임시저장 기능이 없습니다** — 등록 수정(update) 흐름에만 draft가 구현되어 있습니다. 최초 등록 폼은 한 번에 끝까지 작성해야 합니다.
- 광고 배너 관리(`banner-images` 버킷, `banners`/`public_banners` 테이블)는 스토리지 버킷만 만들어져 있고 관리자 업로드 화면/공개 노출 로직은 아직 미구현입니다(0040 적용됨, 앱단 미완성).
- 지점 광고 상품 7종 중 "추천지점" 1종만 실제 노출과 연결되어 있고 나머지 6종은 결제 인프라만 존재합니다.
- 결제는 스텁 상태 — 실 PG 연동 필요.
- Push 알림은 아직 없음(열람 알림은 현재 인앱 목록 + 읽지않음 배지만). `planner_contact_view_notifications` 테이블 구조 자체는 앱 출시 후 실시간 Push로 확장 가능하도록 설계되어 있습니다.

---

## 16. 마이그레이션 이력 요약 (0001~0045)

| # | 파일 | 한줄 요약 |
|---|---|---|
| 0001 | init_schema | 커뮤니티 초기 스키마(게시글/댓글/신고/관리자 등) |
| 0002 | rls_policies | RLS 정책 + 익명 프로필 자동생성 트리거 |
| 0003 | seed_data | 카테고리/사이트설정 시드 |
| 0004 | post_write_functions | 게시글 쓰기 전용 SECURITY DEFINER 함수 |
| 0005 | storage_post_images | 게시글 이미지 버킷 |
| 0006 | ga_branch_schema | GA/지점 스키마 |
| 0007 | ga_rls_policies | GA/지점 RLS |
| 0008 | ga_write_functions | GA/지점 쓰기 함수 |
| 0009 | seed_regions_insurers | 지역/보험사 시드 |
| 0010 | storage_branch_media | 지점 이미지/영상/로고 버킷 |
| 0011 | delete_functions | 관리자 소프트삭제 함수 |
| 0012 | users_schema | 일반회원(소셜로그인) 스키마 |
| 0013 | partner_real_supabase | 파트너 mock→실 Supabase 전환 |
| 0014 | partner_ga_select_flow | GA 신규생성→마스터 선택 방식 전환 |
| 0015 | branch_contact_click_count | 지점 문의수 카운터 |
| 0016 | branch_tagline_amenities | 지점 한줄소개+편의시설 |
| 0017 | branch_links_and_video | 지점 SNS링크 테이블 |
| 0018 | home_stats_and_ga_lock | 홈 통계 + GA 마스터 잠금 |
| 0019 | ga_master_seed | GA 공식 50개 확정 |
| 0020 | page_layouts | 페이지 섹션 순서 제어 |
| 0021 | branch_media_auto_main_photo | 대표사진 자동지정 |
| 0022 | branch_registrations | 지점 승인 큐 도입 |
| 0023 | photo_split | 대표사진/사무실사진 분리 |
| 0024 | planner_certifications | TOP설계사 인증 |
| 0025 | subscriptions | 구독/결제 스텁 |
| 0026 | pending_photo_link | 승인대기 사진 링크 |
| 0027 | top_planner_public_applications | TOP설계사 공개 신청 |
| 0028 | member_email_signup | 이메일 회원가입 |
| 0029 | user_ga_change_requests | 회원 GA변경 요청 큐 |
| 0030 | chat | 실시간 채팅 |
| 0031 | signup_confirm_time_profile | 프로필생성 시점을 인증완료로 이동 |
| 0032 | event_popup | 이벤트 팝업 DB화 |
| 0033 | chat_daily_archive | 채팅 일일 초기화 |
| 0034 | planner_market_profiles | 설계사 마켓 프로필 |
| 0035 | planner_market_verification | 설계사 마켓 인증(구버전) |
| 0036 | planner_market_credits | 열람권 크레딧 |
| 0037 | branch_ad_products | 지점 광고상품 |
| 0038 | planner_market_badges | 확장형 배지 시스템 |
| 0039 | planner_profile_views | 프로필 조회수 통계 |
| 0040 | banner_images_storage | 배너 이미지 버킷 |
| 0041 | provider_backfill_and_badge_icon | provider 백필 + 배지아이콘 통일 |
| 0042 | planner_market_job_search_fields | 구직상태 필드 교체 |
| 0043 | branch_registration_drafts | 지점 임시저장+대기중수정+정확한이력 |
| 0044 | planner_trust_update_queue | 설계사 즉시반영/재승인 분리 |
| 0045 | planner_contact_view_notifications | 설계사 열람 알림 |

---

## 부록 A. 모바일 앱 현재 상태 (앱팀 → 웹팀 역방향 동기화)

> 갱신: 2026-08-04. 위 인수인계(웹→앱) 원문은 보존하고, 아래는 앱 구현 현황을 웹팀에 알리는 부록이다.

**아키텍처**: Expo SDK 57 + RN 0.86 하이브리드. `bohummap.com`을 WebView로 감싸고 네이티브 기능을 브릿지로 얹음. 웹 코드/DB/RPC는 앱이 수정하지 않음.

**웹↔앱 브릿지(`window.__boheom`)**: 앱이 `injectedJavaScriptBeforeContentLoaded`로 설치. 웹은 `__boheom.send({type,...})`로 앱 호출, `__boheom.on(cb)` 또는 `addEventListener('boheom:native')`로 앱 이벤트 수신. 규격은 [BRIDGE_PROTOCOL.md](BRIDGE_PROTOCOL.md).

**앱이 광고하는 capabilities**(ready 핸드셰이크로 전달): `haptic, deeplink, share, biometric, qr-scan, push, badge`.

**웹팀이 구현/확인할 것**:
1. `ready` 수신 → 앱 모드 전환(앱 전용 UI, 다운로드 배너 숨김 등)
2. **`push-token` 수신 → `register_push_token` RPC 저장** (웹 "준비됨"으로 확인됨). 앱은 DB/API 직접 호출 안 함.
3. `deeplink` 수신 → 프론트 라우팅(선택; 앱이 location 이동은 이미 보장)
4. 공유/QR 등은 폴백 포함 헬퍼로 감싸기(앱이면 브릿지, 아니면 웹 API)
5. **`.well-known/assetlinks.json` + `apple-app-site-association` 정적 호스팅**(유니버설/앱 링크)
6. **`/privacy` 개인정보처리방침 페이지**(Play 출시 필수)

**딥링크 경로 계약**: 웹 URL 구조와 1:1. `/designer/{id}`, `/branch/{id}`, `/ga/{id}`, `/chat/{roomId}`, `/recruiting/{id}`, `/notice/{id}`. 웹 URL 변경 시 공유 필요.

**푸시 페이로드**: 서버→Expo Push의 `data`에 `{ path: '/chat/{id}', ... }` 포함 → 앱이 알림 탭 시 해당 경로로 딥링크.

**출시 상태**: Play 출시 준비는 [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md) 참조. 코드/설정 완료, 남은 블로커는 Privacy Policy·Data Safety·리스팅 에셋·FCM 키.
