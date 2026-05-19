# Claude Code 변천사

> 2025년 2월 리서치 프리뷰부터 2026년 5월 현재까지

**출처:** github.com/anthropics/claude-code · code.claude.com/docs · anthropic.com/news · 위키백과 한국어/영어판

---

## 개요

Claude Code는 Anthropic이 2025년 2월에 리서치 프리뷰로 공개한 터미널 기반 에이전트 코딩 도구다. 단순한 챗봇이 아니라 실제 파일 시스템과 명령줄 위에서 자율적으로 동작하는 'AI 에이전트'라는 새로운 카테고리를 사실상 표준화했고, OpenAI의 Codex CLI, 구글의 Gemini CLI 같은 후속 도구들이 이 아키텍처를 따라 만들어졌다.

출시 첫 해인 2025년에만 약 176개의 업데이트가 배포되며 극도로 빠른 속도로 진화했고, 출시 9개월 만에 연환산 매출 10억 달러를 돌파했다. 이 문서는 출시부터 2026년 5월 현재까지 약 15개월 동안의 주요 변화를 1차 자료 기반으로 정리한 자료다.

---

## 목차

1. [출시와 초기 컨셉](#1-출시와-초기-컨셉) — 2025.02 ~ 2025.04
2. [정식 출시(GA)와 Claude 4 시대](#2-정식-출시ga와-claude-4-시대) — 2025.05 ~ 2025.07
3. [MCP 본격화와 Plan Mode](#3-mcp-본격화와-plan-mode) — 2025.06 ~ 2025.08
4. [v2.0과 VS Code 통합, Checkpoint](#4-v20과-vs-code-통합-checkpoint) — 2025.09
5. [Web 출시와 Skills 등장](#5-web-출시와-skills-등장) — 2025.10
6. [Plugins, Opus 4.5, 그리고 바이럴](#6-plugins-opus-45-그리고-바이럴) — 2025.11 ~ 2025.12
7. [Opus 4.6과 Subagent 시스템 성숙](#7-opus-46과-subagent-시스템-성숙) — 2026.01 ~ 2026.02
8. [Skills·Commands 통합과 Opus 4.7](#8-skillscommands-통합과-opus-47) — 2026.03 ~ 현재
9. [핵심 기능 계보 — MCP와 컨텍스트 관리](#9-핵심-기능-계보--mcp와-컨텍스트-관리)
10. [주요 연표와 마무리](#10-주요-연표와-마무리)

---

## 1. 출시와 초기 컨셉

**2025년 2월 — 4월**

Claude Code는 2025년 2월 24일 리서치 프리뷰로 처음 공개되었다. 별다른 화려한 발표 이벤트도, 바이럴 데모도 없었다. 당시 대중의 관심은 ChatGPT와 챗봇 비교에 쏠려 있었고, 깜빡이는 커서가 전부인 터미널 도구는 일반 사용자에게 매력적인 형태가 아니었다. 그러나 개발자들은 이내 알아챘다. Claude Code는 단순히 질문에 답하는 도구가 아니라, 코드베이스를 직접 읽고 파일을 편집하고 터미널 명령을 실행하면서 작업을 자율적으로 수행하는 '행동하는 AI'였다.

초기 Claude Code의 기능 셋은 매우 단순했다. 자연어 대화로 Claude에게 작업을 지시하면, Claude가 파일을 읽고 편집하며 bash 명령을 실행하고 git 커밋을 만들었다. 모델은 Claude 3.7 Sonnet이었다. 인상적인 시연을 보여주기에는 충분했지만, 복잡한 작업에서는 종종 실수했고 열렬한 얼리어답터들조차 '잠재력은 크지만 아직 프로덕션급은 아니다'라고 평가했다.

Anthropic이 이 시점에 이미 깔아둔 결정적 포석이 하나 있었다. 2024년 11월에 공개한 Model Context Protocol(MCP)이다. MCP는 AI 에이전트가 외부 도구·데이터와 표준화된 방식으로 연결되도록 하는 오픈 프로토콜로, 이후 Claude Code의 확장성을 떠받치는 기반이 된다. Claude Code 출시 두 달 뒤인 4월에는 OpenAI가 Codex CLI를 발표하며 터미널 에이전트 카테고리에 합류했고, 같은 해 6월에는 구글의 Gemini CLI도 같은 길을 따랐다.

### CLAUDE.md의 발견

초기 Claude Code의 가장 큰 발견은 'CLAUDE.md'였다. 프로젝트 루트에 두는 평범한 마크다운 파일 하나가 에이전트의 시스템 프롬프트로 자동 주입되어, 코딩 컨벤션·금지 사항·도메인 용어를 매 세션마다 일관되게 유지시켜준다는 발상이 이후 모든 경쟁 도구가 따라 만든 표준 패턴이 되었다.

---

## 2. 정식 출시(GA)와 Claude 4 시대

**2025년 5월 — 7월**

2025년 5월, Claude 4(Opus 4와 Sonnet 4) 발표와 함께 Claude Code도 리서치 프리뷰를 졸업하고 정식 출시(GA, General Availability)되었다. Claude 4 모델은 코드 작성 능력에서 큰 도약을 이뤘고, 이때부터 Claude Code의 신뢰성이 본격적으로 인정받기 시작한다. Anthropic은 이 시기에 Claude Code 매출이 폭증했다고 발표했고, 7월에는 출시 이후 매출이 5.5배 증가했다고 밝혔다.

### 이 시기 주요 기능 변화

- **Hooks** — 세션의 특정 이벤트(PreToolUse, PostToolUse, Stop 등)에 자동으로 스크립트를 끼워 넣을 수 있는 확장 메커니즘. 커뮤니티 PR #712를 통해 요구된 기능으로, 자동 테스트, 린트 실행, 변경 사항 기록 같은 작업을 결정론적으로 처리할 수 있게 했다.
- **Output Styles** — 응답 톤을 바꾸는 기능. 기본 'Default' 외에 'Explanatory'(설명형)와 'Learning'(학습형) 같은 교육용 스타일이 추가되었다.
- **SlashCommand 도구** — Claude가 사용자의 슬래시 명령을 스스로 호출할 수 있게 되었다. 이전까지 슬래시 명령은 사용자만 호출할 수 있었다.
- **OAuth 인증 개선** — Pro/Max 구독자가 API 키 없이도 클로드 계정으로 바로 사용할 수 있게 되어 진입 장벽이 크게 낮아졌다.

### 1M 컨텍스트 베타

동시에 1M 토큰 컨텍스트 윈도우가 Claude Sonnet 4에 베타로 추가되었다(2025년 8월 7일). 기본 200K였던 컨텍스트 한계가 5배로 늘어나면서 대규모 코드베이스 작업이 한층 수월해졌다. 이 1M 컨텍스트 베타는 이후 Sonnet 4.5에서도 지원되었으나, 2026년 4월 30일자로 종료가 예고되었다.

또한 이 시기 Bedrock·Vertex 같은 클라우드 모델 게이트웨이 지원이 본격적으로 다듬어지며 기업 도입이 가속화되었다. 8월에는 Anthropic이 OpenAI의 Claude API 접근을 차단하는 사건도 있었는데, 이는 OpenAI 직원들이 Claude Code를 자사 제품에 우회 사용한 것이 발각된 결과였다.

---

## 3. MCP 본격화와 Plan Mode

**2025년 6월 — 8월**

이 시기의 키워드는 'MCP의 본격화'와 '계획 단계의 분리'다.

### MCP 생태계 확장

MCP(Model Context Protocol)는 Anthropic이 2024년 11월에 공개한 오픈 표준인데, Claude Code에서 본격적으로 빛을 발한 시기가 이 무렵이다. 사용자는 `.mcp.json` 파일이나 claude.ai 커넥터 설정으로 GitHub, Linear, Slack, Notion, Sentry 등 외부 서비스의 도구를 Claude Code에 연결할 수 있게 되었다. MCP 서버는 stdio, HTTP, SSE 세 가지 전송 방식을 지원했고, OAuth 인증 흐름도 표준화되었다. 한 때 사람들이 'Claude Code의 진정한 가치는 모델 자체가 아니라 MCP 생태계'라고 말한 것도 이 시기다.

### Plan Mode 도입

Plan Mode는 Claude가 곧바로 코드 수정에 들어가지 않고 먼저 작업 계획을 세워 사용자에게 보여주는 모드다. `Shift+Tab`을 두 번 누르면 진입할 수 있고, 사용자가 계획을 검토·승인한 뒤에야 실제 변경이 시작된다. 복잡한 다단계 작업에서 모델이 잘못된 방향으로 폭주하는 것을 막는 결정적인 안전장치였다. Plan Mode에서 생성한 계획은 `~/.claude/plans/`에 저장되어 컨텍스트 압축이나 세션 재시작 후에도 유지되었다.

### Output Styles와 교육적 활용

Output Styles는 같은 작업을 어떤 톤으로 보여줄지 결정하는 기능이다. 기본 스타일은 결과를 간결하게 보여주지만, 'Explanatory'를 켜면 각 단계의 의도를 함께 설명하고, 'Learning'을 켜면 사용자에게 단계별 질문을 던지면서 학습을 유도한다. 한국의 부트캠프, 사내 교육 현장에서 Claude Code를 도구로 채택하는 흐름은 이 시기에 시작되었다.

### 그 외 주요 변화

- **SubAgents 초기 형태** — 부모 에이전트가 무거운 탐색 작업을 자식 에이전트에 위임할 수 있는 Task 도구 도입.
- **Headless 모드 (`-p`, `--print`)** — CI 파이프라인에서 Claude Code를 비대화형으로 호출하는 표준이 됨.
- **커스텀 슬래시 명령** — `.claude/commands/*.md`에 마크다운 파일을 두면 `/slash` 명령으로 호출 가능.

---

## 4. v2.0과 VS Code 통합, Checkpoint

**2025년 9월**

2025년 9월 말, Claude Code 2.0이 발표되었다. 출시 7개월 만의 메이저 버전업으로, 이 버전은 Claude Code가 단순한 CLI 도구를 넘어 'IDE와 통합되는 개발 플랫폼'으로 정체성을 확장했음을 알리는 분기점이었다.

### VS Code Extension 정식 출시

그동안 Claude Code는 터미널 전용 도구라는 정체성을 유지했지만, 강력한 사용자 수요에 응답해 VS Code(및 Cursor, Windsurf 포함) 익스텐션이 정식 출시되었다. 사이드바 패널에서 실시간 코드 변경을 보고, 인라인 diff 뷰로 수정 내용을 검토하고, 터미널과 IDE 사이를 자연스럽게 오갈 수 있게 되었다. 터미널에 익숙하지 않은 개발자도 Claude Code를 쓸 수 있게 만든 변화였다.

### Checkpoint 시스템 도입

사용자가 프롬프트를 보낼 때마다 자동으로 체크포인트가 생성되어 30일간 보존되는 시스템이 도입되었다. 원하는 시점으로 되돌리려면 `Esc`를 두 번 누르거나 `/rewind` 명령을 쓰면 된다. AI가 멋대로 코드를 망쳐도 언제든 되돌릴 수 있다는 안전망은 사용자가 더 과감하게 작업을 위임할 수 있는 심리적 기반이 되었다. 이전에는 `/undo`였던 명령이 `/rewind`와 동의어로 통합되었다.

### 30시간 자율 작업의 시대

v2.0 발표 자료에서 강조된 것 중 하나는 '30시간 연속 자율 작업' 시연이었다. Plan Mode, Checkpoint, Hooks, MCP, Subagents 같은 기능들이 결합되면서 Claude Code는 사람이 한밤중에 잠든 사이에도 멈추지 않고 일하는 '진짜 에이전트'에 한 발 더 가까워졌다. Boris Cherny 등 Anthropic의 Claude Code 개발자들은 이 흐름을 'Long Running'과 'Swarm'이라는 두 키워드로 정리하기도 했다. `Ctrl+R`로 과거 프롬프트를 검색할 수 있게 된 것, `/usage` 명령으로 5시간/주간 사용량을 한눈에 볼 수 있게 된 것도 이 시기의 변화다.

---

## 5. Web 출시와 Skills 등장

**2025년 10월**

### Claude Code on the Web

2025년 10월 20일, Claude Code가 웹 브라우저에서도 실행되도록 확장되었다. 이전까지는 로컬 터미널에서만 동작했지만, 이제 브라우저에서 코드베이스를 연결해 병렬 세션으로 여러 작업을 동시에 진행할 수 있게 되었다. 같은 시기 iOS 앱도 함께 공개되어, 모바일에서 작업 진행 상황을 모니터링하거나 간단한 지시를 보낼 수 있게 되었다. Claude Code가 더 이상 '내 컴퓨터에서 도는 도구'가 아니라 '클라우드에서 비동기로 일하는 동료'로 진화한 순간이었다.

### Agent Skills 정식 출시 (10월 2일)

2025년 10월 2일, Agent Skills(베타 헤더 `skills-2025-10-02`)가 공식 출시되었다. Skill은 `SKILL.md` 파일 하나와 보조 파일들(템플릿, 스크립트, 참고 자료)로 구성된 폴더로, Claude가 작업 맥락에 맞춰 필요할 때 자동으로 로드해 사용한다.

Skills와 기존 슬래시 명령의 큰 차이는 '자동 호출' 여부였다. 슬래시 명령은 사용자가 명시적으로 `/command`를 입력해야 작동하지만, Skill은 frontmatter의 `description` 필드를 보고 Claude가 알아서 적절한 시점에 끌어다 쓴다. 이를 통해 'PDF 생성', 'Excel 처리', '특정 디자인 시스템 사용' 같은 도메인 지식을 사용자의 명시적 지시 없이도 일관되게 적용할 수 있게 되었다.

Skills는 세 위치에 둘 수 있었다. `~/.claude/skills/`는 글로벌, 프로젝트의 `.claude/skills/`는 프로젝트 전용, 그리고 플러그인 안에 번들된 스킬이 그것이다. Anthropic은 docx, pptx, xlsx, pdf, frontend-design 같은 빌트인 스킬도 함께 배포해 Claude Code가 사무 문서나 프레젠테이션까지 직접 만들 수 있도록 했다.

또한 같은 시기 컨텍스트 편집 기능에 `clear_thinking_20251015` 베타가 추가되어, 사고 블록(thinking blocks)을 자동으로 정리해 컨텍스트를 효율적으로 관리할 수 있게 되었다.

---

## 6. Plugins, Opus 4.5, 그리고 바이럴

**2025년 11월 — 12월**

### Plugins 시스템 공개

2025년 11월경 Anthropic은 Claude Code Plugins를 공식 발표했다. 플러그인은 슬래시 명령, 서브에이전트, 스킬, MCP 서버, 훅을 한 묶음으로 패키징해 배포·공유할 수 있는 메커니즘이다. 이전까지는 팀이나 커뮤니티가 만든 워크플로우를 공유하려면 각자 `.claude/` 디렉터리를 따로 관리해야 했지만, 플러그인 마켓플레이스가 도입되면서 git 저장소나 zip 아카이브 한 줄로 설치·배포가 가능해졌다. `claude plugin install`, `claude plugin marketplace add` 같은 명령이 도입되었고, managed-settings에서 `blockedMarketplaces`, `strictKnownMarketplaces` 같은 엔터프라이즈 정책 지원도 추가되었다.

### Opus 4.5 — 결정적 도약

Claude Opus 4.5의 출시는 Claude Code에 또 한 번의 결정적 도약이었다. 코드 작성·디버깅 능력이 크게 향상되면서 '쓸 만한 정도'에서 '경쟁 도구 대비 명백히 앞선' 단계로 평가가 바뀌었다. Anthropic 내부 보고에 따르면 Claude Code의 매출은 11월 시점에 연환산 10억 달러를 돌파했고, 2026년 1월에는 20억 달러에 근접한 것으로 추산된다.

### "Vibe Coding" 바이럴

2025년 말부터 2026년 초의 겨울 휴가 시즌은 Claude Code가 개발자 커뮤니티 바깥으로 본격적으로 확산된 시기였다. 프로그래밍 비전공자들이 'vibe coding'(분위기 코딩)이라는 표현을 쓰며 Claude Code로 게임, 웹사이트, 자동화 도구를 만드는 시도가 X(트위터)와 유튜브에서 폭증했다. Claude Code는 더 이상 시니어 개발자의 보조 도구가 아니라 '누구나 자기 아이디어를 코드로 만드는 도구'로 인식되기 시작했다.

### Auto Mode와 권한 시스템

권한 시스템도 이 시기에 크게 다듬어졌다. Auto Mode가 도입되어 안전한 도구 호출은 자동으로 승인하고 위험한 호출만 사용자에게 묻는 방식으로 진화했고, `--dangerously-skip-permissions` 플래그로 권한 프롬프트를 모두 건너뛰는 옵션도 표준화되었다. `/context` 명령으로 현재 컨텍스트 사용량과 분포를 시각화할 수 있게 된 것도 이 시기다.

---

## 7. Opus 4.6과 Subagent 시스템 성숙

**2026년 1월 — 2월**

### Opus 4.6과 Sonnet 4.6

2026년 초 Opus 4.6과 Sonnet 4.6이 출시되었다. 이 시기 Claude Code는 Pro/Max 구독자의 기본 effort 수준을 'medium'에서 'high'로 자동 상향했고, Opus 4.6과 Sonnet 4.6 모델의 최대 출력 토큰 한도가 128K까지 늘어났다. 코드 생성 속도와 깊이가 모두 한 단계 더 올라간 시기였다.

### Subagent 시스템의 완성

Subagent(서브에이전트) 시스템은 출시 초기부터 Task 도구라는 형태로 존재했지만, 2026년 초에 들어서야 본격적으로 다듬어졌다. 부모 에이전트가 큰 작업을 자식 에이전트에 위임하면, 자식은 자기만의 컨텍스트 윈도우와 권한 모드, MCP 도구를 갖고 독립적으로 작업을 수행한 뒤 결과 요약만 부모에게 반환한다. 중간 사고 과정과 도구 호출 결과는 부모 컨텍스트로 새지 않아, '컨텍스트 오염'을 막는 자연스러운 방어 장치가 되었다.

이 시기에 `TodoWrite`가 deprecated되고 `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`라는 더 구조화된 Task 도구로 대체되었다. `isolation: 'worktree'` 옵션으로 자식 에이전트를 git worktree 안에 격리해 실행하는 방식도 정착되었다. Agent Teams라는 다중 에이전트 협업 패턴도 같은 시기에 등장했다.

### Claude Code Security와 소스 코드 유출

2026년 2월, Anthropic은 Claude Code Security를 발표했다. 코드베이스를 자동 분석해 보안 취약점을 찾아주는 기능이다. 이어 3월에는 의도치 않은 사건이 있었다. Claude Code CLI의 소스 코드가 유출되면서, 당시 시점에서 미공개 상태였던 여러 기능과 모델(예: autoDream으로 알려진 메모리 통합 기능)이 외부에 드러난 것이다.

### Channels, Voice Mode, Remote Control

원격 제어(Remote Control) 기능이 정착되어 휴대폰이나 웹에서 Claude Code 세션을 모니터링하고 지시할 수 있게 되었다. Voice Mode도 추가되어 음성으로 코드 작업을 지시할 수 있게 되었으며, Channels 시스템으로 도구 승인 요청을 휴대폰으로 받을 수 있는 기능까지 등장했다.

---

## 8. Skills·Commands 통합과 Opus 4.7

**2026년 3월 — 현재**

### Skills와 Commands의 통합

오랫동안 별개의 개념으로 존재하던 `.claude/commands/*.md`(슬래시 명령)와 `.claude/skills/*/SKILL.md`(스킬)가 통합되었다. 두 위치 모두 동일한 `/slash-command` 인터페이스를 생성하고, 스킬은 commands의 상위 호환이 되어 보조 파일·자동 호출·동적 컨텍스트 주입 같은 추가 기능을 제공한다. 기존 commands 디렉터리는 그대로 동작하며, 마이그레이션은 점진적으로 진행되도록 설계되었다.

### Native Binary CLI 전환

버전 2.1.113부터 Claude Code CLI는 번들된 자바스크립트가 아니라 플랫폼별 네이티브 바이너리로 실행되도록 바뀌었다. Node.js 의존성과 npm 패키지 시작 시간 문제를 한꺼번에 해결한 변화로, 시작 속도가 빨라지고 메모리 사용량이 줄었다. macOS와 Linux의 경우 Glob과 Grep이 Bash 도구 안에 임베드된 bfs/ugrep으로 대체되어 별도 도구 라운드트립 없이 더 빠른 검색이 가능해졌다.

### Opus 4.7과 xhigh Effort

버전 2.1.111에서 Claude Opus 4.7이 출시되었다. 'xhigh'라는 새로운 effort 레벨도 함께 추가되어, 기존의 low/medium/high/max 사이에 위치한 xhigh가 high와 max 사이의 균형점을 제공한다. Opus 4.7의 컨텍스트 윈도우가 네이티브 1M으로 확장되어 200K 기준으로 계산되던 컨텍스트 비율 표시도 보정되었다. 또한 같은 버전에서 'auto mode'가 모든 사용자에게 기본 활성화되어 `--enable-auto-mode` 플래그가 더 이상 필요 없게 되었다.

### Agent View, /goal, Dreaming

`claude agents` 명령으로 실행 중·차단·완료된 모든 Claude Code 세션을 한 화면에서 관리하는 'Agent View'가 리서치 프리뷰로 추가되었다. `/goal` 명령도 새로 등장했는데, 완료 조건을 지정해두면 Claude가 조건이 충족될 때까지 여러 턴에 걸쳐 계속 작업한다. Long Running 작업의 첫 번째 정식 구현이다. 2026년 5월에는 Managed Agents API에 'Dreaming'이라는 메모리 통합 기능이 리서치 프리뷰로 추가되었다. 에이전트의 영속 메모리를 세션 사이에 통합해 중복을 제거하는 기능으로, 3월 소스 코드 유출 당시 'autoDream'으로 알려졌던 그 기능이다.

---

## 9. 핵심 기능 계보 — MCP와 컨텍스트 관리

### MCP(Model Context Protocol)의 진화

MCP는 Claude Code의 가장 결정적인 차별화 요소다. 2024년 11월 Anthropic이 오픈 표준으로 공개한 뒤, 2025년 한 해 동안 Claude Code의 핵심 확장 메커니즘으로 자리잡았다.

- **2024년 11월** — MCP 사양과 첫 SDK 공개. Anthropic이 '에이전트의 USB-C'라고 비유.
- **2025년 봄** — Claude Code에서 stdio MCP 서버 지원. `.mcp.json` 설정 표준화.
- **2025년 여름** — HTTP/SSE 전송 지원, OAuth 인증 흐름 정착. GitHub, Linear, Notion, Slack 등 주요 서비스 커넥터 공개.
- **2025년 가을** — claude.ai 커넥터 통합. 사용자가 클로드 웹 계정에 연결한 서비스를 Claude Code에서 그대로 활용 가능.
- **2026년 초** — `alwaysLoad` 옵션으로 도구 검색 지연을 우회하는 옵션, `_meta` annotation으로 대용량 결과 처리 제어 등 정교한 튜닝 가능.

### 컨텍스트 관리의 진화

컨텍스트 윈도우가 유한하다는 사실은 Claude Code의 가장 큰 제약이자 가장 많은 기능 변화를 이끌어낸 영역이다.

- **CLAUDE.md** (출시 시점) — 세션 시작 시 자동 주입되는 시스템 프롬프트. 글로벌과 프로젝트 단위 계층 구조.
- **`/compact`** (2025년 초) — 대화를 요약본으로 압축. Preserve 지시로 보존 항목 명시 가능.
- **`/clear`, `/rewind`** (2025년 9월 v2.0) — 컨텍스트 완전 초기화와 체크포인트 되감기.
- **auto-compact** (2025년 가을) — 컨텍스트 사용량이 ~80% 후반대에 도달하면 자동 발동. 단, 손실이 조용히 일어나는 단점이 있어 'Document & Clear' 패턴이 커뮤니티 모범 사례로 정착.
- **`/context` 명령** (2025년 말) — 현재 컨텍스트의 항목별 토큰 사용량을 시각화.
- **Subagent 격리** (2026년 초) — 자식 에이전트의 중간 사고 과정이 부모 컨텍스트로 새지 않음.
- **1M 컨텍스트 베타 → Opus 4.7 네이티브 1M** — 200K의 5배, 그리고 베타가 아닌 정식 1M.

---

## 10. 주요 연표와 마무리

### Timeline

| 날짜 | 이벤트 |
|---|---|
| 2024.11 | MCP(Model Context Protocol) 공개 |
| 2025.02.24 | Claude Code 리서치 프리뷰 출시 |
| 2025.04 | OpenAI Codex CLI 출시 |
| 2025.05 | Claude 4와 함께 정식 출시(GA) |
| 2025.06 | 구글 Gemini CLI 출시 |
| 2025.06–07 | Hooks, Output Styles, SlashCommand 도구 |
| 2025.08.07 | Sonnet 4에 1M 컨텍스트 베타 |
| 2025.09.30 | Claude Code v2.0 — VS Code, Checkpoints |
| 2025.10.02 | Agent Skills 정식 출시 |
| 2025.10.20 | Claude Code on Web + iOS 앱 |
| 2025.11 | Plugins, Opus 4.5. 연환산 매출 10억 달러 |
| 2025.12–2026.01 | "Vibe Coding" 바이럴 |
| 2026.01–02 | Opus 4.6, Subagent/Task 시스템 성숙 |
| 2026.02 | Claude Code Security |
| 2026.03 | 소스 코드 유출 사건 |
| 2026.03–04 | Skills와 Commands 통합 |
| 2026.04 | Opus 4.7, Native CLI, Agent View, /goal |
| 2026.05 | Dreaming (메모리 통합) 리서치 프리뷰 |

### 마무리하며

Claude Code의 15개월은 단순히 한 도구의 기능 추가 역사가 아니다. AI가 '대답하는 존재'에서 '행동하는 존재'로 카테고리를 옮겨가는 과정에서 가장 앞서 길을 낸 사례다. CLAUDE.md, MCP, Hooks, Skills, Subagents, Plan Mode, Checkpoints — 이 기능들 하나하나는 이후 Cursor, Codex CLI, Gemini CLI 같은 모든 경쟁 도구의 청사진이 되었다.

2025년이 '터미널 에이전트라는 카테고리의 탄생'이었다면, 2026년의 화두는 'Long Running'과 'Swarm'으로 모이는 듯하다. Claude Code 개발자 보리스 체르니가 도쿄 밋업에서 언급한 두 키워드는 이미 `/goal` 명령과 Agent Teams로 실체를 드러내기 시작했다. 다음 1년이 또 어떤 변화를 만들어낼지, 지금 이 글이 빠르게 낡아갈 것은 거의 확실하다.

---

**참고 자료:** github.com/anthropics/claude-code (CHANGELOG.md) · code.claude.com/docs/changelog · platform.claude.com/docs/release-notes · anthropic.com/news · 위키백과 한국어/영어판
