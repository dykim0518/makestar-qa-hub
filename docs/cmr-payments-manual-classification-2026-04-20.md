# CMR 결제 `manual_only` 후보 분류

작성일: 2026-04-20

## 목적

커버리지 숫자를 올리기 전에, CMR 결제 영역의 `none` feature 중 어떤 항목이
실제로 `manual_only` 후보인지 먼저 분리한다.

이번 분류는 아래 3가지로 나눈다.

- `manual_only 후보`
  - 외부 PG callback/redirect 의존이 크고, 현재 저장소 기준으로 재현 가능한 자동화 진입 경로가 없다.
- `자동화 backlog`
  - 아직 테스트는 없지만, 현재 POM/fixture를 확장하면 열 수 있는 내부 화면 또는 진입 smoke다.
- `보류`
  - 다른 세션에서 자동화 가능성 검토 중이라 지금 바로 `manual_only`로 확정하면 안 되는 항목이다.

## 검증된 사실

- 현재 `covered`
  - `/payments`
  - `/payments/toss`
- 현재 결제 관련 `none`
  - `/payments/extra`
  - `/payments/error`
  - `/payments/deposit/success`
  - `/payments/direct/success`
  - `/payments/toss/success`
  - `/payments/toss/success-extra`
  - `/payments/toss/fail`
  - `/payments/toss/processing`
  - `/payments/eximbay`
  - `/payments/eximbay/success`
  - `/payments/eximbay/fail`
  - `/payments/eximbay/processing`
- 현재 테스트는 Toss 진입과 주문서 회귀까지만 있다.
  - `tests/cmr_payment_pom.spec.ts`
- 현재 POM은 아래까지만 구현돼 있다.
  - 주문서 진입
  - Proceed
  - Toss widget/gateway 감지
  - 결제수단 선택
  - 카드 입력 iframe 조작
  - `make_order` 응답 캡처
  - `tests/pages/makestar-payment.page.ts`
- 현재 fixture는 Toss 카드/호스트 기준만 정의돼 있다.
  - `tests/fixtures/cmr-payment.ts`
- 저장소 안에는 Eximbay helper, callback URL 재현 helper, 성공/실패/processing 페이지 검증 helper가 없다.

## 분류 결과

### 1. `manual_only` 후보

| pagePath | feature | 우선순위 | 근거 |
| --- | --- | --- | --- |
| `/payments/toss/success` | Toss 결제 성공 | high | 실제 PG 성공 callback 없이는 성립하지 않는 화면이다. 현재 저장소에는 callback contract 재현 코드가 없다. |
| `/payments/toss/success-extra` | Toss 결제 성공 (추가) | high | 일부 성공 후처리 분기라 성공 callback 전제가 필요하다. 현재 테스트 자산으로는 진입 조건을 만들 수 없다. |
| `/payments/toss/fail` | Toss 결제 실패 | high | 외부 PG 실패 리턴을 만들어야 한다. 현재는 실패 응답/redirect를 재현하는 helper가 없다. |
| `/payments/toss/processing` | Toss 결제 처리중 | medium | 결제 승인 지연/폴링 상태를 인위적으로 만들어야 한다. 현재 stage 환경에서 안정적으로 재현하는 경로가 없다. |
| `/payments/eximbay/success` | Eximbay 결제 성공 | high | 외부 PG 성공 callback 의존. 현재 저장소 기준 Eximbay sandbox/리턴 시나리오가 없다. |
| `/payments/eximbay/fail` | Eximbay 결제 실패 | high | 외부 PG 실패 callback 의존. 자동화용 진입 자산이 없다. |
| `/payments/eximbay/processing` | Eximbay 결제 처리중 | medium | 승인 대기/중간 상태 재현 경로가 없다. |

### 2. `자동화 backlog`

| pagePath | feature | 우선순위 | 근거 |
| --- | --- | --- | --- |
| `/payments/eximbay` | Eximbay 결제 진입 | high | 외부 PG지만 `entry`는 redirect host 확인 수준의 smoke로 열 가능성이 있다. 아직 helper/fixture가 없을 뿐이다. |
| `/payments/error` | 결제 오류 | high | 내부 오류 안내 페이지 성격이다. 오류 조건이나 URL contract만 알면 자동화 가능성이 있다. |
| `/payments/extra` | 결제 추가 정보 | high | 내부 추가 입력 단계다. 특정 상품/회원 조건만 확보되면 자동화 가능성이 높다. |
| `/payments/deposit/success` | 무통장입금 완료 | high | widget의 `virtual` 결제수단 선택 자산이 이미 있다. 완료 페이지 조건만 확보하면 자동화 후보다. |
| `/payments/direct/success` | 직접결제 완료 | high | 내부 완료 페이지 계열로 보이며, 외부 PG callback보다 자동화 난도가 낮을 가능성이 높다. |

### 3. `보류`

지금은 아래 원칙으로 보류한다.

- 다른 세션에서 Toss/Eximbay callback 자동화 가능성을 검토 중이면,
  위 `manual_only 후보`는 바로 확정하지 않는다.
- callback URL contract, sandbox 토큰, request_id 주입 방식이 확보되면
  `manual_only 후보`는 `자동화 backlog`로 다시 내려야 한다.

## 권장안

1. 지금 바로 `manual_only`로 확정 가능한 1차 후보는 7개다.
2. 단, 실제 import는 다른 세션의 callback 자동화 결론을 받은 뒤에 한다.
3. 결론 전까지는 이 문서를 기준으로 운영한다.
4. 결론이 `자동화 불가`면 `scripts/import-coverage-manual.ts` 입력 JSON을 만들어 반영한다.
5. 결론이 `자동화 가능`이면 `manual_only`로 넣지 말고 테스트 backlog로 넘긴다.

## 구현 근거 파일

- `qa-hub`
  - `scripts/coverage-import-commerce.json`
  - `scripts/import-coverage-manual.ts`
- `my-playwright-tests`
  - `tests/cmr_payment_pom.spec.ts`
  - `tests/pages/makestar-payment.page.ts`
  - `tests/fixtures/cmr-payment.ts`
