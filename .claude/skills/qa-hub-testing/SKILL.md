---
name: qa-hub-testing
description: QA Hub 테스트 패턴, API 테스트, 빌드 검증 방법. Use when writing tests, debugging API routes, or validating build.
---

# QA Hub Testing

## 빌드 검증

```bash
npx tsc --noEmit     # 타입 체크
npm run build        # Next.js 빌드
npm run lint         # ESLint
```

## API 테스트 (curl)

```bash
# 실행 목록
curl -s "https://makestar-qa-hub.vercel.app/api/runs?limit=5" | python3 -m json.tool

# 트렌드
curl -s "https://makestar-qa-hub.vercel.app/api/trends?days=7" | python3 -m json.tool

# Flaky 랭킹
curl -s "https://makestar-qa-hub.vercel.app/api/flaky-ranking?days=7" | python3 -m json.tool
```

## Drizzle 스키마 변경 시

1. `src/db/schema.ts` 수정
2. `npx drizzle-kit generate` — 마이그레이션 생성
3. `npx drizzle-kit push` — DB 적용
4. 빌드 확인

## 개발 서버

```bash
npm run dev          # localhost:3000
```
