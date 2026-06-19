# Commerce-Service

BrainX 결제/구독 서비스. 플랜 조회, 결제 체크아웃, Toss Payments 결제 승인, 구독 변경/취소를 담당한다.

다른 서비스(User-Service, Ingestion-Service, Workspace-Service)와 동일한 계층형 구조를 따른다:
`config / controller / dto / entity / event / exception / repository / security / service`.

## 책임 범위

- 플랜 목록 조회 (`GET /api/v1/plans`)
- 내 구독 정보 조회 (`GET /api/v1/users/me/subscription`)
- 결제 체크아웃 세션 생성 (`POST /api/v1/subscriptions/checkout-sessions`)
- Toss Payments 결제 승인 confirm (`POST /api/v1/subscriptions/checkout-sessions/{id}/confirm`)
- 구독 플랜 변경/취소 (`POST /api/v1/subscriptions/change`, `POST /api/v1/subscriptions/cancel`)

토큰 사용량 같은 다른 Commerce 책임(환불, 결제 웹훅, 인보이스 등)은 아직 이 1차 구현에 포함되지 않았다.

## Toss Payments 결제 흐름 (왜 checkoutUrl이 아니라 SDK + confirm인가)

Stripe Checkout처럼 "결제 페이지 URL 하나"로 끝나는 모델이 아니다. 실제 흐름:

1. 프론트가 `POST /subscriptions/checkout-sessions`로 체크아웃 세션을 만든다. 서버는 **요청에 금액을 받지 않고** Plan 테이블의 가격을 그대로 저장한다 (위변조 방지의 핵심).
2. 응답으로 받은 `clientKey`/`orderId`(=checkoutSessionId)/`amount`/`orderName`으로 프론트가 Toss Payments SDK를 직접 구동해 결제창을 띄운다.
3. 결제가 끝나면 Toss가 우리가 지정한 `successUrl`(승인) 또는 `failUrl`(실패/취소)로 브라우저를 리다이렉트한다. `successUrl`에는 `paymentKey`, `orderId`, `amount`가 쿼리스트링으로 붙는다.
4. 프론트는 그 값을 그대로 `POST /subscriptions/checkout-sessions/{id}/confirm`에 보낸다.
5. 서버는 **클라이언트가 보낸 amount를 절대 신뢰하지 않고** 1번에서 저장해 둔 금액과 대조한 뒤, 일치할 때만 Toss confirm API(`POST https://api.tosspayments.com/v1/payments/confirm`)를 서버 간 호출로 실행한다. 이 호출이 성공해야 실제로 결제가 확정된다.
6. 승인되면 구독 플랜을 즉시 업그레이드하고 `PaymentSucceeded`/`SubscriptionChanged` 이벤트를 발행한다. 실패/위변조/만료/중복 등 모든 실패 경로에서는 플랜을 바꾸지 않고 `PaymentFailed`를 발행한다.

`/api/v1/payments/webhooks/{provider}`(Toss 웹훅) 엔드포인트는 SSOT에 이미 있지만 이번 1차 구현에는 포함하지 않았다 — confirm 호출이 결제 확정의 1차 경로이고, 웹훅은 추후 reconciliation(정합성 보정)용으로 추가하면 된다.

## 결제 상태 모델

- `CheckoutSession.Status`: `PENDING → SUCCEEDED | FAILED | EXPIRED`
  - 중간에 사용자가 결제창을 닫거나 취소하면 Toss가 `failUrl`로 보내고, 별도 confirm 호출 없이 세션은 `PENDING`으로 남아있다가 만료(`expiresAt`, 30분) 처리된다.
  - confirm을 여러 번 호출해도(중복 리다이렉트, 네트워크 재시도) 이미 `SUCCEEDED`인 세션은 Toss를 다시 호출하지 않고 기존 결과를 그대로 반환한다 (멱등 처리).
- `Subscription.Status`: `FREE | ACTIVE | PAST_DUE | CANCEL_SCHEDULED | CANCELLED` (SSOT `SubscriptionData.status`와 동일)

## DB 스키마 (PostgreSQL, `brainx_commerce`)

- `commerce_plans` / `commerce_plan_features`: 플랜 정의. `tier`는 등급 비교용 정수(FREE=0, PRO=1, MAX=2). 등급별 기능 제한(entitlement gating)은 이번 단계에서는 보류 — `entitlements`는 `{ "tier": n }`만 내려준다.
- `commerce_subscriptions`: 사용자 1명당 1행. `userId`가 PK.
- `commerce_checkout_sessions`: 결제 시도(주문) 1건당 1행. `checkoutSessionId`를 Toss `orderId`로도 그대로 사용한다.
- `commerce_event_outbox`: 발행한 이벤트 아웃박스 (Workspace-Service와 동일한 패턴).

## ⚠️ TEMP: 로그인 없이 테스트 중

다른 서비스들과 동일한 임시 처리:

- `SecurityConfig`에서 `/api/v1/plans`, `/api/v1/users/me/subscription`, `/api/v1/subscriptions/**`를 `permitAll()`로 열어둠
- `Authentication`이 없으면(또는 Spring Security의 anonymousUser) `dev-test-user` 고정 ID로 동작
- 즉, 지금은 **누가 테스트하든 같은 가짜 계정의 구독만 바뀐다.** 실제 로그인 연동이 끝나면 이 부분을 제거하고 401을 다시 던지도록 되돌려야 한다 (코드에 `TEMP` 주석으로 표시되어 있음).

## ⚠️ TEMP: 테스트용 가격 / 테스트용 Toss 키

- `PlanDataSeeder`: Pro 500원, Max 1000원으로 시드되어 있다 (실제 요금이 아니라 결제+등급 변경 동작 확인용). 실제 요금으로 전환할 때 가격을 되돌릴 것.
- `application.yml`의 `toss.client-key`/`toss.secret-key`는 Toss Payments 공식 문서에 공개된 샌드박스 테스트 키다 (실제 가맹점 키 아님). 실서비스 전환 시 본인 가맹점의 키로 반드시 교체해야 한다.

## 실행

```powershell
cd C:\Edu\Final\brainX_back\Commerce-Service
.\gradlew.bat bootRun
```

기본 포트는 8084. PostgreSQL 16의 `brainx_commerce` 데이터베이스가 미리 생성되어 있어야 한다.

## 주요 엔드포인트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/plans` | 플랜 목록 조회 |
| GET | `/api/v1/users/me/subscription` | 내 구독 정보 조회 |
| POST | `/api/v1/subscriptions/checkout-sessions` | 결제 체크아웃 세션 생성 |
| POST | `/api/v1/subscriptions/checkout-sessions/{id}/confirm` | Toss 결제 승인 confirm |
| POST | `/api/v1/subscriptions/change` | 구독 플랜 변경 (결제 없이 즉시 변경 — 테스트/다운그레이드용) |
| POST | `/api/v1/subscriptions/cancel` | 구독 취소 (즉시 또는 기간 종료 시) |

## 발행 이벤트 (AsyncAPI SSOT 기준)

`CheckoutSessionCreated`, `PaymentSucceeded`, `PaymentFailed`, `SubscriptionChanged` — 모두 `contracts-v2/brainx-asyncapi.ssot.yaml`에 이미 정의되어 있던 스키마를 그대로 사용한다 (변경 없음).
