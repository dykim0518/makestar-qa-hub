---
description: 빌드 검증 후 Vercel 배포
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(git:*)
---

# Deploy

1. `npm run build` — 빌드 검증
2. 에러 없으면 `git push origin main`
3. Vercel 자동 배포 확인: `npx vercel ls`
