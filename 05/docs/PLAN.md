# 할일 + 계획 관리 앱 구현 계획

---

## 요약
Next.js 14 (App Router) + TypeScript + MongoDB(Mongoose) 기반의 할일·주간계획·1년목표 연결 관리 앱.
P0(핵심) + P1(추가) 전체 스코프를 7단계 페이즈로 구현.

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 App Router | SSR + API Routes 통합 |
| 언어 | TypeScript | 타입 안전성 |
| DB | MongoDB + Mongoose | 유연한 스키마, 빠른 개발 |
| 스타일 | Tailwind CSS | 빠른 UI 구성 |
| 상태 관리 | Zustand (슬라이스 구조) | 경량, DnD 상태 통합 편의 |
| 드래그앤드랍 | dnd-kit | React 18 호환, 접근성 지원 |
| 순서 관리 | fractional-indexing | 카드 1건 변경 시 PATCH 1회로 완결 |

---

## 데이터 모델

### Goal (1년 목표)
```ts
{
  _id: ObjectId
  title: string
  description: string
  progress: number        // 0-100 (P1 — 연결된 todo 완료율 자동 계산)
  createdAt: Date
  updatedAt: Date
}
```

### WeeklyPlan (주간 계획)
```ts
{
  _id: ObjectId
  weekStart: Date
  goals: { text: string; done: boolean }[]  // 완료 추적 서브도큐먼트 (최대 5개)
  memo: string
  retrospective: string                      // P1
  goalId?: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

### Todo (할일)
```ts
{
  _id: ObjectId
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  priority: 'high' | 'medium' | 'low'  // P1
  dueDate?: Date                         // P1
  dayOfWeek?: number                     // 0(일)~6(토)
  order: string                          // fractional index 문자열 (예: "a0", "a1", "Zz")
  weeklyPlanId?: ObjectId
  goalId?: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

> `order` 문자열 사전순 정렬 사용. 카드 이동 시 해당 카드 1건만 PATCH.

---

## 디렉토리 구조

```
05/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── todos/page.tsx
│   ├── weekly/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── goals/page.tsx
│   └── api/
│       ├── todos/route.ts
│       ├── todos/[id]/route.ts
│       ├── weekly/route.ts
│       ├── weekly/[id]/route.ts
│       ├── goals/route.ts
│       └── goals/[id]/route.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── todos/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TodoCard.tsx
│   │   ├── TodoForm.tsx
│   │   └── TodoModal.tsx
│   ├── weekly/
│   │   ├── WeeklyPlanCard.tsx
│   │   ├── WeeklyPlanForm.tsx
│   │   ├── WeekGrid.tsx
│   │   ├── WeeklyGoalItem.tsx
│   │   └── ProgressBar.tsx           // P1
│   ├── goals/
│   │   ├── GoalCard.tsx
│   │   ├── GoalForm.tsx
│   │   └── GoalProgress.tsx          // P1
│   └── shared/
│       ├── Modal.tsx
│       ├── PriorityBadge.tsx         // P1
│       └── Badge.tsx
├── lib/
│   ├── mongodb.ts
│   ├── fractionalIndex.ts
│   └── utils.ts
├── models/
│   ├── Goal.ts
│   ├── WeeklyPlan.ts
│   └── Todo.ts
├── store/
│   ├── index.ts
│   ├── todoSlice.ts
│   ├── weeklySlice.ts
│   └── goalSlice.ts
├── types/
│   └── index.ts
└── docs/
    └── PRD.md
```

---

## 구현 페이즈

### Phase 1 — 프로젝트 셋업
**목표**: 개발 가능한 베이스 환경 구성

- [ ] `npx create-next-app@latest` (TypeScript, Tailwind, App Router, ESLint)
- [ ] 패키지 설치: `mongoose`, `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `fractional-indexing`
- [ ] `.env` 에 `MONGODB_URI` 설정
- [ ] `lib/mongodb.ts` — Mongoose 연결 캐싱 (Next.js HMR 대응)
- [ ] `lib/fractionalIndex.ts` — `generateKeyBetween` 래퍼
- [ ] `store/index.ts` + 슬라이스 뼈대 3개(`todoSlice`, `weeklySlice`, `goalSlice`) 생성
- [ ] 루트 레이아웃 + Sidebar + Header 컴포넌트

**수용 기준**:
- `npm run dev` 정상 실행
- `/` 접속 시 사이드바 포함 레이아웃 렌더링
- Zustand DevTools에서 3개 슬라이스 상태 확인 가능

---

### Phase 2 — 데이터 레이어
**목표**: 모든 API Route + Mongoose 모델 완성

- [ ] `models/Goal.ts`
- [ ] `models/WeeklyPlan.ts` — `goals` 필드를 `[{ text: String, done: Boolean }]` SubSchema로 정의
- [ ] `models/Todo.ts` — `order` 필드 타입 `String`, 인덱스: `{ status: 1, order: 1 }`
- [ ] `app/api/goals/route.ts` — GET, POST
- [ ] `app/api/goals/[id]/route.ts` — GET, PUT, DELETE
- [ ] `app/api/weekly/route.ts` — GET(주차별 필터), POST
- [ ] `app/api/weekly/[id]/route.ts` — GET, PUT, DELETE, PATCH(`goals[n].done` 토글)
- [ ] `app/api/todos/route.ts` — GET(필터: status, weeklyPlanId, goalId), POST
- [ ] `app/api/todos/[id]/route.ts` — GET, PUT, DELETE, PATCH(status/order)
- [ ] `types/index.ts` — 공통 인터페이스

**수용 기준**:
- 모든 엔드포인트 CRUD 동작 확인
- `goals[].done` PATCH 후 응답에 변경된 서브도큐먼트 반영
- 카드 이동 시 PATCH가 1회만 호출되고 `order` 문자열 저장 확인
- 잘못된 ObjectId 요청 시 400, DB 연결 실패 시 500 반환

---

### Phase 3 — 목표 관리 (P0)
**목표**: 1년 목표 CRUD UI 완성

- [ ] `store/goalSlice.ts` 액션 구현 (fetch, add, update, delete)
- [ ] `app/goals/page.tsx` — 목표 목록 + 신규 생성 버튼
- [ ] `GoalCard.tsx` — 제목, 설명, 수정/삭제 액션
- [ ] `GoalForm.tsx` — 제목(필수) + 설명(선택)
- [ ] `Modal.tsx` 공통 컴포넌트

**수용 기준**:
- 목표 생성 후 목록에 즉시 표시
- 수정 시 기존 값 폼에 pre-fill
- 삭제 시 확인 다이얼로그 후 제거

---

### Phase 4 — 주간 계획 (P0)
**목표**: 주간 계획 생성 + 요일별 할일 배치

- [ ] `lib/utils.ts` — `getWeekStart(date)`
- [ ] `store/weeklySlice.ts` 액션 구현 (fetch, add, update, toggleGoal)
- [ ] `app/weekly/page.tsx` — 주간 목록 (최근 4주)
- [ ] `app/weekly/[id]/page.tsx` — 주간 상세: 목표 목록 + 메모 + WeekGrid
- [ ] `WeeklyGoalItem.tsx` — `goals[].done` 체크박스 토글 UI
- [ ] `WeekGrid.tsx` — 7열 그리드
- [ ] `WeeklyPlanForm.tsx` — 주간 목표(최대 5개), 메모, 1년 목표 연결

**수용 기준**:
- 같은 주 중복 생성 불가 (API 409)
- WeekGrid에서 요일 셀 클릭으로 할일 배치 가능
- 체크박스 토글 후 즉시 done 상태 반영
- 주간 진행률(`goals[].done` 기준) 표시

---

### Phase 5 — 칸반 보드 (P0 핵심)
**목표**: 드래그앤드랍 Todo 상태 관리

- [ ] `store/todoSlice.ts` 액션 구현 (fetch, add, update, delete, reorder)
- [ ] `KanbanBoard.tsx` — `DndContext` + `DragOverlay`
- [ ] `KanbanColumn.tsx` — status별 `SortableContext` (order 사전순 정렬)
- [ ] `TodoCard.tsx` — `useSortable`, 제목/우선순위/마감일 표시
- [ ] `TodoForm.tsx` — 제목(필수), 설명, 주간계획·목표 연결
- [ ] 드래그 완료 시 `PATCH /api/todos/[id]` 1회 호출
- [ ] Optimistic update + API 실패 시 롤백

**수용 기준**:
- 3개 컬럼 간 드래그앤드랍 동작
- 같은 컬럼 내 순서 변경 가능
- 새로고침 후 순서/상태 유지
- Network 탭에서 PATCH 요청 1건만 발생

---

### Phase 6 — 대시보드 (P0)
**목표**: 이번 주 현황 한눈에 파악

- [ ] `app/page.tsx` — 이번 주 WeeklyPlan 자동 조회
- [ ] 주간 목표 목록 + done 체크박스
- [ ] 상태별 Todo 카운트
- [ ] 주간 진행률 프로그레스 바
- [ ] 1년 목표별 이번 주 연결 할일 수

**수용 기준**:
- `/` 접속 시 이번 주 주간 계획 자동 로드
- 할일 완료 시 대시보드 진행률 실시간 반영

---

### Phase 7 — P1 기능
**목표**: PRD P1 전체 구현

- [ ] 우선순위: High/Medium/Low 선택 + `PriorityBadge` 컬러 표시
- [ ] 마감일: DatePicker + 오늘 이전 날짜 경고
- [ ] 주간 진행률 %: WeeklyPlan 상세 + 대시보드 ProgressBar
- [ ] 목표별 진행률: `GoalProgress.tsx`
- [ ] 주간 회고: WeeklyPlan 상세에 회고 텍스트 에리어 추가

**수용 기준**:
- 우선순위 High 할일 칸반 상단 고정
- 마감일 지난 할일 빨간 텍스트 표시
- 목표 카드에 진행률 % + 바 표시

---

## 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Mongoose 연결 누수 | `lib/mongodb.ts`에서 `global` 객체로 연결 캐싱 |
| dnd-kit SSR 문제 | `KanbanBoard`를 `dynamic(() => ..., { ssr: false })`로 임포트 |
| 같은 주 WeeklyPlan 중복 | `weekStart` unique 인덱스 + API 409 처리 |
| 드래그 중 API 실패 | Zustand optimistic update + 실패 시 롤백 |
| fractional-indexing 키 공간 고갈 | 키 길이 임계값 초과 시 컬럼 전체 재정규화 트리거 |

---

## 검증 단계

1. 각 API Route CRUD 검증
2. `goals[].done` PATCH 후 주간 진행률 재계산 확인
3. 드래그앤드랍 새로고침 후 상태 유지 + PATCH 1회 발생 확인
4. 대시보드 진행률 즉시 갱신 확인
5. 모바일 반응형 레이아웃 확인