# Memory System

같은 실패를 반복하지 않기 위한 학습 누적 시스템.

> 규칙은 이 파일, 실제 관측은 `memory/` 아래에 둠.

## 원칙

- 1 entry = 1 관측 사건. 추상적 권고 금지.
- 새 관측은 daily에 append. 반복 패턴은 topic으로 추출.
- daily는 append-only. topic으로 추출해도 원본 entry는 남김.
- 본문은 한국어 `~함` 톤. 단, 코드·명령어·로그·에러 메시지·라이브러리/제품명·파일 경로·식별자는 원문 유지.

## 디렉터리

```text
memory/
├── _template.md
├── _daily/YYYY-MM-DD.md
└── topics/{slug}.md
```

- `_daily/`: 모든 신규 관측의 입구.
- `topics/`: 3회 이상 반복되었거나 재발 비용이 큰 패턴을 정제한 곳.

## Daily entry 형식

파일은 `# YYYY-MM-DD` 한 줄로 시작하고, 그 아래에 entry를 append.

```markdown
# 2026-05-03

## Entry: 2026-05-03 — 짧은 한국어 제목
- **상황**: 어떤 작업 중이었나 (브랜치, 환경, 직전 커밋)
- **증상**: 관측된 잘못된 동작. 에러 메시지는 원문 인용
- **원인**: 왜 발생했나 (모르면 "추정")
- **해결**: 어떻게 해결했나. 재현 가능한 명령/코드 포함
- **검증**: 실행한 명령과 결과 (안 했으면 "미검증")
```

## Topic entry 형식

Topic은 daily 5섹션 + **일자** 1개 = 6섹션 고정. 새 헤더 추가 금지.

```markdown
## ENTRY-001: 짧은 한국어 제목

**상황** / **증상** / **원인** / **해결** / **검증**
(각 섹션은 daily와 동일)

**일자**
- 2026-04-12 최초 / 2026-05-01 검증
```

파일이 200라인 넘으면 `{slug}-2.md`로 분할.

## 단계 (Daily → Topic → Mechanism)

| 단계 | 트리거 | 행동 |
| --- | --- | --- |
| Daily | 1~2회 관측 | `_daily/{date}.md`에 append |
| Topic 추출 | 같은 패턴 3회 또는 재발 비용 큰 실패 | `topics/{slug}.md`에 6섹션 entry 추가 |
| Mechanism | topic 등록 후 또 재발 | hook / linter / schema / test로 결정론적 차단 |

Topic에 등록된 실패가 다시 나오면 텍스트 룰을 늘리지 말고 코드로 막음.

## 로딩 규칙

작업 도메인이 해당될 때만 해당 topic을 읽음. 무관한 topic은 로드하지 않음.

| 도메인 | 파일 |
| --- | --- |
| 시간 계산, `words.json`, ms↔frame | `memory/topics/time-sync.md` |
| ElevenLabs / OpenAI 호출 | `memory/topics/external-api.md` |
| Remotion subprocess, EDL, render | `memory/topics/remotion-render.md` |
| `uv sync`, `pnpm install`, 빌드 | `memory/topics/build-errors.md` |
| git commit / push / PR | `memory/topics/git-workflow.md` |

## 감사 (주 1회 또는 릴리스 전)

- [ ] `AGENTS.md` 로딩 표와 이 문서 로딩 규칙이 일치하는가
- [ ] topic 파일이 6섹션 스키마를 지키는가
- [ ] topic 등록 후 재발한 실패가 mechanism으로 격상되었는가
- [ ] 90일 이상 된 daily 로그를 archive할 필요가 있는가

```bash
for f in memory/topics/*.md; do
  printf "%-40s %s lines\n" "$(basename "$f")" "$(wc -l < "$f")"
done
```

## 안티패턴

- 한 entry에 여러 사건 묶기
- "여러 에러가 있었다" 같은 추상 기록
- 해결만 적고 원인 / 검증을 비우기
- daily 로그를 "정리"한다며 삭제
- topic 재발을 텍스트 룰로만 덮기