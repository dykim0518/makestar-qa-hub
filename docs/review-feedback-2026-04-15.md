# 커버리지 대시보드 리뷰 피드백 (2026-04-15)

검토 범위: makestar-qa-hub의 coverage 페이지 코드와 2026-04-15 기준 배포본.

## 총평

1차 구현 방향은 맞음. 그러나 현재 수치는 휴리스틱 매핑과 누적 링크가 포함된 "1차 매핑 현황"이라, 진행률이 부풀려 보일 가능성이 있음.

## 주요 이슈 (우선순위 순)

### 1. testFile 정규화 및 중복 제거

- 휴리스틱: `tests/admin_poca_content_pom.spec.ts`
- 실실행(parser): `admin_poca_content_pom.spec.ts` (접두사 없음)
- unique key 차이로 **동일 테스트가 별개 row로 중복 저장**
- 영향: linkCount 부풀림, 테스트 분포 왜곡

### 2. Stale link 미정리

- `linkCoverageForRun()`은 insert/update만
- 테스트 rename/delete, `@feature` 제거, spec 구조 변경 시 유령 링크 잔존
- 결과: feature가 실제로는 커버리지 잃었는데 대시보드엔 계속 covered

### 3. 휴리스틱이 KPI에 섞임

- `coverage-heuristic.ts`가 `coverageStatus='covered'`로 설정
- 추정(heuristic)과 실측(passed)이 같은 수치로 합산됨

### 4. Skipped-only가 partial로 잡힘

- `linkCoverageForRun` 재계산: `hasPassed=false` 분기가 모두 `partial`
- skipped 유일인 feature도 partial → 오판 여지

### 5. manual_only와 none이 summary에서 미구분

- 필터에는 있지만 상단 요약 카드에서 둘이 합쳐짐
- "수동 회귀 있음"과 "관리 안 됨" 구분 안 됨

## 권장 개선

- 헤더 "자동화 커버리지" → "자동화 매핑 현황" 또는 "(추정 포함)"
- row/링크에 출처 배지 (actual/heuristic/manual)
- "실행 기반 테스트 수" vs "추정 링크 수" 분리 표시
- 핵심 계산 로직 단위 테스트 추가

## 완료 기준

- [ ] 동일 테스트가 `tests/` prefix 차이로 두 번 잡히지 않음
- [ ] 휴리스틱만 있는 feature는 상단 KPI에서 covered로 계산 안 됨
- [ ] skipped only feature는 partial로 올라가지 않음
- [ ] 제거된 테스트/태그는 재동기화 후 대시보드에서 사라짐
- [ ] 상단 요약에서 manual_only와 none 구분됨

## 한 줄 결론

방향은 맞지만 숫자는 이른 상태. "중복 제거 + stale 정리 + heuristic 분리" 세 가지 우선.
