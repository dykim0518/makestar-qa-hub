---
name: qa-hub-build-validator
description: QA Hub 빌드 검증. 타입체크 + Next.js 빌드 + ESLint 순차 실행.
model: haiku
tools: Bash, Read
---

# QA Hub Build Validator

1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run lint`

결과를 ✅/❌ 형식으로 보고.
