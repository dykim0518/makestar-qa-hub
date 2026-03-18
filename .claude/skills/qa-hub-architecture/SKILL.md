---
name: qa-hub-architecture
description: QA Hub 전체 아키텍처, 폴더 구조, 데이터 흐름. Use when working with project structure, new pages, new API routes, component architecture, or database schema.
---

# QA Hub Architecture

## 기술 스택

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + CSS Variables (다크 테마)
- Drizzle ORM + Neon PostgreSQL (Serverless)
- Recharts (차트), Octokit (GitHub API)

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # 대시보드 (모니터링)
│   ├── trigger/           # 테스트 실행 트리거
│   ├── tc/                # TC Builder (AI 테스트 케이스 생성)
│   ├── runs/              # Run 상세 + 비교
│   ├── api/               # API Routes
│   └── login/             # 인증
├── components/            # React 컴포넌트 (18개)
├── lib/                   # 유틸리티 (12개)
├── db/                    # Drizzle 스키마 + 연결
└── middleware.ts          # 라우팅 미들웨어
```

## 페이지별 기능

- **Dashboard**: 테스트 실행 목록, 트렌드 차트, Flaky 랭킹, 에러 분류
- **Trigger**: GitHub Actions 워크플로우 실행
- **TC Builder**: AI 기반 테스트 케이스 자동 생성

## DB 스키마 (9 테이블)

- testRuns, testCases — 테스트 실행/결과
- tcProjects, tcSources, tcRequirements — TC Builder 소스
- tcTemplateProfiles, tcGenerationRuns, tcGeneratedCases, tcValidationIssues — TC 생성

## 컴포넌트 패턴

- 페이지: Server Component (초기 데이터 fetch)
- 인터랙션: Client Component (props로 데이터 전달)
- 가이드: 각 페이지 우하단 FAB 버튼 (360px 슬라이드 패널)

## API 폴링 전략

- 활성: 5초 간격
- 유휴: 30초 간격
- 탭 포커스: 즉시 갱신
