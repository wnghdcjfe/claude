# 딥리서치 종합 리포트

> **작성일** 2026-06-09
> **방법** deep-research 워크플로우(병렬 웹검색 → 소스 수집 → 3표 적대적 검증 → 종합) + 로컬 설치본 1차 검증
> **신뢰도 표기** `[높음]` 다중 1차 출처 · `[보통]` 2차·커뮤니티 출처 · ❌ 검증에서 기각된 주장

이 문서는 두 건의 딥리서치 결과를 담는다.

- **1부** — 대형 레거시 JS/TS 프로젝트에 Claude Code 적용하기: AI 친화적 레포 구조 설계
- **2부** — oh-my-claudecode(OMC) 분석: 활용법 극대화 (웹 리서치 + 로컬 설치본 1차 검증)

---
---

# 1부. 대형 레거시 JS/TS 프로젝트 — AI 친화적 레포 구조 설계

> **전제** Node/React 스택, 개발자 20명 이상, 여러 팀이 하나의 레포를 공유. 초점은 레포 구조 설계.
> **검증 통계** 소스 26건 → 주장 128개 추출 → 검증 후 20개 확정 / 5개 기각.

## 한눈에 보기

AI 친화적 레포 구조의 세 기둥은 다음과 같다.

1. **계층적 CLAUDE.md** — 루트는 프로젝트 전역, 하위 디렉토리는 로컬 관례
2. **`apps/` + `packages/` 모노레포 레이아웃 + 명시적 의존 경계**
3. **기계가 읽을 수 있는 자기검증 루프** (테스트·빌드·린트·훅)

Claude Code는 임베딩이나 중앙 인덱스 없이 **에이전틱 탐색**(파일 순회 + grep)으로 동작한다. 따라서 "어디를 봐야 하는지" 알려주는 시작 컨텍스트(CLAUDE.md 계층)의 품질이 곧 성능의 상한선이 된다.

> ⚠️ **중요한 반증** — "모노레포가 AI 출력을 *본질적으로* 향상시킨다"는 강한 인과 주장은 검증 단계에서 모두 기각(0-3)되었다. AI 친화성만을 근거로 레포 토폴로지를 바꿀 이유는 약하다.

## 1. 핵심 메커니즘: Claude Code는 코드를 어떻게 탐색하는가 `[높음]`

- 인덱스도 RAG도 없다. 파일시스템을 순회하고, 파일을 읽고, grep으로 필요한 부분만 찾고, 참조를 따라간다. 유지보수할 임베딩 인프라가 없으며 각 인스턴스는 항상 라이브 코드베이스 위에서 동작한다.
- 공식 문서 표현 그대로: *"Claude's ability to help in a large codebase is bounded by its ability to find the right context"* (대규모 코드베이스에서 Claude의 도움 능력은 올바른 컨텍스트를 찾아내는 능력에 의해 제한된다).
- **설계 함의** — 레포 구조와 CLAUDE.md가 곧 "탐색 지도"다. 이것이 부실하면 grep 비용만 늘고 엉뚱한 곳을 헤맨다.
- 출처: <https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start>

## 2. 계층적 CLAUDE.md — 가장 중요한 구조 전략 `[높음]`

**로드 방식.** 실행 위치에서 부모 디렉토리 방향으로 트리를 거슬러 올라가며, 만나는 모든 CLAUDE.md를 **덮어쓰지 않고 누적(concatenate)** 로드한다. 자식 디렉토리의 파일은 해당 디렉토리를 실제로 읽을 때 온디맨드로 로드된다.

- 예시: `packages/api/`에서 실행하면 `packages/api/CLAUDE.md`와 루트 CLAUDE.md가 함께 로드되고, 형제 디렉토리인 `packages/web/`의 규칙은 컨텍스트에 들어오지 않는다.

**역할 분담.**

- **루트 CLAUDE.md** — 프로젝트 전역 규칙(아키텍처, 코딩 표준, 레포 레이아웃)
- **패키지별 CLAUDE.md** — 로컬 관례 + 해당 영역에 **범위를 한정한 테스트·린트 명령**(`pnpm --filter`, `turbo --filter`). 전체 스위트를 돌리면 타임아웃이 나고 무관한 출력으로 컨텍스트를 낭비한다.
- Anthropic 권장: 레포 루트가 아니라 **작업과 관련된 하위 디렉토리에서 초기화**할 것.

**짧게 유지하라 (긴장 관계 주의).** CLAUDE.md는 매 세션 로드되므로 비대해지면 안 된다.

- *"Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"* (비대한 CLAUDE.md는 Claude가 실제 지시를 무시하게 만든다.)
- 각 줄마다 자문하라 — *"이 줄을 지우면 Claude가 실수하는가? 아니라면 잘라낸다."*
- 가끔만 필요한 도메인 지식·워크플로는 CLAUDE.md가 아니라 **온디맨드 skills**로 분리한다.
- 동시에 Anthropic은 *"detailed CLAUDE.md"*(상세한 CLAUDE.md)도 권장한다 → 결국 **"간결하되 충분히"** 의 균형이 핵심이다.
- ⚠️ 실측 준수율은 불완전하다(커뮤니티 보고 기준 60~70%, 길수록 하락). 권장사항의 존재와 실제 효능은 구분해야 한다.

출처: <https://code.claude.com/docs/en/memory> · <https://code.claude.com/docs/en/large-codebases> · <https://www.anthropic.com/engineering/claude-code-best-practices>

## 3. 모노레포 레이아웃 + 의존 경계 강제 `[높음]`

- **2단 레이아웃** — `apps/`(애플리케이션) + `packages/`(공유 라이브러리·툴링). 예: `apps/web`, `apps/docs`, `packages/ui`, `packages/config`. Claude Code의 large-codebases 문서와 Turborepo 공식 문서가 권장하는 표준 패턴이다.
- **공개 API 경계를 코드로 강제** — `package.json`의 `exports` 필드와 단일 진입점(`index.ts`)을 사용한다. `exports`가 정의되면 노출하지 않은 서브패스는 `ERR_PACKAGE_PATH_NOT_EXPORTED`로 캡슐화되어 패키지의 공개 인터페이스가 명확해진다. Nx도 `index.ts` 외의 deep import를 금지한다.
- **레이어드 단방향 의존 흐름 + lint 강제** — 메르카리(Mercari) 웹 팀 실제 사례: `core → domain → feature → app`의 단방향 흐름을 `eslint-plugin-boundaries`로 강제한다. `AGENTS.md`가 `@docs/architecture.md`를 참조하도록 해서 AI에게 이 구조를 학습시키고, 그 결과 AI 출력이 매번 개발자에 의해 재구조화되는 일을 막는다.
- **Nx `affected` 그래프** — git 이력과 프로젝트 그래프로 변경의 영향을 받는 프로젝트만 계산해, 그 부분집합에 대해서만 테스트·린트를 실행한다. CI 속도가 크게 빨라진다.
- **로컬 링크 공유 패키지** — `workspace:*`(pnpm), npm v7+ workspaces를 쓰면 레지스트리에 퍼블리시하지 않고도 심볼릭 링크로 여러 앱에서 공유 패키지를 소비할 수 있다.

출처: <https://nodejs.org/api/packages.html> · <https://nx.dev/docs/features/ci-features/affected> · <https://engineering.mercari.com/en/blog/entry/20251030-taming-agents-in-the-mercari-web-monorepo/> · <https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository> · <https://pnpm.io/workspaces>

## 4. 가드레일 — 에이전트가 스스로 교정하게 만들기 `[높음]`

- **기계가 읽을 수 있는 검증 체크가 핵심** — 테스트 스위트, 빌드 종료 코드, 린터, 픽스처 출력을 비교하는 스크립트, 브라우저 스크린샷처럼 **합격/불합격 신호**를 주면 Claude가 *작업 → 체크 실행 → 결과 읽기 → 통과*까지 스스로 반복한다. *"Give Claude something that produces a pass or fail, and the loop closes on its own"*(합격/불합격을 내는 무언가를 주면 루프가 알아서 닫힌다). 코드보다 테스트를 먼저 작성하는 TDD 방식에서 특히 효과적이다.
- **결정론적 강제는 훅(hooks)으로** — CLAUDE.md의 지시는 권고(advisory)에 불과하다. *"hooks are deterministic and guarantee the action happens"*(훅은 결정론적이며 동작을 보장한다). Stop 훅은 체크가 통과할 때까지 턴 종료를 차단(종료 코드 2)할 수 있고, 8회 연속 차단되면 무한 루프 방지를 위해 override되어 턴이 종료된다.
- **온보딩 활용** — Anthropic 내부에서는 신규 입사자가 거대 코드베이스를 탐색할 때 Claude Code를 쓴다. CLAUDE.md를 읽어 관련 파일을 식별하고 파이프라인 의존성을 설명하며, 전통적 데이터 카탈로그 도구를 대체한다. (단, 데이터사이언스 팀의 자기보고 사례라 일반화에는 주의.)

출처: <https://www.anthropic.com/engineering/claude-code-best-practices> · <https://code.claude.com/docs/en/hooks> · <https://www-cdn.anthropic.com/58284b19e702b49db9302d5b6f135ad8871e7658.pdf>

## 5. 대규모 다중 팀 거버넌스

- **단일 진실 공급원: 도구 중립적 AGENTS.md** `[높음]` — 메르카리는 Cursor·Claude Code·Copilot·Codex의 룰을 따로 관리하다 동기화 부재로 규칙이 서서히 발산했고, 결국 복수형 `AGENTS.md` 표준을 단일 진실 공급원으로 채택했다. Claude Code도 AGENTS.md를 소비한다.
- **명시적 소유권 구조** `[높음]` — 설정·권한·플러그인·CLAUDE.md 관례를 책임지는 단일 DRI(Directly Responsible Individual), 엔지니어링·정보보안·거버넌스 대표가 모인 교차기능 워킹그룹의 조기 구성, 3~6개월 주기의 설정 리뷰.
- **공유 패키지 CODEOWNERS** `[보통]` — `packages/ui`, `packages/shared` 같은 고영향 패키지에 CODEOWNERS 엔트리를 두어 경로 기반으로 리뷰를 자동 라우팅한다. 의존성 추가 시 플랫폼 리뷰어 1명 이상을 요구한다.
- **AI 생성 PR에 맞춘 리뷰 재설계** `[보통]` — 더 커진 PR에 대응해 전용 보안 체크포인트를 추가하고, AI 취약점 패턴에 대해 리뷰어를 교육하며, 인간 리뷰 이전에 자동 게이트(CI의 SAST/SCA)를 둔다. "전통적인 라인별 diff 리뷰는 AI 코드 규모에서 지속 불가능하다"는 데 업계가 합의하고 있다.

## 6. ❌ 기각된 주장 (믿지 말 것)

- ❌ "거버넌스 없이 AI를 확장하면 PR 리뷰 시간 +441%, 버그 +54%, 인시던트 3배" (단일 벤더 블로그 출처)
- ❌ "AI는 전체 코드베이스 컨텍스트를 볼 때 더 좋은 코드를 내며, 레포 경계가 컨텍스트 벽이 된다"
- ❌ "모노레포면 AI가 크로스커팅 변경을 단일 패스로 처리한다(폴리레포는 며칠 걸린다)"
- ❌ "권장 스택은 workspaces + Turborepo + Changesets 고정 조합이다" (여러 선택지 중 하나일 뿐)

## 7. 실행 권고 (현재 상황 기준)

1. **AI를 이유로 레포 토폴로지를 바꾸지 마라.** 이미 폴리레포라면, AI 친화성만으로 모노레포 전환을 정당화할 근거는 기각되었다. 현재 구조 위에 CLAUDE.md/AGENTS.md 계층부터 깐다.
2. **레거시에 `apps/` + `packages/` 경계를 점진적으로 도입.** strangler fig 패턴으로 한 모듈씩 공개 API(`exports`/`index.ts`)로 격리하면서 떼어낸다.
3. **계층적 컨텍스트** — 루트는 아키텍처·표준, 하위는 로컬 관례 + 범위 한정 테스트 명령. 짧게 유지하고 나머지는 skills로 옮긴다.
4. **의존 경계를 lint로 못박는다** — `eslint-plugin-boundaries` 또는 Nx의 `enforce-module-boundaries` + `affected` CI.
5. **자기검증 루프 + Stop 훅**으로 결정론적 게이트(테스트·린트·빌드)를 구성한다.
6. **거버넌스** — 단일 DRI + 도구 중립 AGENTS.md를 단일 진실 공급원으로 + 공유 패키지 CODEOWNERS + AI 생성 PR용 보안 리뷰.

## 미해결 질문

- 개발자 20명 이상이 공유하는 단일 레거시 JS/TS 레포에서, 계층적 CLAUDE.md가 실제로 품질·속도를 얼마나 개선하는지에 대한 독립(비벤더) 정량 벤치마크가 없다.
- AGENTS.md와 CLAUDE.md가 모두 존재할 때의 우선순위·병합 동작에 대한 공식 권장이 불명확하다.
- 레거시를 strangler fig로 점진 리팩터링할 때 AI 에이전트를 안전하게 쓰는 구체적 레포 구조·시퀀스의 1차 사례 증거가 부족하다 — 가장 근거가 약한 영역.

---
---

# 2부. oh-my-claudecode (OMC) 분석 — 활용법 극대화

> **방법** 외부 관점(GitHub·공식문서·릴리스·커뮤니티) 웹 리서치 + **로컬 설치본(v4.9.0) 1차 검증**.
> **웹 검증 통계** 1차 소스 15건 → 주장 69개 → 검증 후 19개 확정 / 6개 기각.

## 한눈에 보기

OMC는 **여찬 허(Yeachan Heo, @Yeachan-Heo)** 가 만든 **MIT 라이선스 무료** 멀티 에이전트 오케스트레이션 레이어다. 핵심 철학은 **위임(delegation)** — *"당신은 지휘자이지 연주자가 아니다(conductor, not performer)."* 활용을 극대화하는 열쇠는 **"작업에 맞는 실행 모드를 고르는 것"** 이다. v4.x로 매우 활발하게 유지보수되며(약 3.4일에 1릴리스) GitHub 스타는 약 3만 6천 개. `[높음]`

> ⚠️ **마케팅 주의** — "토큰 30~50% 절감"은 자체 주장(벤치마크 없음)이며, **"3~5배 빠른 출시"는 검증에서 기각(0-3)** 되었다.

## 1. 정체 `[높음]`

- Claude Code를 멀티 에이전트 시스템으로 바꾸는 플러그인 레이어. 태그라인: *"Teams-first Multi-agent orchestration for Claude Code. Zero learning curve."*
- 저자 Yeachan-Heo, MIT, 무료. v4.x(최신 v4.14.6, 2026-06-09), 스타 약 3만 6천 개, 2026-01 생성 → 약 5개월 만에 매우 빠른 반복.
- 여기서 "성숙"은 연식이 아니라 **버전과 릴리스 빈도** 기준이다.
- ⚠️ 이름 혼동 주의: `zephyrpersonal/oh-my-claude-code`는 **별개의 작은 형제 프로젝트**다. 본 분석 대상(`Yeachan-Heo/oh-my-claudecode`)과 혼동하지 말 것.
- 출처: <https://github.com/Yeachan-Heo/oh-my-claudecode> · README · releases

## 2. 구성 요소 `[높음]` (로컬 v4.9.0으로 1차 확인)

- **에이전트: 정확히 19개** — 로컬 `agents/` 디렉토리에 `.md` 파일 19개로 확인. 티어 변형까지 포함하면 약 29개. ❌ 떠도는 "32 agents"설은 에이전트와 스킬을 혼동한 것으로 기각.
  - **빌드 & 분석**: explore, analyst, planner, architect, debugger, executor, verifier, code-simplifier
  - **리뷰**: security-reviewer, code-reviewer, critic
  - **도메인 전문**: document-specialist, test-engineer, designer, writer, qa-tester, scientist, git-master, tracer
- **스킬: 29개** — 로컬 `skills/` 디렉토리로 확인. (웹의 "약 38개"는 버전·집계 방식 차이)
- **모델 라우팅 — 로컬 에이전트 frontmatter로 직접 확인** `[높음]`:

  | 에이전트 | model (frontmatter 실제 값) | 티어 |
  |---|---|---|
  | explore | `claude-haiku-4-5` | LOW |
  | writer | `claude-haiku-4-5` | LOW |
  | executor | `claude-sonnet-4-6` | MEDIUM |
  | architect | `claude-opus-4-6` | HIGH (읽기 전용) |
  | code-reviewer | `claude-opus-4-6` | HIGH (읽기 전용) |

  즉 복잡도 → Haiku/Sonnet/Opus 매핑이 에이전트 정의에 하드코딩되어 있다. "30~50% 절감"은 자체 주장이며 검증되지 않았다.

## 3. 핵심: 실행 모드를 작업에 맞게 고르기 `[높음]`

| 모드 | 언제 쓰나 | 동작 |
|---|---|---|
| **Team** ⭐ | 권장 기본값 (v4.1.7~ 표준) | 파이프라인 `plan → PRD → exec → verify → fix(loop)` |
| **Autopilot** | 아이디어→완성 자율 실행 | 단일 리드가 엔드투엔드 자율 수행 |
| **Ralph** | "끝까지" 보장이 필요할 때 | verify/fix 루프 — 리뷰어/아키텍트가 PRD 기준으로 검증할 때까지 완료 선언 안 함 |
| **Ultrawork** | 최대 병렬화 (비-팀) | 병렬 가능 작업과 의존 작업을 분류 → 독립 작업을 동시 발사 |
| **UltraQA** | 품질 게이트 반복 | tests/build/lint/typecheck가 통과할 때까지 QA 사이클 |
| **Deep Interview** | 요구사항이 모호할 때 | 소크라테스식 문답으로 요구 명료화 |
| **/ccg** | 다관점 자문 | Codex + Gemini 조언을 Claude가 종합 |

- **Ultrawork 원리** `[높음]`: *"독립 작업은 절대 직렬화하지 않고, 모든 독립 agent 호출을 동시에 발사한다."* 각 작업을 적절한 티어로 라우팅한다. ⚠️ 단, 티어 선택은 완전 자동이 아니라 오케스트레이터가 model 파라미터를 명시적으로 넘겨 적용한다.
- **실전 흐름 권장** — 모호한 신규 작업: `Deep Interview`로 요구 정리 → `Team`(복잡·자율이면 `Autopilot`) → 품질 게이트는 `UltraQA`/`Ralph`로 "검증된 완료"를 강제 → 다관점이 필요하면 `/ccg`.

## 4. ✅ 설치·요구사항 (로컬 1차 검증으로 미해결 해소)

웹 리서치가 확인하지 못했거나 기각했던 항목을, 설치본의 `package.json`·`.mcp.json`·`README.ko.md`로 확정했다.

- **플러그인 설치** (권장):
  ```
  /plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
  /plugin install oh-my-claudecode
  ```
- **CLI 설치** (npm): `npm install -g oh-my-claude-sisyphus`
  - ⭐ **중요 정정** — 웹 딥리서치는 "npm `oh-my-claude-sisyphus`로 배포"를 **기각(0-3)** 했으나, 로컬 설치본의 실제 `package.json`에 `"name": "oh-my-claude-sisyphus"`가 있고 README.ko도 이를 명시하므로 **사실**이다. 브랜드명(oh-my-claudecode)과 npm 패키지명(oh-my-claude-sisyphus)이 다를 뿐이다. 설명에는 *"Inspired by oh-my-opencode"* 라고 적혀 있다.
- **요구사항**: **Node.js 20.0.0 이상** (`engines.node`).
- **MCP**: 단일 서버 `t` → `node ${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs`. LSP·AST·state·notepad·project-memory 등 OMC의 모든 도구를 이 서버 하나가 제공한다.
- **핵심 의존성**: `@anthropic-ai/claude-agent-sdk`, `@ast-grep/napi`(AST), `better-sqlite3`(**상태를 SQLite로 저장**), `@modelcontextprotocol/sdk`, `zod`, `safe-regex`, `vscode-languageserver-protocol`(LSP).
- **/ccg 요구사항**: `codex` / `gemini` CLI 설치 + 활성 tmux 세션. 워커는 요청 시 생성되고 작업 완료 후 종료되어 유휴 리소스를 남기지 않는다. 권장 비용은 Claude + Gemini + ChatGPT Pro 3종으로 월 약 $60.
- **업데이트**: `/plugin marketplace update omc` → `/omc-setup`. 문제가 생기면 이전 플러그인 캐시를 정리한다.

## 5. ✅ 훅 구조 & 실패 모드 (로컬 hooks.json·스크립트로 1차 검증)

OMC는 `hooks/hooks.json`에서 **11개 훅 이벤트**에 노드 스크립트를 연결한다.

| 훅 이벤트 | 스크립트 | 역할 |
|---|---|---|
| UserPromptSubmit | keyword-detector, skill-injector | 키워드 감지 → 스킬 자동 주입 |
| SessionStart | session-start, project-memory-session | 세션 복원·메모리 로드 |
| PreToolUse | pre-tool-enforcer | 도구 사용 전 정책 강제 |
| PermissionRequest(Bash) | permission-handler | Bash 권한 처리 |
| PostToolUse | post-tool-verifier, project-memory-posttool | 결과 검증·메모리 기록 |
| PostToolUseFailure | post-tool-use-failure | 실패 복구 안내 |
| SubagentStart/Stop | subagent-tracker, verify-deliverables | 서브에이전트 추적·산출물 검증 |
| PreCompact | pre-compact, project-memory-precompact | 컨텍스트 압축 전 상태 보존 |
| **Stop** | **context-guard-stop, persistent-mode, code-simplifier** | 턴 종료 가드·지속 루프·자동 정리 |
| SessionEnd | session-end | 세션 정리 |

**실패 모드 / 무한 루프 방지 — 로컬 코드로 확인** `[높음]`:

- **Ralph (persistent-mode.cjs)**: `maxIterations` 기본값 **100** (`stateData.max_iterations || stateData.max_reinforcements || 100`). 지속 모드는 최대 100회로 바운드된다.
- **context-guard-stop.mjs**: 주석에 *"Max 2 blocks per transcript (retry guard prevents infinite loops)"*, *"Prevents infinite block loops by capping at MAX_BLOCKS"* — 턴 종료 차단은 트랜스크립트당 최대 2회로 제한된다.
- **팀 디스패치 쿨다운**: 전달이 성공했을 때만 쿨다운을 스탬프해 스팸·중복을 방지한다.
- **세션 정리**: 고아(orphan) 백그라운드 프로세스(bridge/MCP 자식 프로세스)를 정리하는 로직이 있다(v4.9.0 CHANGELOG: "clean up orphaned bridge and MCP child processes").

**실무 주의점:**

- UserPromptSubmit·PreToolUse·PostToolUse마다 노드 스크립트가 실행되므로 매 상호작용에 약간의 오버헤드가 있다(타임아웃 3~5초로 제한).
- 키워드 감지가 의도치 않게 스킬을 발동할 수 있다 → v4.9.0에서 "정보성 쿼리는 건너뛰기"로 오발동을 완화했다.
- 고병렬 Team/Ultrawork 실행 시 다수의 서브에이전트가 토큰·리소스를 급증시킬 수 있다(정량 데이터는 OMC 자체로는 수집되지 않음).

## 6. 경쟁 도구 비교 `[높음]`

- **SuperClaude_Plugin** — `/sc:` 슬래시 명령 29개, 전문 에이전트 23개, 7개 행동 모드(Deep Research, Orchestration, Token-Efficiency 등). <https://github.com/SuperClaude-Org/SuperClaude_Plugin>
- **ruflo (구 claude-flow)** — 에이전트 100개 이상, swarm 토폴로지(hierarchical/mesh/adaptive), 27개 훅 시스템, AgentDB 벡터 메모리, MCP 도구 약 210개, 스타 약 3만 1천 개. ⚠️ 비판: 에이전트 8개 이상이면 RAM 3~4GB, alpha 상태, 비결정적. <https://github.com/ruvnet/ruflo>
- 단, 이 비교는 **기능 개수** 수준이다. 동일 작업에 대한 실증적 효과·신뢰성·비용 비교는 확립되지 않았다.

## 7. ❌ 기각된 주장 (웹 리서치 검증)

- ❌ "에이전트 32개 + 스킬 40개+, 제로 컨피그" (0-3, 마케팅 사이트)
- ❌ "3~5배 빠른 출시 + 토큰 30~50% 절감"(독립 효능 주장, 0-3) — 30~50%는 자체 주장으로만 존재한다.
- ❌ "실행 모드 정확히 10개" (1-2, 버전마다 다름)
- ⚠️ **웹은 기각했으나 로컬에서 사실로 정정된 항목**:
  - "npm `oh-my-claude-sisyphus`로 배포" → 웹은 0-3으로 기각했으나 **로컬 package.json으로 사실 확인** (위 4번 참조)

## 8. 활용 극대화 체크리스트 (종합)

1. **모드 선택이 9할이다** — 기본은 `Team`. 자율 끝장은 `Autopilot`, 검증된 완료 강제는 `Ralph`/`UltraQA`, 순수 병렬 속도는 `Ultrawork`, 요구 정리는 `Deep Interview`, 교차검증은 `/ccg`.
2. **모델 라우팅은 신뢰하되 강제는 명시적으로** — 단순=Haiku, 표준=Sonnet, 복잡/리뷰=Opus. Ultrawork에서는 model 파라미터를 명시적으로 넘긴다.
3. **상태·메모리를 적극 활용** — SQLite 기반 state + project-memory + notepad가 세션 간 컨텍스트를 보존한다(PreCompact/SessionStart 훅으로 복원).
4. **루프는 이미 바운드돼 있다** — Ralph 100회, context-guard 2-block 한계. 무한 루프 걱정보다 토큰 비용을 모니터링하라.
5. **/ccg를 쓰려면 codex/gemini CLI + tmux를 미리 준비**한다.
6. **업데이트 후 이상이 생기면 플러그인 캐시를 정리하고 `/omc-setup`을 다시 실행**한다.

## 미해결 질문 (여전히 1차 증거 부족)

- "토큰 30~50% 절감"의 재현 가능한 벤치마크 — 없음(자체 주장).
- OMC vs SuperClaude vs ruflo의 실증 head-to-head(효과·신뢰성·비용) — 미확립.
- 고병렬 시 실제 RAM/토큰 footprint 정량치 — OMC 자체 데이터 없음(경쟁 ruflo만 보고됨).

---

## 출처 신뢰도 요약

- **1부** — 핵심 발견은 Anthropic 1차 공식문서·내부 사례 PDF와 메르카리/Nx/Turborepo/Node.js/pnpm 1차 출처로 뒷받침된다. 거버넌스 일부(CODEOWNERS, AI-PR 리뷰)는 커뮤니티·2차 출처라 신뢰도 `[보통]`.
- **2부** — 정체·카탈로그·모드·라우팅·버전은 GitHub 1차 출처. **설치 요구사항·훅·실패 모드·라우팅 실제 값은 로컬 설치본(v4.9.0)으로 직접 1차 검증**했고, 웹의 "oh-my-claude-sisyphus 기각"을 사실로 정정했다. 효능 수치는 마케팅으로 분류했다.
- 버전·개수는 OMC가 약 3.4일마다 릴리스되어 빠르게 낡으므로 시점에 주의할 것(2026-06-09 기준).
