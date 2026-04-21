# CMR 비결제 잔여 coverage 분류

작성일: 2026-04-21

## 목적

CMR 비결제 잔여 `none` 항목 중에서

- 지금 바로 `manual_only`로 옮길 수 있는 것
- 실제 진입 조건만 확보되면 자동화 backlog로 남겨야 하는 것
- 현재 coverage 정의 자체를 다시 봐야 하는 것

을 분리한다.

이번 분류는 coverage 숫자 상승보다 실제 사용자 기능 의미를 우선한다.

## 검증된 사실

- 현재 active CMR coverage 분포는 `covered 5 / heuristic_only 30 / manual_only 1 / none 24`이다.
- 이전 세션 메모의 `covered 37`과 현재 수치가 다르게 보이는 이유는 정적 링크가 `covered`가 아니라 `heuristic_only`로 따로 집계되기 때문이다.
- 남은 `none 23` 중 비결제 잔여는 9개다.
  - `/product/private/:code`
  - `/k-name-maker`
  - `/b2b`
  - `/b2b/:id`
  - `/b2b/artist/:id`
  - `/notification/:id`
  - `/userqna`
  - `/my-page/link`
  - `/my-page/company/member-manage`
- 현재 probe 기준 확인 결과는 아래와 같다.
  - `/product/private/:code`
    - 실제 private code 또는 진입 링크를 확보하지 못했다.
  - `/k-name-maker`
    - direct URL은 200 응답이지만 헤더/푸터 셸만 보이고 실제 콘텐츠 마커를 찾지 못했다.
  - `/b2b`, `/b2b/:id`, `/b2b/artist/:id`
    - `/b2b` direct URL이 홈(`/`)으로 리다이렉트된다.
  - `/notification/:id`
    - `/notification/list`의 실제 href는 `/event`만 노출됐고 `/notification/:id` href를 찾지 못했다.
  - `/userqna`
    - `makestar1.zendesk.com` 외부 도메인으로 이동한다.
    - Cloudflare verification이 걸린다.
  - `/my-page/link`
    - direct URL은 200 응답이지만 회사/정책 footer 셸만 보이고 실질 콘텐츠를 찾지 못했다.
  - `/my-page/company/member-manage`
    - 현재 계정 기준 `/my-page`로 리다이렉트된다.
- 현재 저장소 검색 기준으로 `/product/private/:code`, `/k-name-maker`, `/b2b*`, `/notification/:id`, `/my-page/link`, `/my-page/company/member-manage`의
  구체적인 사용자 진입 링크나 자동화 자산은 coverage inventory/doc 외에는 확인하지 못했다.

## 분류 결과

### 1. `manual_only` 후보

| pagePath | feature | 우선순위 | 근거 |
| --- | --- | --- | --- |
| `/userqna` | 고객 문의(Q&A) | high | 외부 Zendesk + Cloudflare verification 의존이다. 현재 저장소와 계정 상태로는 안정적인 자동화 진입이 어렵다. |

### 2. 자동화 backlog

| pagePath | feature | 우선순위 | 근거 |
| --- | --- | --- | --- |
| `/product/private/:code` | 비공개 상품 상세 | high | 내부 페이지다. 실제 code 또는 초대 링크만 확보되면 smoke 수준 자동화 가능성이 높다. |
| `/my-page/company/member-manage` | 기업 멤버 관리 | medium | 기업회원 전용 기능으로 보인다. 전용 계정/fixture가 확보되면 자동화 후보가 될 수 있다. |

### 3. active inventory 제외

| pagePath | feature | 우선순위 | 근거 |
| --- | --- | --- | --- |
| `/k-name-maker` | K-Name Maker | medium | 200 응답은 오지만 전용 콘텐츠·진입 링크가 확인되지 않는다. 현재 active coverage 대상 정의로 유지할 근거가 약하다. |
| `/b2b` | B2B 메인 | high | direct URL이 홈으로 리다이렉트된다. 현재 공개/운영 경로 정의와 coverage 대상 정의가 어긋난다. |
| `/b2b/:id` | B2B 상세 | high | 상위 진입점 `/b2b`가 실경로로 확인되지 않아 상세 흐름을 재구성할 수 없다. |
| `/b2b/artist/:id` | B2B 아티스트 상세 | high | 상위 B2B 경로 전체가 실경로로 확인되지 않아 하위 상세도 active 대상에서 제외하는 편이 맞다. |
| `/notification/:id` | 알림 상세 | high | 실제 알림 목록에서 `/notification/:id` href를 확인하지 못했다. 현재 라우트 정의가 stale로 보인다. |
| `/my-page/link` | 외부 계정 연결 | medium | direct URL이 footer 셸만 노출한다. 독립 기능 화면으로 유지할 근거가 부족하다. |

## 권장안

1. `/userqna`는 `manual_only` 유지가 맞다.
2. `/product/private/:code`, `/my-page/company/member-manage`는 실제 진입 조건 확보 전까지 backlog로 둔다.
3. `/k-name-maker`, `/b2b*`, `/notification/:id`, `/my-page/link`는 이번 배치에서 active coverage inventory에서 제외하는 편이 맞다.
4. 다음 세션에서는 `/product/private/:code`, `/my-page/company/member-manage`의 진입 조건 확보 여부만 추적하면 된다.

## 구현 근거 파일

- `qa-hub`
  - `scripts/coverage-import-commerce.json`
  - `scripts/import-coverage-manual.ts`
- `my-playwright-tests`
  - `tests/cmr_monitoring_pom.spec.ts`
  - `tests/pages/makestar.page.ts`
