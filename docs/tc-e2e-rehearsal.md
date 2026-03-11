# TC Generator E2E Rehearsal

## 1) 목적

- 실제 PRD/템플릿/생성/검증/Google Sheet 내보내기까지 한 번에 리허설한다.
- 검증 기준:
  - 생성 케이스 수가 0보다 큰지
  - Validation 이슈가 규칙대로 감지되는지
  - Google Sheet에 `TC`, `Validation_Report`, `Coverage_Matrix`가 작성되는지

## 2) 사전 준비

- `.env.local` 확인
  - `DATABASE_URL`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - `GOOGLE_SERVICE_ACCOUNT_SUBJECT` (필요한 경우)
- Google Spreadsheet 공유
  - 서비스 계정 이메일에 `Editor` 권한 부여
- DB 마이그레이션 반영
  - `npx drizzle-kit migrate`

## 3) 실행 순서 (UI)

1. `npm run dev` 실행
2. `/tc` 접속
3. 프로젝트 생성
4. Notion/PDF/Figma 소스 연결 (API 또는 UI 경유)
5. 템플릿(Google Sheet URL 또는 CSV) 분석/승인
6. `TC 초안 생성` 또는 `TC 엄격 생성` 실행
7. `검증 실행` 클릭 후 Validation Report 확인
8. 내보낼 Spreadsheet URL 입력
9. 시트명(`TC`, `Validation_Report`, `Coverage_Matrix`) 확인 또는 수정
10. `Google Sheet 내보내기` 실행

## 4) 성공 기준

- `/tc` 또는 `/tc/runs/{runId}`에서:
  - Validation summary가 출력된다.
  - Issues table과 Coverage Matrix가 출력된다.
- Google Sheet에서:
  - TC 행 데이터가 생성된다.
  - Validation summary/issue가 기록된다.
  - Requirement coverage가 기록된다.

## 5) 문제 해결

- `Run not found`
  - runId 오타 또는 DB 데이터 미생성
- `Google Sheet 내보내기 실패`
  - 서비스 계정 권한 미부여
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` 줄바꿈(`\\n`) 포맷 오류
- 생성 케이스 0건
  - `tc_requirements` 데이터 확인
  - 템플릿 승인 여부 확인
