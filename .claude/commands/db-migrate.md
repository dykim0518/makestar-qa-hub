---
description: Drizzle 스키마 변경 → 마이그레이션 생성 → 적용
allowed-tools: Bash(npx:*)
---

# DB Migration

1. `npx drizzle-kit generate` — 마이그레이션 SQL 생성
2. 생성된 SQL 확인
3. `npx drizzle-kit push` — DB 적용
4. 결과 확인
