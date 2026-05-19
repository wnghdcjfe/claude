# MD2Short — AGENTS.md

## 1. 프로젝트 정의

**MD2Short** — 마크다운 1개를 입력하면 9:16 숏폼 영상(MP4)을 자동 생성하는 **단일 Python CLI**.

- **입력**: 임의의 `<sample.md>` 마크다운
- **출력**: 모든 산출물은 `jobs/<job_id>/` 하위에 생성
  - `edit/final.mp4` — Remotion 합성 결과
  - `output/ret.mp4` — 최종 배포용 (후처리 결과)
  - `qc_report.json` — QC·비용·메타데이터
  - `status.json` — Job 상태 전이 기록
  - `logs/` — 단계별 input/output 로그
  - `words.json`, `edl.json`, `props.json` — 레이어 간 통신

> 모든 경로는 `jobs/<job_id>/` 기준 상대경로. Job ID 포맷은 `docs/architecture.md` §3.2 참조. 빌드·실행 명령은 `README.md` 참조.

---

## 2. 문서 지도

문서 인덱스의 단일 진실원은 [`docs/README.md`](docs/README.md)임. `AGENTS.md`는 작업 원칙과 반드시 읽어야 할 핵심 문서 링크만 유지한다.

| 파일 | 범위 | 언제 |
| --- | --- | --- |
| `AGENTS.md` | 진입점·원칙·컨벤션 | 항상 |
| `docs/README.md` | 전체 문서 인덱스 | 문서 탐색·새 문서 추가 시 |
| `README.md` | 빌드·테스트·실행 | 환경 셋업·재현 |
| `docs/architecture.md` | 시스템 설계 (HOW) | 구현·디버깅 |

> **`docs/memory.md`(규칙) ≠ `memory/`(데이터).** 규칙 변경은 `docs/memory.md`에서, 실패 기록은 `memory/_daily/`에서.

---

## 3. 핵심 설계 원칙 (위반 금지)

근거: `docs/architecture.md` §1.

### 3.1 레이어 분리

| 레이어 | 구성 | 입력 | 출력 | 금지 |
| --- | --- | --- | --- | --- |
| 음성 | ElevenLabs (TTS+Scribe) | 대본 텍스트 | TTS 오디오, `words.json` | 시간 추정·편집 판단 |
| 비주얼 합성 | Remotion (`npx remotion render` subprocess) | `props.json`, 미디어 자산 | 합성 MP4 (자막 포함) | 편집 판단·시간 계산·외부 API 호출 |

레이어 간 통신은 JSON 산출물(`words.json`, `edl.json`, `props.json`)로만. AI는 편집 설계서만 만들고, Remotion은 props대로 확정적으로 렌더링만 함.

### 3.2 단일 진실원

`words.json` = 모든 시간 기준의 단일 진실원. 어느 레이어도 시간을 추정하지 않음.

### 3.3 음성 길이 기준 타임라인

대본의 예상 시간이 아니라 **실제 생성된 TTS 오디오 길이**로 장면 분할.

### 3.4 자막은 Remotion 단독 책임

- Remotion 컴포넌트가 `props.json`을 받아 React 렌더링으로 자막 합성.
- **FFmpeg `subtitles` filter / burn-in / overlay 금지** (§3.1 레이어 분리 위반).
- 파이프라인 끝단에 FFmpeg 후처리가 있다면(예: 코덱 변환) 그 시점에는 이미 자막이 Remotion 픽셀에 포함된 상태. FFmpeg는 자막을 *추가하지 않음*.

---

## 4. 코딩 컨벤션

### 4.1 네이밍
- 산출물 파일명·Job ID 포맷: `docs/architecture.md` §3.2.
- 환경 변수: `MD2SHORT_*` prefix (외부 API 키 제외).

### 4.2 시간 단위
- 데이터 모델·변환 헬퍼: `docs/architecture.md` 참조.
- ms ↔ frame 변환 분기 작성 금지. 단일 헬퍼만 사용.

### 4.3 시크릿
`.env`만 사용, 절대 커밋 금지. 키 누락 시 즉시 명확한 에러로 실패.
- `ELEVENLABS_API_KEY` — Voice + Transcript Engine
- `OPENAI_API_KEY` — Script Engine

### 4.4 로깅
- 단계별 input/output → `jobs/<job_id>/logs/` (재현 가능해야 함).
- 외부 API 응답 원본은 별도 저장 (과금·디버깅 추적).

---

## 5. Memory 시스템 (실패 누적·재발 방지)

> 규칙은 `docs/memory.md`, 데이터는 `memory/`. 충돌 시 `docs/memory.md`가 우선. 본 §5는 운영 요약.

### 5.1 원칙
1라인 = 1관측사건. 추상적 권고 금지. 반복 실패의 **영구 차단**이 목적.

### 5.2 구조

```
memory/
├── _template.md              # 새 실패 기록 템플릿
├── _daily/YYYY-MM-DD.md      # 일일 로그 (append-only)
└── topics/
    ├── time-sync.md          # words.json·ms↔frame·타임라인
    ├── external-api.md       # ElevenLabs / OpenAI
    ├── remotion-render.md    # Remotion subprocess·EDL→props
    ├── build-errors.md       # uv / pnpm / 환경 의존성
    └── git-workflow.md       # 커밋·브랜치·PR
```

### 5.3 로딩 규칙

해당 영역을 **실제로 수정·디버깅할 때만** 그 topic을 읽음. 무관 작업에는 로드 금지 (컨텍스트 오염).

| 작업 영역 | 읽을 파일 |
| --- | --- |
| 시간 계산·`words.json`·`ms_to_frames` | `memory/topics/time-sync.md` |
| ElevenLabs / OpenAI 호출 | `memory/topics/external-api.md` |
| Remotion subprocess·EDL·props | `memory/topics/remotion-render.md` |
| `uv sync` / `pnpm install` / 빌드 | `memory/topics/build-errors.md` |
| `git commit` / `git push` 직전 | `memory/topics/git-workflow.md`, `docs/commit.md` |

### 5.4 작성
- 새 실패 → `memory/_daily/{YYYY-MM-DD}.md`에 append (`_template.md` 준수)
- 스키마 락·상세 형식: `docs/memory.md`

### 5.5 에스컬레이션 사다리 (올라감 ↑, 내려가지 않음)

| 단계 | 트리거 | 행동 |
| --- | --- | --- |
| 1. 일일 로그 | 1~2회 관측 | `_daily/{날짜}.md`에 append |
| 2. Topic 승격 | 동일 패턴 3회 | `topics/{slug}.md`로 이동·통합 |
| 3. 메커니즘 승격 | Topic 등록 후에도 재발 | hook·linter·schema로 결정론적 강제, memory entry는 archive |

**원칙** — Topic까지 올라온 실패가 또 발생하면 텍스트 룰의 한계라는 신호. 줄을 더 추가하지 말고 hook/linter/schema로 격상.

---

## 6. 작업 체크리스트

- [ ] 커밋 전 `docs/commit.md` 양식·trailer 규칙 확인?
- [ ] §5.3 표에 따라 해당 영역의 `memory/topics/*.md`만 읽었나? (무관 영역 로드 금지)
- [ ] 시간 계산이 `words.json`을 참조? (§3.2 — 추정 금지)
- [ ] 자막이 **Remotion `props.json`을 통해 합성**? (§3.4 — FFmpeg burn-in 금지)
- [ ] 산출물이 모두 `jobs/<job_id>/` 규약 경로? (§1)
- [ ] Job 상태 전이가 `docs/architecture.md` §2 JobStatus 시퀀스 + `status.json` 기록?
- [ ] 외부 API 호출에 재시도·타임아웃·에러 핸들링?
- [ ] 새 실패 시 `memory/_daily/{오늘}.md` 기록 + 적절한 §5.5 단계 판단?