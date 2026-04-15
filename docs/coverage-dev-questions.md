# 커버리지 inventory ↔ 테스트 정합성 — 개발자 확인 요청

> 작성: 2026-04-14
> 컨텍스트: QA Hub의 자동화 커버리지 대시보드 구축 중 발견된 inventory ↔ 실제 테스트 사이의 불일치/누락 항목입니다. 각 항목별로 짧게 답변 부탁드려요.

---

## 1. 통합매니저\_포카앨범 — 테스트 URL이 inventory에 없음 (3건)

`admin_poca_readonly_pom.spec.ts`가 아래 URL로 navigate하지만 menu-hierarchy.xlsx에 없고, 실제 접속 시 "Page not found"가 뜸:

| 테스트 ID                             | 테스트가 기대한 URL        | 현재 inventory                                                           |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| PW-PAGE-01, PW-SEARCH-01 (당첨자조회) | `/pocaalbum/winner/list`   | `/pocaalbum/winner/board/list`, `/pocaalbum/winner/delivery/list`만 존재 |
| PC-PAGE-01, PC-SEARCH-01 (고객관리)   | `/pocaalbum/customer/list` | 미등록                                                                   |
| PM-PAGE-01, PM-SEARCH-01 (시스템관리) | `/pocaalbum/system/list`   | 미등록 (`/pocaalbum/system/cache/list`만 있음)                           |

**확인 요청:**

- 이 URL들은 deprecated인가요? URL 구조가 바뀐 건가요?
- 테스트 코드를 새 URL로 업데이트해야 하나요, 아니면 inventory에 추가 등록해야 하나요?

---

## 2. 통합매니저\_포카앨범 — `/pocaalbum/test` 페이지

`admin_poca_dashboard_pom.spec.ts`가 23개 테스트로 검증하는 페이지인데 inventory에 없음.

**확인 요청:**

- `/pocaalbum/test`는 운영 페이지인가요, 테스트 전용인가요?
- 운영이면 menu-hierarchy에 추가 필요. 테스트 전용이면 inventory에서 제외하고 별도 분류로 관리하는 게 좋을 것 같음.

---

## 3. 통합매니저\_메이크스타 — QA-98 업체/예치금 관리 페이지

`admin_user_pom.spec.ts`의 QA-98 6개 테스트(업체 관리 페이지, 예치금 충전/차감 등)가 검증 대상 페이지를 가리킴. 그런데 menu-hierarchy.xlsx의 메이크스타 시트에 매칭되는 페이지 없음.

**확인 요청:**

- 업체 관리/예치금 페이지의 정확한 URL은 무엇인가요?
- 메뉴 위계에 누락된 건지, 다른 카테고리(예: B2B)에 들어가야 하는지?

---

## 4. 통합매니저\_앨범버디 — 테스트 spec 부재

menu-hierarchy.xlsx에서 24개 페이지가 등록됐는데, 실제 검증하는 Playwright spec이 0개.

| inventory 등록                        | 페이지   |
| ------------------------------------- | -------- |
| /albumbuddy/artist/list, /create      | 아티스트 |
| /albumbuddy/seller/list               | 판매처   |
| /albumbuddy/goods/list, /:id, /create | 상품     |
| /albumbuddy/order/list, /:id          | 주문     |
| ... (총 24개)                         |          |

`ab_monitoring_pom.spec.ts`는 존재하나 albumbuddy.kr **프론트엔드** 모니터링 테스트라 admin과 매칭 안 됨.

**확인 요청:**

- 앨범버디 어드민 자동화 테스트가 별도 레포 등에 있는지?
- 없다면 우선순위를 어떻게 잡을지? (현재 admin_albumbuddy 커버리지 0%)

---

## 5. ORD-SEARCH-01 타임아웃 (참고)

`주문관리 목록 > ORD-SEARCH-01: 상태 조합 검색(주문/결제/배송/재고할당) 정합성 검증` — 90초 타임아웃으로 실패. 별도 분석 진행 예정이라 참고만 부탁.

---

## 응답 받은 후

답변 받으면 다음 처리:

- inventory에 페이지 추가 → `qa_coverage_features` upsert
- 테스트 URL 업데이트 → 해당 spec 수정
- 매핑 안 되는 페이지 → `isActive=false`로 archive
