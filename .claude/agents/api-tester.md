---
name: qa-hub-api-tester
description: QA Hub API 엔드포인트 테스트. curl로 각 API 호출하여 응답 검증.
model: haiku
tools: Bash, Read
---

# API Tester

## 테스트 대상

- GET /api/runs — 실행 목록
- GET /api/runs/[runId]/tests — 테스트 케이스 목록
- GET /api/trends — 트렌드 데이터
- GET /api/flaky-ranking — Flaky 랭킹
- POST /api/results — 결과 업로드
- POST /api/trigger — 테스트 트리거

## 검증 항목

1. HTTP 상태코드 (200/201)
2. JSON 응답 구조
3. 에러 응답 형식
