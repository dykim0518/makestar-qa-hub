# EPIC4 Runbook (검증 + Google Sheets 내보내기)

## 1) 구현 범위

- 검증 엔진
  - 중복(완전 중복 + 유사 중복)
  - 누락(Requirement 미연결)
  - 형식 오류(Step/Expected/Result 규칙)
- 검증 이슈 DB 저장
- Google Sheets 내보내기
  - `TC`
  - `Validation_Report`
  - `Coverage_Matrix`

## 2) 주요 API

### 2.1 검증

- `POST /api/tc/runs/{runId}/validate`
  - Run의 케이스를 검증하고 이슈를 `tc_validation_issues`에 저장
  - 응답: `summary`, `issues`, `coverage`
- `GET /api/tc/runs/{runId}/validate`
  - 저장된 검증 이슈/요약/커버리지 조회

### 2.2 내보내기

- `POST /api/tc/runs/{runId}/export/google-sheet`
  - body 예시:
```json
{
  "sheetUrl": "https://docs.google.com/spreadsheets/d/....../edit",
  "tcSheetName": "TC",
  "validationSheetName": "Validation_Report",
  "coverageSheetName": "Coverage_Matrix"
}
```
- UI 대체 경로: `/tc`에서 `TC CSV 다운로드 / Validation CSV 다운로드 / Coverage CSV 다운로드` 버튼으로
  Google 연동 없이 파일 내려받기 가능

### 2.3 연동 상태 확인

- `GET /api/tc/integrations/google/status`
  - Google 서비스 계정 환경변수 설정 여부를 반환
  - UI에서 내보내기 버튼 활성화/비활성화 가드에 사용

## 3) 환경변수

Google Sheets 내보내기에는 서비스 계정 OAuth가 필요합니다.

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - 개행은 `\\n` 형태로 입력 가능 (코드에서 자동 복원)
- `GOOGLE_SERVICE_ACCOUNT_SUBJECT` (선택)
  - Domain-wide delegation 사용 시에만 필요

## 4) UI 경로

- `/tc`
  - Generation Runs 영역에서:
    - `검증 실행`
    - `Google Sheet 내보내기`
  - Validation Report, 이슈 테이블, Coverage Matrix 확인 가능
  - 내보내기 시 `TC`, `Validation_Report`, `Coverage_Matrix` 시트명을 사용자 입력으로 변경 가능

## 5) DB 테이블

- `tc_validation_issues`
  - `issue_type`: `duplicate | missing | format`
  - `severity`: `low | medium | high`
  - `target_ref`: 케이스 번호/요구사항 키 등
  - `message`: 설명
  - `meta`: 상세 메타데이터(JSON)
