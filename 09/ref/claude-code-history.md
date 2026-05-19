# Claude Code 변천사

> 2025년 2월 리서치 프리뷰부터 2026년 5월 현재까지  
> 출처: github.com/anthropics/claude-code · code.claude.com/docs · anthropic.com/news

---

## 개요

Claude Code는 Anthropic이 2025년 2월에 리서치 프리뷰로 공개한 터미널 기반 에이전트 코딩 도구다. 단순한 챗봇이 아니라 실제 파일 시스템과 명령줄 위에서 자율적으로 동작하는 'AI 에이전트'라는 새로운 카테고리를 사실상 표준화했고, OpenAI의 Codex CLI, 구글의 Gemini CLI 같은 후속 도구들이 이 아키텍처를 따라 만들어졌다.

출시 첫 해인 2025년에만 약 176개의 업데이트가 배포되며 극도로 빠른 속도로 진화했고, 출시 9개월 만에 연환산 매출 10억 달러를 돌파했다.

---

## 목차

1. [출시와 초기 컨셉](#1-출시와-초기-컨셉-202502--202504)
2. [정식 출시(GA)와 Claude 4 시대](#2-정식-출시ga와-claude-4-시대-202505--202507)
3. [MCP 본격화와 Plan Mode](#3-mcp-본격화와-plan-mode-202506--202508)
4. [v2.0과 VS Code 통합, Checkpoint](#4-v20과-vs-code-통합-checkpoint-202509)
5. [Web 출시와 Skills 등장](#5-web-출시와-skills-등장-202510)
6. [Plugins, Opus 4.5, 그리고 바이럴](#6-plugins-opus-45-그리고-바이럴-202511--202512)
7. [Opus 4.6과 Subagent 시스템](#7-opus-46과-subagent-시스템-성숙-202601--202602)
8. [Skills·Commands 통합과 Opus 4.7](#8-skillscommands-통합과-opus-47-202603--현재)
9. [핵심 기능 계보 — MCP와 컨텍스트 관리](#9-핵심-기능-계보--mcp와-컨텍스트-관리)
10. [주요 연표](#10-주요-연표)

---

## 1. 출시와 초기 컨셉 (2025.02 — 2025.04)

Claude Code는 **2025년 2월 24일** 리서치 프리뷰로 처음 공개되었다. 별다른 화려한 발표 이벤트도, 바이럴 데모도 없었다. 당시 대중의 관심은 ChatGPT와 챗봇 비교에 쏠려 있었지만, 개발자들은 이내 알아챘다. Claude Code는 단순히 질문에 답하는 도구가 아니라, 코드베이스를 직접 읽고 파일을 편집하고 터미널 명령을 실행하면서 작업을 자율적으로 수행하는 **'행동하는 AI'**였다.

초기 기능 셋은 매우 단순했다. 자연어 대화로 작업을 지시하면, Claude가 파일을 읽고 편집하며 bash 명령을 실행하고 git 커밋을 만들었다. 모델은 **Claude 3.7 Sonnet**이었다.

Anthropic이 이 시점에 이미 깔아둔 결정적 포석이 하나 있었다. **2024년 11월에 공개한 Model Context Protocol(MCP)**이다. MCP는 AI 에이전트가 외부 도구·데이터와 표준화된 방식으로 연결되도록 하는 오픈 프로토콜로, 이후 Claude Code의 확장성을 떠받치는 기반이 된다.

- **2025년 4월**: OpenAI Codex CLI 출시 — 터미널 에이전트 카테고리에 합류
- **2025년 6월**: 구글 Gemini CLI 출시

### CLAUDE.md의 발견

초기 Claude Code의 가장 큰 발견은 **CLAUDE.md**였다. 프로젝트 루트에 두는 평범한 마크다운 파일 하나가 에이전트의 시스템 프롬프트로 자동 주입되어, 코딩 컨벤션·금지 사항·도메인 용어를 매 세션마다 일관되게 유지시켜주는 이 발상은 이후 모든 경쟁 도구가 따라 만든 표준 패턴이 되었다.

---

## 2. 정식 출시(GA)와 Claude 4 시대 (2025.05 — 2025.07)

**2025년 5월**, Claude 4(Opus 4와 Sonnet 4) 발표와 함께 Claude Code도 리서치 프리뷰를 졸업하고 정식 출시(GA, General Availability)되었다. Claude 4 모델은 코드 작성 능력에서 큰 도약을 이뤘고, 이때부터 Claude Code의 신뢰성이 본격적으로 인정받기 시작한다. 7월에는 출시 이후 매출이 **5.5배** 증가했다고 발표했다.

### 이 시기 주요 기능

| 기능 | 설명 |
|------|------|
| **Hooks** | 세션의 특정 이벤트(PreToolUse, PostToolUse, Stop 등)에 자동으로 스크립트를 끼워 넣는 확장 메커니즘. 자동 테스트, 린트 실행, 변경 사항 기록을 결정론적으로 처리 |
| **Output Styles** | 응답 톤을 바꾸는 기능. Default 외에 Explanatory(설명형), Learning(학습형) 등 교육용 스타일 추가 |
| **SlashCommand 도구** | Claude가 사용자의 슬래시 명령을 스스로 호출 가능 (이전까지는 사용자만 호출 가능) |
| **OAuth 인증 개선** | Pro/Max 구독자가 API 키 없이도 클로드 계정으로 바로 사용 가능 |

### 1M 컨텍스트 베타

**2025년 8월 7일**, 1M 토큰 컨텍스트 윈도우가 Claude Sonnet 4에 베타로 추가되었다. 기본 200K였던 컨텍스트 한계가 5배로 늘어나면서 대규모 코드베이스 작업이 한층 수월해졌다. (이후 Sonnet 4.5에서도 지원, 2026년 4월 30일자로 종료 예고)

또한 **8월에는 Anthropic이 OpenAI의 Claude API 접근을 차단**하는 사건이 있었다 — OpenAI 직원들이 Claude Code를 자사 제품에 우회 사용한 것이 발각된 결과였다.

---

## 3. MCP 본격화와 Plan Mode (2025.06 — 2025.08)

이 시기의 키워드는 **'MCP의 본격화'**와 **'계획 단계의 분리'**다.

### MCP 생태계 확장

사용자는 `.mcp.json` 파일이나 claude.ai 커넥터 설정으로 GitHub, Linear, Slack, Notion, Sentry 등 외부 서비스의 도구를 Claude Code에 연결할 수 있게 되었다.

- MCP 서버: **stdio, HTTP, SSE** 세 가지 전송 방식 지원
- OAuth 인증 흐름 표준화
- "Claude Code의 진정한 가치는 모델 자체가 아니라 MCP 생태계"라는 말이 나온 시기

### Plan Mode 도입

Plan Mode는 Claude가 곧바로 코드 수정에 들어가지 않고 먼저 작업 계획을 세워 사용자에게 보여주는 모드다.

- **Shift+Tab 두 번** 으로 진입
- 사용자가 계획을 검토·승인한 뒤에야 실제 변경 시작
- 계획은 `~/.claude/plans/`에 저장 → 컨텍스트 압축이나 세션 재시작 후에도 유지

### 그 외 주요 변화

- **SubAgents 초기 형태**: 부모 에이전트가 무거운 탐색 작업을 자식 에이전트에 위임할 수 있는 Task 도구 도입
- **Headless 모드** (`-p`, `--print`): CI 파이프라인에서 비대화형 호출 표준
- **커스텀 슬래시 명령**: `.claude/commands/*.md`에 마크다운 파일을 두면 `/slash` 명령으로 호출 가능

---

## 4. v2.0과 VS Code 통합, Checkpoint (2025.09)

**2025년 9월 말**, Claude Code 2.0이 발표되었다. 출시 7개월 만의 메이저 버전업으로, 단순한 CLI 도구를 넘어 **'IDE와 통합되는 개발 플랫폼'**으로 정체성을 확장한 분기점이었다.

### VS Code Extension 정식 출시

VS Code(및 Cursor, Windsurf 포함) 익스텐션이 정식 출시되었다.

- 사이드바 패널에서 실시간 코드 변경 확인
- 인라인 diff 뷰로 수정 내용 검토
- 터미널과 IDE 사이를 자연스럽게 오갈 수 있음

### Checkpoint 시스템 도입

프롬프트를 보낼 때마다 자동으로 체크포인트가 생성되어 **30일간 보존**되는 시스템이 도입되었다.

- **Esc 두 번** 또는 `/rewind` 명령으로 원하는 시점 복구
- 이전의 `/undo` 명령이 `/rewind`와 동의어로 통합

### 30시간 자율 작업의 시대

v2.0 발표 자료에서 강조된 것 중 하나는 **'30시간 연속 자율 작업'** 시연이었다. Plan Mode, Checkpoint, Hooks, MCP, Subagents가 결합되면서 진짜 에이전트에 한 발 더 가까워졌다. 개발자들은 이 흐름을 **'Long Running'**과 **'Swarm'**이라는 두 키워드로 정리했다.

**추가 변화**
- `Ctrl+R`로 과거 프롬프트 검색
- `/usage` 명령으로 5시간/주간 사용량 확인

---

## 5. Web 출시와 Skills 등장 (2025.10)

### Claude Code on the Web (10월 20일)

**2025년 10월 20일**, Claude Code가 웹 브라우저에서도 실행되도록 확장되었다.

- 브라우저에서 코드베이스를 연결해 병렬 세션으로 여러 작업 동시 진행
- **iOS 앱**도 함께 공개 — 모바일에서 작업 진행 상황 모니터링 및 간단한 지시 가능
- "내 컴퓨터에서 도는 도구" → "클라우드에서 비동기로 일하는 동료"로 진화한 순간

### Agent Skills 정식 출시 (10월 2일)

**2025년 10월 2일**, Agent Skills(베타 헤더 `skills-2025-10-02`)가 공식 출시되었다.

**Skill의 구조**: `SKILL.md` 파일 하나 + 보조 파일들(템플릿, 스크립트, 참고 자료)로 구성된 폴더

**Skills vs 슬래시 명령의 차이**:

| | 슬래시 명령 | Skills |
|---|---|---|
| 호출 방식 | 사용자가 `/command` 명시 입력 | frontmatter의 description을 보고 Claude가 자동 호출 |
| 활용 | 명시적 작업 | 도메인 지식 일관 적용 |

**Skills 저장 위치**:
- `~/.claude/skills/` — 글로벌
- `.claude/skills/` — 프로젝트 전용
- 플러그인 안에 번들된 스킬

Anthropic은 `docx`, `pptx`, `xlsx`, `pdf`, `frontend-design` 같은 **빌트인 스킬**도 함께 배포했다.

---

## 6. Plugins, Opus 4.5, 그리고 바이럴 (2025.11 — 2025.12)

### Plugins 시스템 공개

**2025년 11월경**, Claude Code Plugins를 공식 발표했다. 플러그인은 슬래시 명령, 서브에이전트, 스킬, MCP 서버, 훅을 **한 묶음으로 패키징**해 배포·공유할 수 있는 메커니즘이다.

```bash
claude plugin install <...>
claude plugin marketplace add <...>
```

엔터프라이즈 정책 지원: `blockedMarketplaces`, `strictKnownMarketplaces`

### Opus 4.5 — 결정적 도약

Claude Opus 4.5의 출시는 코드 작성·디버깅 능력을 '쓸 만한 정도'에서 **'경쟁 도구 대비 명백히 앞선'** 단계로 끌어올렸다.

- **2025년 11월**: 연환산 매출 **10억 달러** 돌파
- **2026년 1월**: 20억 달러에 근접 추산

### "Vibe Coding" 바이럴

2025년 말~2026년 초 겨울 휴가 시즌, 프로그래밍 비전공자들이 **'vibe coding'(분위기 코딩)**이라는 표현을 쓰며 Claude Code로 게임, 웹사이트, 자동화 도구를 만드는 시도가 X(트위터)와 유튜브에서 폭증했다. Claude Code는 더 이상 시니어 개발자의 보조 도구가 아니라 **'누구나 자기 아이디어를 코드로 만드는 도구'**로 인식되기 시작했다.

### Auto Mode와 권한 시스템

- **Auto Mode** 도입: 안전한 도구 호출은 자동 승인, 위험한 호출만 사용자에게 확인
- `--dangerously-skip-permissions` 플래그 표준화
- `/context` 명령으로 현재 컨텍스트 사용량과 분포 시각화

---

## 7. Opus 4.6과 Subagent 시스템 성숙 (2026.01 — 2026.02)

### Opus 4.6과 Sonnet 4.6

2026년 초 Opus 4.6과 Sonnet 4.6이 출시되었다.

- Pro/Max 구독자의 기본 effort 수준: `medium` → `high` 자동 상향
- 최대 출력 토큰 한도: **128K**까지 확장

### Subagent 시스템의 완성

Subagent 시스템은 출시 초기부터 Task 도구 형태로 존재했지만, 2026년 초에 들어서야 본격적으로 다듬어졌다.

**동작 방식**: 부모 에이전트가 큰 작업을 자식 에이전트에 위임 → 자식은 자기만의 컨텍스트 윈도우와 권한 모드, MCP 도구를 갖고 독립적으로 작업 수행 → 결과 요약만 부모에게 반환

- **컨텍스트 오염 방지**: 중간 사고 과정과 도구 호출 결과가 부모 컨텍스트로 새지 않음
- `TodoWrite` deprecated → `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`로 대체
- `isolation: 'worktree'` 옵션으로 자식 에이전트를 git worktree 안에 격리 실행
- **Agent Teams**: 다중 에이전트 협업 패턴 등장

### Claude Code Security

**2026년 2월**, Claude Code Security 발표 — 코드베이스를 자동 분석해 보안 취약점을 찾아주는 기능.

이어 **3월**에는 Claude Code CLI의 소스 코드가 유출되면서, 미공개 상태였던 여러 기능과 모델(예: `autoDream`으로 알려진 메모리 통합 기능)이 외부에 드러났다.

### Channels, Voice Mode, Remote Control

- **Remote Control**: 휴대폰이나 웹에서 Claude Code 세션 모니터링 및 지시
- **Voice Mode**: 음성으로 코드 작업 지시
- **Channels**: 도구 승인 요청을 휴대폰으로 수신

---

## 8. Skills·Commands 통합과 Opus 4.7 (2026.03 — 현재)

### Skills와 Commands의 통합

오랫동안 별개의 개념으로 존재하던 두 시스템이 통합되었다.

- `.claude/commands/*.md` (슬래시 명령)
- `.claude/skills/*/SKILL.md` (스킬)

두 위치 모두 동일한 `/slash-command` 인터페이스를 생성하고, 스킬은 commands의 상위 호환이 되어 보조 파일·자동 호출·동적 컨텍스트 주입 같은 추가 기능을 제공한다. 기존 commands 디렉터리는 그대로 동작하며, 마이그레이션은 점진적으로 진행된다.

### Native Binary CLI 전환

버전 **2.1.113**부터 Claude Code CLI는 번들된 자바스크립트가 아니라 **플랫폼별 네이티브 바이너리**로 실행되도록 바뀌었다.

- Node.js 의존성과 npm 패키지 시작 시간 문제 해결
- 시작 속도 향상, 메모리 사용량 감소
- macOS/Linux: Glob과 Grep이 임베드된 **bfs/ugrep**으로 대체

### Opus 4.7과 xhigh Effort

버전 **2.1.111**에서 Claude Opus 4.7이 출시되었다.

- 새로운 effort 레벨 **`xhigh`** 추가: `low / medium / high / xhigh / max`
- Opus 4.7 컨텍스트 윈도우: **네이티브 1M**으로 확장
- `auto mode`가 모든 사용자에게 기본 활성화 (`--enable-auto-mode` 플래그 불필요)

### Agent View, /goal, Dreaming

| 기능 | 설명 |
|------|------|
| **Agent View** | `claude agents` 명령으로 실행 중·차단·완료된 모든 Claude Code 세션을 한 화면에서 관리 (리서치 프리뷰) |
| **/goal** | 완료 조건을 지정해두면 Claude가 조건이 충족될 때까지 여러 턴에 걸쳐 계속 작업. Long Running 작업의 첫 번째 정식 구현 |
| **Dreaming** | Managed Agents API에 추가된 메모리 통합 기능 (리서치 프리뷰). 에이전트의 영속 메모리를 세션 사이에 통합해 중복 제거. 3월 소스 코드 유출 당시 'autoDream'으로 알려졌던 기능 |

---

## 9. 핵심 기능 계보 — MCP와 컨텍스트 관리

### MCP(Model Context Protocol)의 진화

MCP는 Claude Code의 가장 결정적인 차별화 요소다. Anthropic이 **'에이전트의 USB-C'**라고 비유했다.

| 시기 | 변화 |
|------|------|
| 2024년 11월 | MCP 사양과 첫 SDK 공개 |
| 2025년 봄 | Claude Code에서 stdio MCP 서버 지원. `.mcp.json` 설정 표준화 |
| 2025년 여름 | HTTP/SSE 전송 지원, OAuth 인증 흐름 정착. GitHub, Linear, Notion, Slack 등 주요 서비스 커넥터 공개 |
| 2025년 가을 | claude.ai 커넥터 통합. 클로드 웹 계정에 연결한 서비스를 Claude Code에서 그대로 활용 |
| 2026년 초 | `alwaysLoad` 옵션으로 도구 검색 지연 우회, `_meta annotation`으로 대용량 결과 처리 제어 |

### 컨텍스트 관리의 진화

| 기능 | 시기 | 설명 |
|------|------|------|
| **CLAUDE.md** | 출시 시점 | 세션 시작 시 자동 주입되는 시스템 프롬프트. 글로벌과 프로젝트 단위 계층 구조 |
| **/compact** | 2025년 초 | 대화를 요약본으로 압축. Preserve 지시로 보존 항목 명시 가능 |
| **/clear, /rewind** | 2025년 9월 v2.0 | 컨텍스트 완전 초기화와 체크포인트 되감기 |
| **auto-compact** | 2025년 가을 | 컨텍스트 사용량 ~80% 후반대에서 자동 발동. 단, 'Document & Clear' 패턴이 커뮤니티 모범 사례로 정착 |
| **/context** | 2025년 말 | 현재 컨텍스트의 항목별 토큰 사용량 시각화 |
| **Subagent 격리** | 2026년 초 | 자식 에이전트의 중간 사고 과정이 부모 컨텍스트로 새지 않음 |
| **Opus 4.7 네이티브 1M** | 2026년 4월 | 200K의 5배, 베타가 아닌 정식 1M |

---

## 10. 주요 연표

| 날짜 | 사건 |
|------|------|
| **2024.11** | MCP(Model Context Protocol) 공개 |
| **2025.02.24** | Claude Code 리서치 프리뷰 출시 |
| **2025.04** | OpenAI Codex CLI 출시 |
| **2025.05** | Claude 4와 함께 정식 출시(GA) |
| **2025.06** | 구글 Gemini CLI 출시 |
| **2025.06–07** | Hooks, Output Styles, SlashCommand 도구 |
| **2025.08.07** | Sonnet 4에 1M 컨텍스트 베타 |
| **2025.09.30** | Claude Code v2.0 — VS Code, Checkpoints |
| **2025.10.02** | Agent Skills 정식 출시 |
| **2025.10.20** | Claude Code on Web + iOS 앱 |
| **2025.11** | Plugins, Opus 4.5. 연환산 매출 10억 달러 |
| **2025.12–2026.01** | "Vibe Coding" 바이럴 |
| **2026.01–02** | Opus 4.6, Subagent/Task 시스템 성숙 |
| **2026.02** | Claude Code Security |
| **2026.03** | 소스 코드 유출 사건 |
| **2026.03–04** | Skills와 Commands 통합 |
| **2026.04** | Opus 4.7, Native CLI, Agent View, /goal |
| **2026.05** | Dreaming (메모리 통합) 리서치 프리뷰 |

---

## 마무리

Claude Code의 15개월은 단순히 한 도구의 기능 추가 역사가 아니다. AI가 **'대답하는 존재'에서 '행동하는 존재'로** 카테고리를 옮겨가는 과정에서 가장 앞서 길을 낸 사례다.

CLAUDE.md, MCP, Hooks, Skills, Subagents, Plan Mode, Checkpoints — 이 기능들 하나하나는 이후 Cursor, Codex CLI, Gemini CLI 같은 모든 경쟁 도구의 청사진이 되었다.

2025년이 '터미널 에이전트라는 카테고리의 탄생'이었다면, 2026년의 화두는 **'Long Running'**과 **'Swarm'**으로 모이는 듯하다. 이미 `/goal` 명령과 Agent Teams로 실체를 드러내기 시작했다.

---

> 참고 자료: github.com/anthropics/claude-code (CHANGELOG.md) · code.claude.com/docs/changelog · platform.claude.com/docs/release-notes · anthropic.com/news · 위키백과 한국어/영어판
