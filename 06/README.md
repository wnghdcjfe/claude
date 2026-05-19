# MD2Short

마크다운 1장을 입력하면 9:16 한국어 숏폼 영상(MP4)을 자동 생성하는 로컬 CLI.

```bash
uv run md2short run sample.md
# → output/ret.mp4 (1080×1920, h264 + aac, 자막·호랑이 cue 포함)
```

## 필수 도구

| 도구 | 버전 | 용도 |
| --- | --- | --- |
| Python | ≥ 3.11 | 파이프라인 실행 |
| [uv](https://github.com/astral-sh/uv) | 최신 | Python 의존성 관리 |
| Node | ≥ 20 | Remotion 번들·렌더 |
| npm | Node 동봉 | Remotion 의존성 설치 |
| ffmpeg / ffprobe | 6+ | 오디오 길이 측정·QC 보조 |

macOS 기준: `brew install ffmpeg node uv` 한 줄로 모두 설치 가능.

## 1회만: 의존성 설치

```bash
# Python 측 (가상환경 + dev 그룹 포함)
uv sync

# Remotion 측
(cd remotion && npm install)
```

## 환경 변수

`.env.example`을 복사해 `.env`로 만들고 두 키를 채운다.

```bash
cp .env.example .env
# ELEVENLABS_API_KEY=...   # TTS + Scribe (필수)
# OPENAI_API_KEY=...        # script_engine (선택, 없으면 fallback_extract)
```

| 변수 | 필수 | 출처 |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | ✅ | https://elevenlabs.io/app/settings/api-keys |
| `OPENAI_API_KEY` | ⚠️ 권장 | https://platform.openai.com/api-keys |

`OPENAI_API_KEY`가 없거나 `_looks_korean()` 가드가 실패하면 자동으로 `fallback_extract`(마크다운 stripping)로 강등됨.

## 사용법

### 기본 (sample.md → output/ret.mp4)

```bash
uv run md2short run sample.md
```

성공 시:
- `output/ret.mp4` — 최종 배포용 MP4 (1080×1920, h264)
- `jobs/sf_<YYYYMMDD>_<6hex>/qc_report.json` — QC 결과 + 비용 추정
- `jobs/sf_<YYYYMMDD>_<6hex>/status.json` — `"status": "qc_passed"`

### CLI 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--lang`, `-l` | `ko` | 출력 언어 (v1은 ko 락) |
| `--voice`, `-v` | `v1jVu1Ky28piIPEJqRrm` | ElevenLabs voice id |
| `--speed` | `1.0` | TTS 속도 0.7–1.2 |
| `--template`, `-t` | `tech_explainer` | 인자만 받음 (Remotion composition은 단일) |
| `--chunk-size` | `14` | 자막 청크 최대 단어 수 (1–24) |
| `--bg` | `0xFFFFFF` | 배경색 (#RRGGBB / 0xRRGGBB) |
| `--jobs-root` | `jobs` | Job 산출물 루트 |
| `--engine` | `remotion` | (v1은 remotion만) |
| `--visual-mode` | `emoticon` | `emoticon` 만 v1에서 지원 |
| `--model` | `gpt-5-mini` | OpenAI 스크립트 모델 |
| `--output`, `-o` | `output/ret.mp4` | 최종 사본 경로 (빈 문자열이면 비활성화) |

## 파이프라인 단계

```
sample.md
  → [1] script_engine (OpenAI Responses + _looks_korean 가드)  → inputs/script.{md,json}
  → [2] voice (ElevenLabs TTS eleven_multilingual_v2)             → audio/narration.mp3
  → [3] transcript (ElevenLabs Scribe v1, ms 정규화)               → transcripts/words.json
  → [4] planner (caption_plan + emoticon_map fill_gaps)            → edit/{caption_segments,emoticon_cues}.json
  → [5] render (Remotion render TechExplainer, 1080×1920)          → edit/final.mp4
  → [6] copy + QC (sync ±1000ms / ±100ms)                          → output/ret.mp4 + qc_report.json
```

상세 설계: [`docs/architecture.md`](docs/architecture.md).

## 테스트

```bash
uv run pytest tests/
# 90+ tests covering schema, state machine, retry, script engine,
# TTS text prep, Scribe normalisation, numeric display, caption plan,
# emoticon planner, QC checks, CLI integration, ffmpeg-subtitles-filter ban.
```

## 비용 (sample.md 기준)

| 항목 | 단가 | 1편 (~90s) 추정 |
| --- | --- | --- |
| ElevenLabs TTS | $0.30 / 1K chars | ~$0.16 |
| ElevenLabs Scribe | $0.40 / hour | ~$0.01 |
| OpenAI gpt-5-mini | $0.25/$2.00 per M tok | ~$0.0003 |
| **합계** | | **~$0.17** |

`qc_report.json`에 정확한 청구 추정이 기록됨. `gpt-image-2` 비용은 v2 photo 모드에서 별도 추적.

## 문서

| 파일 | 범위 |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | 에이전트 작업 원칙, 레이어 경계 (필수 읽기) |
| [`docs/PRD.md`](docs/PRD.md) | 제품 요구사항 (WHAT/WHY) |
| [`docs/architecture.md`](docs/architecture.md) | 시스템 설계 (HOW) |
| [`docs/voice.md`](docs/voice.md) | 음성 설정 |
| [`docs/memory.md`](docs/memory.md) | 실패 메모리 시스템 규칙 |
| [`docs/commit.md`](docs/commit.md) | 커밋 메시지 양식 |
| [`.omc/specs/deep-interview-md2short-mvp.md`](.omc/specs/deep-interview-md2short-mvp.md) | MVP 명세 (ambiguity 15.9%) |
| [`.omc/prd.json`](.omc/prd.json) | 9개 user story 진행 상황 |

## 알려진 제약

- **MVP는 emoticon 모드 단독** — `--visual-mode photo`는 v2 범위.
- **NumberCard / Opening overlay / Outro / Storyboard 입력**은 props는 있지만 비활성화 또는 미구현.
- **CLI `status` / `clean` 서브커맨드**는 v2.
- **부분 재렌더링**은 v2 (현재는 매번 새 job_id).
- **Scribe가 숫자를 음역**한 경우(예: "1 4 일") `numeric_display`가 부분적으로만 복원함 — 영상 자막에는 Scribe 결과 그대로 표시.
