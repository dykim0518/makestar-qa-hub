# Makestar QA Hub — DESIGN.md

QA 통합 플랫폼의 시각 시스템. 새 페이지·컴포넌트 작업 시 이 문서의 토큰·패턴을 그대로 적용해 일관성을 유지합니다. 현재 운영 중인 코드(`globals.css`, 컴포넌트 패턴)에서 추출한 사실 자료입니다 — 외부 베이스 차용본이 아닙니다.

## 1. Visual Theme & Atmosphere

라이트 모드 기반의 **cool slate 톤** QA 모니터링 대시보드. 가독성·정보 밀도·상태 직관성이 최우선이며, 화려한 그라디언트·다크 시각효과 없이 차분한 무게감으로 의사결정을 돕습니다.

**Key Characteristics:**

- 라이트 모드 기본. `:root` 토큰만 오버라이드해 다크 전환 가능한 구조 (`globals.css:10`)
- Cool slate 베이스(`#f1f5f9` 배경 / `#1e293b` 텍스트) — pure white가 아니라 살짝 푸른 기조
- 한글·영문 동시 가독을 위해 **Pretendard Variable + Geist Sans** 조합
- 의미 색은 Tailwind semantic 직접 사용 (emerald=성공, rose=실패, amber=flaky, indigo=info/CTA)
- WCAG AA 대비 4.5:1 보장 — `--muted`는 slate-600(#475569, 7.2:1) 이상
- 카드 호버 시 **border 색 + glow shadow** 결합 피드백
- 가이드 FAB(우하단) + 슬라이드 패널 패턴이 시그니처 인터랙션

## 2. Color Palette & Roles

### Surface & Text (CSS 변수)

| 변수              | 값                     | 용도                           |
| ----------------- | ---------------------- | ------------------------------ |
| `--background`    | `#f1f5f9`              | 페이지 배경 (slate-100)        |
| `--foreground`    | `#1e293b`              | 기본 텍스트 (slate-800)        |
| `--card`          | `#ffffff`              | 카드/패널 배경                 |
| `--card-border`   | `#e2e8f0`              | 카드 경계선 (slate-200)        |
| `--card-hover`    | `rgba(0,0,0,0.03)`     | 카드 호버 오버레이             |
| `--card-elevated` | `#f8fafc`              | 상승 카드 배경 (slate-50)      |
| `--muted`         | `#475569`              | 보조 텍스트 (slate-600, 7.2:1) |
| `--accent`        | `#334155`              | 강조·활성 (slate-700)          |
| `--glow-slate`    | `rgba(71,85,105,0.08)` | 카드 호버 그로우               |

### Status (의미 색)

| 변수        | 값        | 의미     | 사용 예                          |
| ----------- | --------- | -------- | -------------------------------- |
| `--success` | `#059669` | Pass     | emerald-600. RunsTable의 통과 핀 |
| `--warning` | `#d97706` | Flaky    | amber-600. FlakyRanking          |
| `--danger`  | `#e11d48` | Fail     | rose-600. 실패 표시              |
| `--info`    | `#6366f1` | Link/CTA | indigo-500. 포커스 링·링크       |

### 상태 색의 3-tier 컨벤션

상태마다 **bg / text / border**를 50/700/200 톤으로 일관 사용:

| 상태    | 배경            | 텍스트             | 보더                 |
| ------- | --------------- | ------------------ | -------------------- |
| Pass    | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| Fail    | `bg-rose-50`    | `text-rose-700`    | `border-rose-200`    |
| Flaky   | `bg-amber-50`   | `text-amber-700`   | `border-amber-200`   |
| Neutral | `bg-slate-50`   | `text-slate-700`   | `border-slate-200`   |

## 3. Typography Rules

### Font Family

- **Sans (한글·영문)**: `Pretendard Variable`, fallback: `var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
  - CDN: `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9`
  - 한글 가독성 우선, Geist는 fallback으로 영문 보강
- **Mono**: `var(--font-geist-mono)` — Geist Mono (next/font/google)

`layout.tsx:28-44`, `globals.css:42-46`

### 사용 빈도 기반 Hierarchy

| 역할            | Tailwind                            | 용도                              |
| --------------- | ----------------------------------- | --------------------------------- |
| Display Number  | `text-4xl font-bold tracking-tight` | SummaryCards 큰 숫자              |
| Page Title      | `text-2xl md:text-3xl font-bold`    | 페이지 헤딩                       |
| Section Title   | `text-xl font-semibold`             | 카드 그룹 타이틀                  |
| Card Title      | `text-lg font-semibold`             | 개별 카드 헤더                    |
| Body            | `text-sm text-[var(--foreground)]`  | 본문                              |
| Body Muted      | `text-sm text-[var(--muted)]`       | 보조 본문                         |
| Caption / Label | `text-xs font-medium`               | 라벨, 메타데이터 (가장 빈도 높음) |
| Tracking Wider  | `text-xs uppercase tracking-wider`  | legend, 타임스탬프 영역           |

### Principles

- 큰 숫자에는 `tracking-tight`로 밀도감
- 라벨에는 `tracking-wider` + `uppercase`로 분산
- `font-bold`는 제목·메트릭에만, `font-semibold`는 강조·뱃지
- 직접 hex 색 대신 `text-[var(--muted)]` 같은 토큰 우선

## 4. Component Stylings

### Buttons

**Primary CTA (Indigo)**

- bg: `bg-indigo-600` / hover: `bg-indigo-700`
- text: `text-white`
- radius: `rounded-lg`
- padding: `px-4 py-2`
- shadow: hover에서 `shadow-lg`
- 용도: 트리거 실행, FAB

**Secondary**

- bg: `bg-slate-100` / hover: `bg-slate-200`
- text: `text-slate-900`
- border: `border border-slate-200`
- 용도: 필터, 토글

**Ghost**

- bg: transparent / hover: `bg-slate-50`
- text: `text-slate-600`
- 용도: 탐색 링크

**Icon Button**

- bg: `bg-slate-100` / hover: `bg-slate-200`
- size: `p-2 rounded-lg`
- 용도: 헤더 액션

### Cards

```
bg-[var(--card)]
border border-[var(--card-border)]
rounded-xl
padding: p-4 (mobile) → sm:p-5 → md:p-6
hover: border-[var(--accent)]/30 + shadow-lg
transition-all duration-200
```

상승형 카드는 `bg-[var(--card-elevated)]` 사용 (`SummaryCards.tsx:118-120`)

### Inputs

```
border border-slate-200
bg-white rounded-lg
px-3 py-2
text-sm
focus: outline-2 outline-indigo-500 outline-offset-2
```

### Badges (Status Pill)

```
rounded-full px-2.5 py-1
text-xs font-semibold
bg-[status]-50 text-[status]-700 border border-[status]-200
```

상태별 색은 **§2 Status 3-tier 컨벤션** 참조.

### Alpha Badges (강조 환경 표시)

배경에 alpha를 줘서 더 가벼운 강조를 줄 때:

```
rounded-md px-1.5 py-0.5
font-mono text-[10px] font-semibold
border border-{color}-500/30 bg-{color}-500/10 text-{color}-600
```

용례: STG/PROD 환경 배지 (`RunsTable.tsx:131-138`). 3-tier 핀과 달리 `text-mono`·`text-[10px]`로 기술 라벨 톤.

### Progress Track

```
h-1.5 w-full overflow-hidden rounded-full bg-slate-100
└─ inner: h-full rounded-full bg-{status}-500 transition-all (style: width %)
```

용례: SummaryCards 성공률 바, RunsTable PassRateBar. 트랙은 항상 `bg-slate-100`, 채움은 상태 색 500.

### Tables (RunsTable 패턴)

- 모바일: `grid-cols-1` 카드 그리드
- 태블릿: `sm:grid-cols-2`
- 데스크톱: 테이블 + 체크박스
- 행 호버: 배경 미세 변화 + 보더 강조

### Guide FAB (시그니처 패턴)

```
FAB 버튼:  fixed bottom-6 right-6 z-50
           rounded-full bg-indigo-600 text-white shadow-lg
           p-3 또는 p-4

슬라이드 패널: position fixed right-6 bottom-24 (FAB 위)
              width 360px / max-height 70vh
              bg-[var(--card)] rounded-xl
              border border-[var(--card-border)]
              animation 슬라이드 in/out

외부 클릭: mousedown 이벤트로 패널 닫힘 (useRef 사용)
```

`DashboardGuide.tsx:48-60`. DashboardGuide / TriggerGuide / TcBuilderGuide 모두 동일 패턴.

## 5. Layout Principles

### Spacing 빈도 (Tailwind)

| 빈도  | 값            | 용도          |
| ----- | ------------- | ------------- |
| 36회  | `py-3`        | 버튼·필드     |
| 32회  | `px-2`        | 필드·라벨     |
| 29회  | `gap-1`       | 타이트 간격   |
| 28회  | `px-3`        | 버튼·카드     |
| 27회  | `gap-2`       | 내부 아이템   |
| 21회  | `gap-3`       | 섹션·컴포넌트 |
| 12회  | `gap-4`       | 큰 섹션       |
| 6회씩 | `p-4` / `p-5` | 카드 기본     |
| 4회   | `p-6`         | 큼 패널       |

### Container

- 페이지 max-width: `max-w-7xl` (`dashboard/page.tsx:31`, `trigger/page.tsx:41`)
- 페이지 padding: `px-6` 기본 → `sm:px-6` 유지
- Section 간격: `mt-8 pt-8` (`section-divider` 유틸리티)

### Grid 패턴

- `grid-cols-2` 모바일 기본
- `sm:grid-cols-3` 태블릿 (SummaryCards)
- `md:grid-cols-5` 데스크톱 (SummaryCards)
- `lg:grid-cols-[400px_1fr]` 양쪽 레이아웃 (trigger 페이지)

### Border Radius Scale

| Tailwind       | 값     | 용도             |
| -------------- | ------ | ---------------- |
| `rounded`      | 4px    | 인라인 미세 요소 |
| `rounded-md`   | 6px    | 작은 컨테이너    |
| `rounded-lg`   | 8px    | 버튼·인풋        |
| `rounded-xl`   | 12px   | 카드·패널        |
| `rounded-full` | 9999px | 핀·아바타·FAB    |

## 6. Depth & Elevation

| 레벨         | Tailwind                     | 용도                             |
| ------------ | ---------------------------- | -------------------------------- |
| L0 (flat)    | —                            | 페이지 배경                      |
| L1 (subtle)  | `shadow-sm`                  | 기본 카드, 필드 (가장 빈도 높음) |
| L2 (hover)   | `shadow-lg` + `--glow-slate` | 카드 호버                        |
| L3 (overlay) | `shadow-xl`                  | 팝오버, 가이드 패널              |

### Glow 시스템

```css
.card-glow:hover {
  box-shadow: 0 4px 12px var(--glow-slate);
}
```

상태별 glow 변형:

- `shadow-emerald-500/5` — 성공 카드
- `shadow-rose-500/5` — 실패 카드
- `shadow-amber-500/5` — flaky 카드

`SummaryCards.tsx:20-27`, `globals.css:118-123`

### Focus Ring (WCAG AA)

```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #6366f1; /* indigo-500 */
  outline-offset: 2px;
  border-radius: 4px;
}
```

`globals.css:77-91` — 모든 인터랙티브 요소에 자동 적용.

## 7. Do's and Don'ts

### Do

- ✓ CSS 변수 우선 (`text-[var(--muted)]`, `bg-[var(--card)]`)
- ✓ 의미 색은 Tailwind semantic (emerald/rose/amber/indigo) 그대로
- ✓ 상태는 bg/text/border 50/700/200 3-tier로 일관
- ✓ 카드 호버는 border 색 변화 + glow shadow 결합
- ✓ 모바일 우선 작성 → `sm:` / `md:` / `lg:` 순으로 확장
- ✓ 큰 숫자에 `tracking-tight`, 라벨에 `tracking-wider`
- ✓ 한글 본문은 Pretendard Variable이 자동 적용 (별도 폰트 지정 불필요)
- ✓ 새 가이드 컴포넌트는 FAB 360px 패널 패턴 그대로 채용

### Don't

- ✗ `--muted`보다 밝은 회색 사용 금지 (대비 4.5:1 미달)
- ✗ 직접 hex 색 박지 말 것 — CSS 변수 또는 Tailwind 토큰 사용
- ✗ 상태 색 혼합 금지 (emerald bg + rose text 같은 조합)
- ✗ `font-bold` (700)를 본문에 쓰지 말 것 — 제목·메트릭만
- ✗ `shadow-sm`과 `drop-shadow`를 동시에 쌓지 말 것
- ✗ `p-6` 이상은 패널 레벨에서만 — 카드 기본은 `p-4`/`p-5`
- ✗ pure white 배경(`#ffffff`) 사용 금지 — 페이지 배경은 `--background`(`#f1f5f9`)로 cool slate 유지

## 8. Responsive Behavior

### Breakpoints

| 이름    | 값            | 주요 변화                                  |
| ------- | ------------- | ------------------------------------------ |
| Mobile  | <640px        | 단일 컬럼, `grid-cols-2` 기본, `p-4`       |
| Tablet  | `sm:` 640px+  | `sm:grid-cols-3`, `sm:p-5`, `sm:gap-4`     |
| Desktop | `md:` 768px+  | `md:grid-cols-5`, `md:p-6`, `md:text-3xl`  |
| Large   | `lg:` 1024px+ | 양쪽 레이아웃 (`lg:grid-cols-[400px_1fr]`) |
| XL      | `xl:` 1280px+ | 추가 그리드 조정 (필요 시)                 |

### Collapsing 패턴

| 요소             | 모바일        | 데스크톱                   |
| ---------------- | ------------- | -------------------------- |
| Grid             | `grid-cols-2` | `md:grid-cols-5`           |
| 페이지 제목      | `text-2xl`    | `md:text-3xl`              |
| 카드 padding     | `p-4`         | `sm:p-5` → `md:p-6`        |
| Gap              | `gap-2~3`     | `gap-4+`                   |
| Trigger 레이아웃 | 단일 컬럼     | `lg:grid-cols-[400px_1fr]` |

## 9. Agent Prompt Guide

### 새 컴포넌트 만들 때 빠른 참조

```
- 카드 컨테이너: bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 sm:p-5 md:p-6
- 본문 텍스트: text-sm text-[var(--foreground)]
- 보조 텍스트: text-sm text-[var(--muted)]
- 라벨: text-xs font-medium uppercase tracking-wider text-[var(--muted)]
- Primary CTA: bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2
- 상태 핀: rounded-full px-2.5 py-1 text-xs font-semibold bg-{status}-50 text-{status}-700 border border-{status}-200
- 호버 카드: hover:border-[var(--accent)]/30 hover:shadow-lg transition-all duration-200
```

### 자주 쓰는 패턴 프롬프트

- "새 카드 그룹 만들어줘" → `max-w-7xl mx-auto px-6` 안에 `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4`
- "상태 표시 추가해줘" → `StatusBadge` 또는 emerald/rose/amber 50/700/200 3-tier 핀
- "가이드 추가해줘" → 우하단 FAB(`fixed bottom-6 right-6 z-50`) + 360px/70vh 슬라이드 패널 + `mousedown` 외부 클릭 감지
- "큰 숫자 표시해줘" → `text-4xl font-bold tracking-tight text-[var(--foreground)]`
- "필터 칩 만들어줘" → secondary button 패턴 (`bg-slate-100` ...) + 활성 시 `bg-indigo-100 text-indigo-700`

### 주의

- 폴링 주기는 실행 중 5초 / 유휴 30초 / 탭 복귀 즉시 갱신 (`CLAUDE.md` 명시)
- 페이지는 서버 컴포넌트로 초기 데이터 fetch → 클라이언트 컴포넌트(`"use client"`)에 props 전달
- API Routes는 `app/api/` 하위, Drizzle ORM으로 DB 접근

---

_출처: `globals.css`, `layout.tsx`, `src/components/*` 실제 사용 패턴 추출 (2026-04-28)._
