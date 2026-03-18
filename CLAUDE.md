# Makestar QA Hub

QA 통합 플랫폼 — E2E 테스트 실행, 결과 모니터링, AI 기반 TC 자동 생성

## URL
- Production: https://makestar-qa-hub.vercel.app
- GitHub: https://github.com/dykim0518/makestar-qa-hub

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + CSS custom properties (다크 테마)
- Drizzle ORM + Neon PostgreSQL (Serverless)
- Recharts (차트)
- Vercel (배포), GitHub Actions (CI/CD + 테스트 실행)

## 프로젝트 구조
```
src/
├── app/                    # App Router 페이지 & API
│   ├── dashboard/          # 대시보드 (테스트 결과 모니터링)
│   ├── trigger/            # 테스트 실행 트리거
│   ├── tc/                 # TC Builder (AI TC 생성)
│   ├── runs/               # Run 상세 & 비교
│   └── api/                # API Routes (runs, results, tc, trends, trigger)
├── components/             # React 컴포넌트
├── db/                     # Drizzle 스키마 & DB 연결
└── lib/                    # 유틸리티 함수
```

## 주요 페이지 & 컴포넌트
| 페이지 | 파일 | 핵심 컴포넌트 |
|--------|------|--------------|
| 대시보드 | `app/dashboard/page.tsx` | DashboardContent, SummaryCards, TrendCharts, FlakyRanking, RunsTable |
| 테스트 실행 | `app/trigger/page.tsx` | 단일 파일 (CaseGroup, CaseRow 등 내부 컴포넌트) |
| TC Builder | `app/tc/page.tsx` | TcBuilderShell, TcTemplateManager |
| 가이드 버튼 | — | DashboardGuide, TriggerGuide, TcBuilderGuide |

## 컨벤션
- **가이드 컴포넌트 패턴**: 우하단 FAB 버튼 (`fixed bottom-6 right-6 z-50`) + 슬라이드 패널 (360px, 70vh). 외부 클릭 시 닫힘. steps 배열로 내용 관리.
- **스타일링**: Tailwind + CSS 변수 (`--background`, `--card`, `--card-border`, `--muted`, `--accent`)
- **폴링**: 실행 중 5초, 유휴 시 30초, 탭 복귀 시 즉시 갱신
- **서버/클라이언트 분리**: 페이지는 서버 컴포넌트에서 초기 데이터 fetch → 클라이언트 컴포넌트에 props 전달
- **API Routes**: `app/api/` 하위, Drizzle ORM으로 DB 접근

## 배포
- `git push origin main` → Vercel 자동 배포
- 또는 `npx vercel --prod` 수동 배포

## 주의사항
- TC Builder는 현재 최적화 진행 중
- `auth.json`, `ab-auth.json`, `admin-tokens.json` 수정 금지
- 명시적 요청 없으면 git commit/push 하지 않음
