## 1. 핵심 설계 원칙

### 1.1 레이어 분리

세 외부 기술은 같은 레이어에 두지 않음.

| 레이어 | 도구 | 책임 | 결합 방식 |
| --- | --- | --- | --- |
| 음성 | ElevenLabs TTS + Scribe | 내레이션 생성, 단어 단위 타임스탬프 추출 | `httpx` + `_retry.post_with_retry` |
| 대본 | OpenAI Responses API (`gpt-5-mini` default, `--model` override) + markdown extract fallback | 마크다운 → Hook/Body/CTA 대본 | Structured Outputs JSON schema + `<user_content>` 인젝션 방지 |
| 편집 판단 | deterministic Python planner | 문장 단위 자막 chunk, 호랑이 cue, 숫자 카드 생성 | JSON 파일 |
| 실사 비주얼 (옵션) | OpenAI Responses + `gpt-image-2` | Remotion 자막 segment별 영어 image prompt → 9:16 실사 PNG | `httpx`, per-image moderation retry chain, 실패 시 emoticon 모드로 자동 fallback |
| 비주얼 합성 | Remotion 4.x | 9:16 MP4 렌더, 자막·호랑이/실사·숫자 합성 | `npx remotion render` subprocess |

레이어 간 통신은 디스크 산출물(`words.json`, `script.json`, `emoticon_cues.json` 또는 `photo_cues.json`, `number_cards.json`, Remotion `props.json`)로만 함. Python이 Remotion 컴포넌트 내부를 직접 호출하지 않고, Remotion은 전달받은 props와 `words.json`만 사용해 확정적으로 조립함. 자막·오버레이 합성은 Remotion 단독 책임이며, ffmpeg 후처리는 이미 합성된 픽셀을 다시 자막화하거나 overlay하지 않는다.

### 1.2 단일 진실원 (Single Source of Truth)

`jobs/<job_id>/transcripts/words.json`이 모든 **음성·자막 시간**의 단일 진실원임.

- ElevenLabs Scribe 결과는 ms 단위로 정규화되어 저장됨.
- Remotion 자막은 `words.json`의 `start`/`end`를 frame으로 변환해 표시함.
- Remotion 자막 cue와 visual cue는 모두 `words.json` 기반 timing을 사용함.
- `numeric_display.py`는 Scribe가 숫자를 한글 발음으로 전사한 경우 표시 텍스트만 원문 숫자 형태로 보정하고, timing은 Scribe 값을 유지함.
- `NumberCard`는 대본 내 숫자 위치를 audio duration에 비례 매핑하는 **시각 cue**이며, 자막·음성 sync의 진실원을 대체하지 않음.

### 1.3 AI는 판단, Remotion은 조립

- OpenAI는 대본 JSON(Hook/Body/CTA)만 생성함.
- 편집 판단은 Python 규칙(`caption_plan.py`, `emoticon_map.py`, `data_extract.py`)으로 수행함.
- Remotion은 props 기반 deterministic render만 담당함.
- 같은 `props.json` + 같은 assets + 같은 Remotion 코드 → 같은 영상이 나와야 함.

### 1.4 음성 길이 기준 타임라인

대본 예상 시간이 아니라 **실제 생성된 TTS 오디오 길이**를 기준으로 timeline을 계산함. `render.get_audio_duration_ms()`가 `ffprobe`로 narration duration을 측정하고, Remotion `durationInFrames`는 audio duration × 30fps를 round해 결정함. QC는 audio duration, last word end, final MP4 duration을 각각 비교함.

### 1.5 한국어 전용 (v1.1+)

출력 언어는 **한국어로 락**됨 — `JobConfig.language`, `DEFAULT_VOICES`, `CTA_TEXT`, `SCRIBE_LANG`, `OPENING_TEMPLATES` 모두 `ko` 단일 키만 노출. `script_engine.SYSTEM_PROMPT`는 영문 문장·한자·일본어 출력을 금지하고, `_looks_korean()` 가드가 위반 시 `fallback_extract`로 강등함. 종목·지수·약어(S&P500, AMD, AI 등) 표기만 영문 허용 — `numeric_display.py`가 Scribe 음역(예: "에센피")을 원문으로 자동 복원함. en/ja 지원은 v2 범위.

### 1.6 정보 보존 우선 (v1.2+)

`script_engine`의 제1원칙은 **마크다운에 적힌 모든 핵심 사실을 빠짐없이 담는 것**. `--duration`/`target_chars` 기반 길이 hint와 trim은 제거됨. 영상 길이는 입력 마크다운으로 만든 내레이션과 실제 TTS audio duration으로 자연스럽게 결정됨.

### 1.7 두 가지 비주얼 모드

`JobConfig.visual_mode` ∈ {`emoticon`, `photo`}. `emoticon`(default)은 `EMOTICON_KEYWORDS` 사전(상세 수량은 §5.8이 단일 진실원)으로 deterministic 매칭 — 추가 외부 이미지 API 비용 없이 항상 같은 결과. `photo`는 Remotion 자막 segment 단위로 핵심 visual keyword/subject를 추출한 뒤 OpenAI Responses 영어 image prompt를 일괄 생성하고 `gpt-image-2`로 9:16 실사 PNG를 bounded-parallel 로 렌더한다. OpenAI 안전 시스템에 prompt가 차단되면 per-image retry chain(키워드 중심 원본 → 실명 제거 sanitised → 추상 fallback) 통과를 시도하고 모두 실패하면 잡 전체가 emoticon 모드로 자동 fallback. cue는 기존 `emoticonFileName` 경로 필드를 유지하면서 `assetKind`/`visualMode`를 추가해 Remotion `VisualLayer.tsx`가 emoticon은 정사각 contain, photo는 safe content rectangle cover/crop 으로 렌더함.

---

## 2. 시스템 아키텍처

### 2.1 실행 흐름

```text
[사용자 터미널]
  ↓ uv run md2short run sample.md --visual-mode emoticon|photo
[md2short.cli]
  ├─ .env 로드: ELEVENLABS_API_KEY 필수, OPENAI_API_KEY (script + photo 모드) 권장
  ├─ CLI 인자 검증: lang(ko 락), chunk-size(1~24), engine(remotion only), visual-mode, OPENAI_API_KEY 존재 (photo 모드)
  └─ JobConfig 구성 (language=ko, visual_mode=emoticon|photo)
      ↓
[md2short.pipeline.run_job]
  ├─ pre-flight: ffprobe/ffmpeg 확인(오디오 길이·QC 보조용), remotion/node_modules/npx 확인
  ├─ job_id 생성: sf_YYYYMMDD_<6 hex>
  ├─ jobs/<job_id>/ 디렉터리 + status.json(created)
  ├─ [1] script_engine.generate_script
  │     ├─ OpenAI `gpt-5-mini` 기본 Responses API JSON(또는 `--model` override) — 정보 보존 우선 prompt
  │     ├─ _looks_korean() 가드: 한국어 외 문장 leak 시 → fallback_extract
  │     └─ opening.py 한국어 오프닝을 앞에 붙임 → inputs/script.md, inputs/script.json
  ├─ [2] tts_text.prepare_tts_text + voice.synthesize
  │     └─ TTS 전용 발음/pause 보정 후 ElevenLabs TTS eleven_multilingual_v2 → audio/narration.mp3, logs/tts_input.txt
  ├─ [3] transcript.transcribe
  │     └─ ElevenLabs Scribe scribe_v1 → transcripts/words.json, logs/scribe_raw.json
  ├─ [4] numeric_display.apply_numeric_display_overrides
  │     └─ 숫자·약어(S&P500 같은 acronym+digits 묶음)·"에센피" 한글 음역까지 원문 표시형으로 보정
  ├─ [5] visual cue planning (Remotion props 산출)
  │     ├─ visual_mode=emoticon: emoticon_map.plan_cues → edit/emoticon_cues.json
  │     ├─ visual_mode=photo: photo_engine.plan_photo_cues
  │     │     ├─ 자막 segment에서 visual keyword/primary subject 추출
  │     │     ├─ 자막 segment 텍스트+keyword hint N개를 한 번의 OpenAI Responses 호출로 영어 prompt 일괄 생성
  │     │     ├─ 각 prompt → gpt-image-2 (1024x1536 high) → remotion/public/jobs/<id>/photos/seg_NN_<hash>.png
  │     │     ├─ moderation_blocked 시 per-image retry chain (키워드 중심 원본 → 실명 제거 sanitised → 추상 fallback)
  │     │     ├─ 모두 실패 시 PhotoEngineError → emoticon 모드로 잡 전체 자동 fallback
  │     │     └─ → edit/photo_cues.json
  │     ├─ data_extract.plan_number_cards → edit/number_cards.json
  │     └─ all_highlight_keywords → Remotion caption highlight props
  ├─ [6] subtitled stage
  │     └─ edit/caption_segments.json + Remotion props 기준 확정. Captions.tsx 가 words.json sentence boundary(구두점·gap≥600ms) 기준 최대 2줄 자막
  ├─ [7] render
  │     └─ remotion: render_remotion → edit/final.mp4 (자막 포함)
  ├─ [8] output copy
  │     └─ edit/final.mp4 → output/ret.mp4 (기본)
  └─ [9] qc.run_qc
        └─ qc_report.json + terminal status(qc_passed/qc_failed)
```

### 2.2 Python 모듈 구성

| 모듈 | 역할 |
| --- | --- |
| `md2short.cli` | Typer multi-command (`run`, `status`, `clean`), `.env` 로드, 인자 검증 (lang/chunk-size/engine/visual-mode) |
| `md2short.pipeline` | 단일 job 오케스트레이션, 디렉터리/상태/산출물 관리, visual_mode 분기, photo 실패 시 emoticon 자동 fallback, `output/ret.mp4` 복사 |
| `md2short.schema` | Pydantic `JobConfig`, `CaptionWord`, 한국어 voice 매핑 (ko 락), `VisualMode` enum |
| `md2short.state` | 파일 기반 상태 머신 전이 검증. photo 진행 이벤트(`photo_generating`, `photos_generated`, `photo_fallback`)는 status write 없이 on_stage callback 만 호출 |
| `md2short.script_engine` | OpenAI Responses API 대본 생성(`gpt-5-mini` 기본, `--model` override). 정보 보존 우선 prompt + `_looks_korean()` 가드 — 한국어 외 문장 leak 시 fallback_extract |
| `md2short.script` | 마크다운 제거 + 텍스트 추출 fallback (한국어 전용) |
| `md2short.tts_text` | TTS 전용 텍스트 보정. 자막 원문은 유지하되 숫자·약어 발음 안정화와 pause-heavy punctuation 평탄화를 수행 |
| `md2short.storyboard` | `### N컷` 입력을 감지해 `자막` 필드만 TTS 내레이션으로 사용하고 컷별 visual/caption segment를 `words.json` 문장 boundary에 매핑 |
| `md2short.voice` | ElevenLabs TTS 호출, mp3 저장 |
| `md2short.transcript` | ElevenLabs Scribe 호출, word timestamp ms 정규화 |
| `md2short._retry` | TTS/STT/Image API 429/5xx/timeout retry 3회, 0.5/1.0/2.0s backoff |
| `md2short.numeric_display` | Scribe 발음형 숫자·약어를 원문 표시형으로 보정. acronym + 인접 숫자(`S&P500`) 한 토큰 매칭, `_ACRONYM_KO_VARIANTS`(에센피 등 한글 음역 단축형) 사전, numeric/acronym scan 96 words, acronym threshold 0.86, grouped-number threshold 0.84 |
| `md2short.caption_plan` | Remotion `Captions.tsx`와 동일한 자막 segment 생성 규칙 (구두점·gap≥600ms·chunk-size cap) |
| `md2short.emoticon_map` | 호랑이 keyword 사전(수량은 §5.8 참조) + sentence segment planner + caption highlight keyword |
| `md2short.photo_engine` | (실사 모드) OpenAI Responses 로 자막 segment별 영어 image prompt 일괄 생성 → `gpt-image-2` 로 9:16 PNG 한 장씩 렌더, per-image moderation retry chain, `ModerationBlockedError`/`PhotoEngineError` 타입 분리 |
| `md2short.data_extract` | 대본에서 숫자·단위·지수 추출 → NumberCard cue |
| `md2short.render` | Remotion staging/props/render subprocess, ffprobe 기반 duration 측정, 최종 후처리 보조 |
| `md2short.qc` | transcript tail/render-audio QC + flexible duration metadata + 비용 추정 |

### 2.3 Remotion 구성

`remotion/src/index.ts`가 `Root.tsx`를 등록하고, 실제 composition id는 `TechExplainer`임.

| 파일 | 책임 |
| --- | --- |
| `Root.tsx` | 1080×1920, 30fps, default props, `calculateMetadata`로 duration override |
| `TechExplainer.tsx` | 전체 합성 루트: Background + Audio + VisualLayer + NumberCards + Header + BottomBar + Captions + OpeningBriefing/Outro. `showOpening` props 로 opening visual/caption suppression 계약을 동기화하고, `showOutro`는 기본 비활성화 |
| `BrandHeader.tsx` | 상단 470px 검은 띠 = safe margin 250px + logo 220px (`img/header_logo.png`) |
| `BottomBar.tsx` | 하단 460px 검은 자막 띠 |
| `Captions.tsx` | `words.json` 기반 **문장 단위** chunk reveal (구두점·gap≥600ms boundary), 최대 2줄 자동 배치, 장문 폰트 축소, 활성 단어 pop scale, chunk당 1개 노란 keyword 강조. `captionSegments`가 있으면 visual cue와 같은 boundary로 chunk를 고정함. `chunkSize` prop 은 caption chunk 최대 단어 수 안전 상한(default 14, max 24) |
| `VisualLayer.tsx` | cue별 `<Sequence>`, 완만한 Ken Burns zoom in/out. emoticon 모드(`emoticon/*.png`)는 정사각 contain, photo 모드(`jobs/<id>/photos/seg_NN_<hash>.png`)는 safe content rectangle cover/crop |
| `Emoticons.tsx` | legacy emoticon renderer 파일. 신규 합성 루트는 `VisualLayer.tsx` 사용 |
| `NumberCard.tsx` | 숫자 sticker card 1.8s pop-in + tilt |
| `OpeningBriefing.tsx` | `showOpening`이 true일 때 "X월 X일 데이브리핑입니다" 큰 가운데 박스 표시 |
| `Outro.tsx` | `showOutro`가 true일 때만 마지막 2.6s full-screen 구독 CTA overlay 표시. 기본값은 false |
| `types.ts` | `Word`, `WordsDoc`, `EmoticonCue`(`assetKind`/`visualMode` 포함), `NumberCard`, `CueProps` |

Remotion assets는 `render_remotion()`이 다음을 보장함.

- `remotion/public/jobs/<job_id>/narration.mp3`, `words.json`, `props.json` staging
- `remotion/public/emoticon -> ../../emoticon` symlink 또는 copy fallback (emoticon 모드용 호랑이 PNG)
- `remotion/public/jobs/<job_id>/photos/seg_NN_<hash>.png` (photo 모드 시 `photo_engine`이 직접 staging)
- `remotion/public/img -> ../../img` symlink 또는 copy fallback
- `remotion/public/company -> ../../company` symlink 또는 copy fallback (회사 로고 overlay용)
- `remotion/public/font/font.css` 정적 CSS 파일
- Remotion은 `staticFile("font/font.css")`로 위 CSS를 로드해 SeoulAlrim/SeoulNotice 계열 font-face를 적용

---

## 3. Job 상태 머신

상태는 `jobs/<job_id>/status.json`에 저장함. DB 없음.

```text
created
  → script_generated
  → voice_generated
  → transcribed
  ··· optional progress event: photo_generating → photos_generated | photo_fallback
  → subtitled
  → final_rendered
  → qc_passed | qc_failed

any non-terminal state → failed
```

Terminal state는 `qc_passed`, `qc_failed`, `failed`임. `state.validate_transition()`이 허용되지 않은 전이를 `ValueError`로 차단함.

### 3.1 `status.json` 상태와 progress event 분리

`status.json`에는 아래 canonical 상태만 저장한다. UI/progress callback용 event는 상태 머신 전이가 아니며 `validate_transition()`을 거치지 않는다.

| 구분 | 값 | 기록 위치 | 목적 |
| --- | --- | --- | --- |
| non-terminal status | `created`, `script_generated`, `voice_generated`, `transcribed`, `subtitled`, `final_rendered` | `jobs/<job_id>/status.json` | 재개·디버깅 가능한 파이프라인 단계 |
| terminal status | `qc_passed`, `qc_failed`, `failed` | `jobs/<job_id>/status.json` | job 종료 결과 |
| progress event | `photo_generating`, `photos_generated`, `photo_fallback` | `on_stage` callback, 필요 시 `logs/photo_fallback.json` | photo mode 진행률·fallback 표시 |

### 3.2 Job ID 포맷과 경로 기준

Job ID는 `sf_<YYYYMMDD>_<6 hex>` 형식이다. 예: `sf_20260502_abc123`. 모든 job 산출물 경로는 `jobs/<job_id>/` 기준 상대 경로로 문서화하고, Remotion staging 경로만 `remotion/public/jobs/<job_id>/` 아래에 둔다.

### 3.3 단계별 필수 산출물

| 상태 | 필수 산출물 |
| --- | --- |
| `script_generated` | `inputs/source.md`, `inputs/script.md`, `inputs/script.json` |
| `voice_generated` | `audio/narration.mp3`, `logs/tts_input.txt` |
| `transcribed` | `transcripts/words.json`, `logs/scribe_raw.json` |
| `subtitled` | `edit/caption_segments.json`(segment가 있을 때), `edit/emoticon_cues.json` 또는 `edit/photo_cues.json` |
| `final_rendered` | `edit/final.mp4`, `remotion/public/jobs/<job_id>/props.json`, `logs/remotion.log` |
| `qc_passed` / `qc_failed` | `qc_report.json`, `output/ret.mp4`(기본 output copy 사용 시) |

`status.json` 예:

```json
{
  "status": "qc_passed",
  "job_id": "sf_20260502_abc123",
  "config": {
    "platform": "youtube_shorts",
    "language": "ko",
    "voice_id": "v1jVu1Ky28piIPEJqRrm",
    "template_id": "tech_explainer",
    "bg_color": "0xFFFFFF",
    "chunk_size": 14,
    "engine": "remotion",
    "visual_mode": "emoticon",
    "show_opening": true,
    "show_outro": false
  },
  "started_at": "2026-05-02T00:00:00+00:00",
  "markdown_input": "/abs/path/sample.md",
  "script_chars": 620,
  "engine": "remotion",
  "qc_report": "jobs/sf_20260502_abc123/qc_report.json",
  "qc_passed": true,
  "updated_at": "2026-05-02T00:01:30+00:00"
}
```

---

## 4. 데이터 모델과 산출물

### 4.1 `JobConfig`

```python
class JobConfig(BaseModel):
    platform: Literal["youtube_shorts", "instagram_reels", "tiktok"] = "youtube_shorts"
    language: Literal["ko"] = "ko"              # 한국어 락 (v1.1+). en/ja는 v2.
    voice_id: str
    voice_speed: float = 1.0                    # 0.7~1.2
    template_id: str = "tech_explainer"         # 현재 분기 미적용
    bg_color: str = "0xFFFFFF"
    chunk_size: int = 14                        # 자막 segment 최대 단어 수 안전 상한 (1~24)
    engine: Literal["remotion"] = "remotion"       # ffmpeg 렌더 엔진 미지원
    visual_mode: Literal["emoticon", "photo"] = "emoticon"  # photo 는 OPENAI_API_KEY 필요
    show_opening: bool = True
    show_outro: bool = False
```

`DEFAULT_VOICES`/`CTA_TEXT`/`SCRIBE_LANG` 모두 ko 단일 키만 노출 (v1.1 락). 다국어 부활은 v2 범위 — `script_engine.SYSTEM_PROMPT`, opening 템플릿, voice 매핑, multi-prompt 분기까지 함께 설계해야 함.

### 4.2 `words.json`

```json
{
  "language_code": "kor",
  "audio_duration_ms": 30000,
  "text": "...",
  "words": [
    {"text": "금일", "start": 0, "end": 320},
    {"text": "미국", "start": 330, "end": 590}
  ]
}
```

### 4.3 Remotion `props.json`

`props.json`은 job audit 폴더가 아니라 `remotion/public/jobs/<job_id>/props.json`에 staging됨.

```json
{
  "audioFileName": "jobs/sf_20260502_abc123/narration.mp3",
  "wordsFileName": "jobs/sf_20260502_abc123/words.json",
  "bgColor": "#FFFFFF",
  "chunkSize": 14,
  "emoticonCues": [],
  "captionSegments": [],
  "companyLogoCues": [],
  "numberCards": [],
  "highlightKeywords": [],
  "openingText": "26년 5월 2일\n데이브리핑",
  "openingDurationMs": 2800,
  "showOpening": true,
  "ctaText": "<CTA_TEXT[language]>",
  "showOutro": false,
  "durationInFrames": 900
}
```

### 4.4 산출물 구조

```text
output/
└── ret.mp4                         # 최종 결과물 사본 기본 경로

jobs/sf_<YYYYMMDD>_<rand>/
├── status.json                     # 상태 머신 기록
├── inputs/
│   ├── source.md                   # 원본 마크다운
│   ├── storyboard.json             # 스토리보드 입력일 때만 컷 필드 파싱 결과
│   ├── script.md                   # 최종 내레이션 대본
│   └── script.json                 # hook/body/cta/full_text/plan/opening/outro/tts metadata
├── audio/
│   └── narration.mp3               # ElevenLabs TTS 결과
├── transcripts/
│   └── words.json                  # Scribe 단어 단위 timestamp — 단일 진실원
├── edit/
│   ├── storyboard_segments.json    # 스토리보드 입력일 때만 컷↔words.json 매핑 결과
│   ├── caption_segments.json       # Remotion 자막과 visual cue boundary 공유
│   ├── company_logo_cues.json      # 회사 로고 cue가 있을 때 생성
│   ├── emoticon_cues.json          # visual_mode=emoticon 또는 photo→emoticon fallback 시 생성
│   ├── photo_cues.json             # visual_mode=photo 성공 시 생성 (segment별 prompt + 파일명 + moderation 정보)
│   ├── number_cards.json           # 숫자 cue가 있을 때 생성
│   └── final.mp4                   # audit 사본
├── logs/
│   ├── tts_input.txt               # ElevenLabs에 보낸 TTS 전용 텍스트
│   ├── scribe_raw.json
│   ├── fallback.json               # OPENAI_API_KEY 가 있는데 script_engine 이 fallback 한 경우
│   ├── photo_fallback.json         # photo 모드가 emoticon 으로 자동 fallback 된 경우 (이유 + 시각)
│   └── remotion.log                # Remotion 렌더 로그
├── thumbs/                         # 예약 디렉터리
└── qc_report.json                  # QC + 비용 추정

remotion/public/jobs/<job_id>/
├── narration.mp3
├── words.json
├── props.json
└── photos/                         # visual_mode=photo 일 때만 생성
    └── seg_NN_<sha1>.png           # 자막 segment별 1024x1536 실사 PNG (prompt SHA1 캐시 키)
```

---

## 5. 기능 상세 명세

### 5.1 [F-01/F-02] 마크다운 분석 및 한국어 대본 추출

- **모듈**: `md2short.script_engine`, fallback `md2short.script`
- OpenAI API key가 있으면 기본 `gpt-5-mini` Responses API를 호출하며, CLI `--model`로 교체할 수 있다.
- **제1원칙: 정보 보존** — system prompt는 마크다운에 적힌 모든 핵심 사실을 빠짐없이 담도록 강제한다. `target_chars`/고정 duration 강제와 overshoot fallback은 제거되었다 (정보 누락이 더 큰 손실).
- **한국어 락**: 영문 문장·한자·일본어 출력 금지. 종목·지수·약어(S&P500, AMD, AI 등)만 원문 표기 허용. `_looks_korean()` 가드(`_FOREIGN_SCRIPT_RE` + 한글 비율 0.55 임계)가 위반 시 `fallback_extract`로 강등.
- system prompt는 user markdown을 `<user_content>` 안의 데이터로만 취급하라고 명시 (인젝션 방어).
- 응답은 Structured Outputs JSON schema(`hook`, `body`, `cta`)로 강제.
- 실패하거나 `OPENAI_API_KEY`가 없으면 markdown stripping 기반 텍스트 추출 fallback.
- `### N컷` 스토리보드 입력이면 OpenAI 대본 생성을 우회하고 각 컷의 `자막`만 연결해 TTS 내레이션을 만든다. `화면 연출`은 emoticon cue 선택, `이미지 프롬프트`는 photo 모드 이미지 생성에만 사용되어 자막/내레이션에 섞이지 않는다.
- 출력: `inputs/script.md`, `inputs/script.json` (`plan.engine` ∈ {`openai`, `fallback_extract`, `storyboard`, `empty`}, `plan.fallback_reason` 으로 강등 사유 추적).

### 5.2 [F-03] 음성 생성

- **모듈**: `md2short.voice`
- ElevenLabs endpoint: `/v1/text-to-speech/{voice_id}`.
- default voice_id: `v1jVu1Ky28piIPEJqRrm`
- model: `eleven_multilingual_v2`, output_format: `mp3_44100_128`.
- 429/5xx/timeout/transport error는 `_retry.post_with_retry()`로 최대 3회 재시도.
- TTS에 보내는 텍스트는 `md2short.tts_text.prepare_tts_text()`가 생성한다. display script는 유지하고 TTS 전용 입력만 숫자·약어 발음, sentence/list punctuation pause를 보정한다.
- 출력: `audio/narration.mp3`, `logs/tts_input.txt`.

### 5.3 [F-04] 단어 단위 타임스탬프 추출

- **모듈**: `md2short.transcript`
- ElevenLabs endpoint: `/v1/speech-to-text`, model: `scribe_v1`.
- `ko` → `kor` 로 변환해 `language_code` 전달 (한국어 락).
- Scribe의 초 단위 `start`/`end`를 ms 정수로 반올림.
- raw 응답은 `logs/scribe_raw.json`에 저장.
- 출력: `transcripts/words.json`.

### 5.4 [F-05] 자막·cue plan 생성

- Remotion에 `words.json`을 그대로 전달하고, `Captions.tsx` 가 **문장 단위**로 자막을 분할 표시함. 단어 끝 구두점(`.!?。！？…`) 또는 단어 간 시간 gap≥600ms 가 boundary. 화면 배치는 최대 2줄이며, 한 문장이 길어 2줄에도 넘치면 폰트 크기를 줄임. `chunkSize` prop 은 한 문장이 비정상적으로 길 때의 max words/chunk 안전 상한(default 14, max 24).
- 자막 burn-in/overlay는 Remotion 단독 책임이다. ffmpeg caption PNG/overlay 렌더 경로는 CLI/schema/pipeline/render에서 지원하지 않는다.
- `emoticon_map.plan_cues()`가 words.json을 문장형 visual span으로 나누고 span별 keyword/fallback 기반 호랑이 cue를 생성함 (visual_mode=emoticon).
- `photo_engine.plan_photo_cues()`가 `caption_plan`의 Remotion 동일 자막 segment 분할을 사용해 segment별 1장 실사 PNG cue를 생성함 (visual_mode=photo).
- 스토리보드 입력이면 `storyboard.map_cuts_to_segments()`가 각 컷을 실제 `words.json` 문장 boundary에 snap하고, Scribe가 비율·숫자 주변에서 chunk를 추가로 쪼개도 subtitle 유사도 기반으로 다시 병합함. emoticon/photo cue와 Remotion `captionSegments`가 같은 컷 타임라인을 사용함.
- `data_extract.plan_number_cards()`가 숫자 card cue를 생성함.

### 5.5 [F-06] Remotion 렌더링 + ffmpeg/ffprobe 보조

- **모듈**: `md2short.render`
- engine은 `remotion` 단일 값이다. ffmpeg는 오디오 길이 측정·QC 같은 보조 역할에 한정하고, 자막/오버레이 합성 fallback으로 사용하지 않는다.
- 공통 pre-flight: `ffmpeg`, `ffprobe` 필수.
- Remotion pre-flight: `remotion/`, `remotion/node_modules`, `npx` 확인.
- Remotion은 audio/words를 `remotion/public/jobs/<job_id>/`에 staging하고 `props.json`을 생성함.
- render command:

```bash
npx remotion render src/index.ts TechExplainer <output_path> \
  --props=<props_path> --codec=h264 --width=1080 --height=1920 \
  --log=warn --overwrite
```

- ffmpeg 후처리가 필요해도 입력은 Remotion이 이미 자막을 픽셀에 합성한 MP4여야 하며, ffmpeg `subtitles`/caption PNG/overlay filter로 자막을 추가하지 않는다.
- 출력: `jobs/<job_id>/edit/final.mp4`, 기본 복사본 `output/ret.mp4`.

### 5.6 [F-07] 자동 QC

- **모듈**: `md2short.qc`
- `ffprobe`로 audio/final MP4 duration 측정.
- checks:
  1. `sync_last_word_vs_audio`: audio duration vs last word end, trailing silence tolerance ±1000ms
  2. `final_mp4_vs_audio`: final MP4 duration vs audio duration, tolerance ±100ms
- `duration_policy.source=tts_audio_duration`으로 실제 오디오 기반 길이 정책만 기록함.
- 비용 추정:
  - ElevenLabs TTS: chars × $0.30 / 1K chars
  - ElevenLabs STT: seconds × $0.40 / hour
  - OpenAI 텍스트 모델 비용: `qc.py`의 고정 근사 단가(`OPENAI_GPT55_*`)로 char/4 token 근사 input/output 비용 합산. 현재 `--model`별 pricing table은 없음
- 출력: `qc_report.json`.
- QC 실패 시 `qc_failed`로 종료. 자동 수정·재렌더는 roadmap 항목.

### 5.7 [F-08] 실사 비주얼 모드 (visual_mode=photo)

- **모듈**: `md2short.photo_engine`, Remotion `VisualLayer.tsx`
- **요구사항**: `OPENAI_API_KEY` 필수. 렌더 엔진은 항상 Remotion이다.
- **흐름**:
  1. `caption_plan.build_caption_line_segments()` 가 words.json 을 Remotion `Captions.tsx`와 같은 규칙(구두점·gap≥600ms·`--chunk-size` cap)으로 자막 segment 로 분할.
  2. 각 자막에서 `primary_visual_subject` / `visual_keywords`를 추출한다. 예: `트럼프가 합의를 했다` → primary subject `Donald Trump`, supporting keyword `diplomatic agreement table`.
  3. 자막 segment 텍스트와 keyword hint N개를 한 번의 OpenAI Responses 호출로 영어 image prompt N개로 일괄 변환 (`gpt-5-mini` Structured Outputs). prompt가 subject를 빠뜨리면 `_apply_keyword_focus()`가 `Primary visual subject: ...` prefix를 강제로 붙인다.
  4. 각 prompt 를 `gpt-image-2` `1024x1536` `quality=high` 로 bounded-parallel 호출, base64 응답을 `remotion/public/jobs/<id>/photos/seg_NN_<sha1>.png` 로 저장.
  5. 동일한 prompt 가 다시 등장하면 (재실행 / 같은 자막 줄 텍스트) 파일 hash 캐시로 재호출 없이 재사용.
  6. cue는 `emoticonFileName`/`startMs`/`durationMs`에 `assetKind=photo`, `visualMode=photo`, `primaryVisualSubject`, `visualKeywords`를 추가해 Remotion이 photo 전용 cover/crop 레이아웃으로 렌더.
- **안전 시스템 대응 (per-image moderation retry)**:
  - prompt LLM 의 `PROMPT_SYSTEM` 은 caption이 명시한 실명 인물/기업을 중립적 editorial subject로 사용할 수 있게 하되, 로고·텍스트·폭력·전쟁·허위 다큐식 연출은 금지한다.
  - OpenAI 가 `code=moderation_blocked` 로 거부하면 `ModerationBlockedError` 로 typed exception 을 발생시키고 caller 가 segment 단위로 재시도:
    1) 키워드 중심 원본 prompt → 차단 시
    2) `_sanitise_prompt()` 가 `_MODERATION_TRIGGERS` 사전(실명 인물/브랜드/지정학/충돌어)을 정규식으로 치환 → 차단 시
    3) `_SAFE_FALLBACK_PROMPT` (완전 추상 editorial visual, 인물 0, 텍스트 0) → 모두 실패 시
  - 3단계 모두 차단되면 `PhotoEngineError` 가 propagate 되고 `pipeline.py` 가 잡 전체를 emoticon 모드로 자동 fallback. `logs/photo_fallback.json` 에 사유 기록.
- **상태 이벤트**: `photo_generating`, `photos_generated`, `photo_fallback` 은 progress event — `validate_transition` 을 거치지 않고 `on_stage` callback 으로만 surface 됨. photo progress event는 `transcribed` 이후, `subtitled` status 기록 전에 발생할 수 있으며 정식 status 는 `transcribed → subtitled → final_rendered → qc_passed` 시퀀스를 그대로 따름.
- **비용 기록 경계**: 로컬 QC는 TTS/STT/텍스트 LLM 근사 비용만 추정한다. `gpt-image-2` 이미지 생성 비용은 가격표 기반 로컬 추정에 합산하지 않고, 실제 OpenAI 청구서를 기준으로 별도 확인한다.
- **non-deterministic**: 같은 입력에서도 이미지 결과가 달라짐. 재현성 필요 시 emoticon 모드 사용.

### 5.8 [F-09] 호랑이 캐릭터 자동 cue (visual_mode=emoticon, default)

- **모듈**: `md2short.emoticon_map`, Remotion `VisualLayer.tsx` (`Emoticons.tsx`는 legacy renderer)
- 키워드 사전: `EMOTICON_KEYWORDS`. 현재 사전/asset은 60종까지 존재함.
- planner 규칙:
  - `fill_gaps=True` 기본 경로: words.json을 문장형 visual span으로 나눠 span마다 cue 1개 생성
  - span 전체 텍스트에서 가장 구체적인 keyword match를 scoring해 선택
  - keyword가 없으면 fallback category → neutral default 순으로 deterministic image 선택
  - `fill_gaps=True`는 기본 cue 수 제한 없음 — 긴 영상도 words.json segment 끝까지 이미지/자막 boundary 생성
  - boundary-crossing keyword lookahead 2 words
  - `fill_gaps=False` sparse 경로에서는 기존 cooldown/gap/duration 규칙과 기본 max cues 24 유지
- Remotion은 safe content 영역(상단 470px, 하단 460px 제외)에 중앙 정렬하고 완만한 Ken Burns zoom을 적용함.
- 비용 0, deterministic — 같은 입력 같은 출력.

### 5.9 [F-10] 숫자 모션 그래픽

- **모듈**: `md2short.data_extract`, Remotion `NumberCard.tsx`
- 대본 원문에서 정규식으로 추출:
  - `%` / `퍼센트` / `프로`
  - `p` / `포인트`
  - `조|억|만` + `원|달러`
  - `코스피|코스닥|S&P 500|나스닥|다우|니케이|항셍` + 숫자
- char position을 audio duration에 비례 매핑.
- 기본 max 6개, cooldown 2.5초, duration 1.8초.

### 5.10 [F-11] Opening / Outro CTA 계약 동기화

- `JobConfig.show_opening`은 script generation, Remotion props, caption suppression, `OpeningBriefing` 호출을 함께 제어함. `show_outro`는 마지막 `Outro` overlay 표시 여부만 제어함.
- `show_opening=True`이면 spoken opening 문구를 TTS 대본 앞에 붙이고, `openingText`에는 2줄 opening visual 문구(`26년 M월 D일\n데이브리핑`)를 전달함. 실제 `words.json` 매칭으로 계산한 `openingDurationMs` 동안 opening visual을 표시하며, 하단 자막은 해당 구간의 단어를 caption 대상에서 제외함.
- `show_opening=False`이면 opening 문구를 대본에 붙이지 않고 Remotion caption suppression도 0ms 로 전달함.
- `show_outro=False`가 기본값이므로 마지막 2.6s full-screen `🐯 구독 + 알람` overlay는 표시하지 않음. `show_outro=True`를 명시적으로 전달한 경우에만 `Outro` overlay가 표시됨.

### 5.11 [F-12] 결과물 경로 고정 + 잡 디버깅

- `pipeline.DEFAULT_OUTPUT_COPY = output/ret.mp4`.
- `run` command의 `--output/-o`로 복사 경로 변경 가능.
- `jobs/<id>/edit/final.mp4`는 audit 사본으로 남음.
- `status` command가 `status.json` + `qc_report.json` 요약을 출력함.
- `clean` command가 오래된 job directory를 삭제하거나 dry-run으로 목록화함.

---

## 6. CLI 명세

### 6.1 단일 영상 생성

```bash
uv run md2short run <markdown_file> \
  --lang ko \
  --voice <elevenlabs_voice_id> \
  --template tech_explainer \
  --engine remotion \
  --output output/ret.mp4
```

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--lang`, `-l` | `ko` | 한국어 락 (v1.1+) |
| `--voice`, `-v` | 한국어 기본 voice | ElevenLabs voice id |
| `--speed` | `1.0` | TTS 속도 0.7~1.2 |
| `--template`, `-t` | `tech_explainer` | 인자는 받지만 실제 Remotion composition은 `TechExplainer` 1종 |
| `--chunk-size` | `14` | 자막 segment max words 안전 상한, 1~24. Remotion 엔진은 문장 단위 자동 분할이라 평소엔 작동하지 않음 |
| `--bg` | `0xFFFFFF` | Remotion 가운데 메인 섹션 background color, `#FFFFFF`로 정규화 |
| `--jobs-root` | `jobs` | job 산출물 루트 |
| `--engine` | `remotion` | 호환용 옵션. `remotion`만 허용하며 `ffmpeg` 렌더 엔진은 지원하지 않음 |
| `--visual-mode` | `emoticon` | `emoticon` (호랑이 PNG, deterministic) 또는 `photo` (gpt-image-2, OPENAI_API_KEY 필요) |
| `--model` | `gpt-5-mini` | OpenAI Responses API 대본 생성 모델 |
| `--output`, `-o` | `output/ret.mp4` | final MP4 사본 경로. 빈 문자열이면 비활성화 |

### 6.2 잡 상태 조회

```bash
uv run md2short status <job_id> --jobs-root jobs
```

`status.json` 기본 필드와, `qc_report.json`이 있으면 check별 pass/fail과 cost estimate를 출력함.

### 6.3 잡 정리

```bash
uv run md2short clean --older-than 24h
uv run md2short clean --older-than 7d --dry-run
```

`--older-than`은 초 단위 숫자 또는 `s`, `m`, `h`, `d` suffix를 지원함.

### 6.4 종료 코드

`0` 성공, `1` CLI 입력 검증 실패·필수 env 누락 등 사용자 입력 오류, `2` `run_job()` 실행 중 예외(외부 API/render/QC 등 모두 포함).

---

## 7. 품질 기준

현재 코드 레벨로 강제되는 규칙.

| 규칙 | 강제 위치 |
| --- | --- |
| language=ko 락, en/ja 거부 | `cli.py`, `schema.py` (Literal["ko"]) |
| chunk size 1~24 | `cli.py` |
| visual-mode ∈ {emoticon, photo}, photo 는 OPENAI_API_KEY 필요 | `cli.py` |
| 한국어 외 LLM 출력 금지 (`_FOREIGN_SCRIPT_RE` + 한글 비율) | `script_engine._looks_korean()` |
| 자막은 문장 boundary(구두점 또는 gap≥600ms) 기준 분할 | `Captions.tsx::chunkBySentences()` |
| acronym + 인접 숫자(`S&P500`) 한 토큰 매칭 + 한글 음역 변형 사전 + threshold 0.86 / scan 96 words | `numeric_display._ACRONYM_TOKEN_RE`, `_ACRONYM_KO_VARIANTS`, `ACRONYM_MATCH_THRESHOLD`, `ACRONYM_MAX_SCAN_WORDS` |
| photo 모드 per-image moderation retry 3단계 (원본 → sanitised → safe fallback) | `photo_engine.plan_photo_cues()` |
| 로컬 비용 QC는 TTS/STT/텍스트 LLM 근사 비용만 포함 | `qc.estimate_cost()`, `qc.run_qc()` |
| photo 모드 전체 실패 시 emoticon 모드로 자동 fallback | `pipeline.run_job()` |
| ffmpeg/ffprobe pre-flight | `render.ensure_ffmpeg_available()` |
| Remotion 렌더 의존성 pre-flight | `render.ensure_remotion_available()` |
| 상태 머신 허용 전이 (photo 진행 이벤트는 status write 안 함) | `state.validate_transition()` |
| TTS/STT/Image API retry 3회 + 0.5/1.0/2.0s backoff | `_retry.post_with_retry()` |
| 자막 timing은 `words.json` 기반 | `Captions.tsx` |
| Remotion duration은 실제 audio duration 기반 | `render.render_remotion()` |
| transcript tail ±1000ms / render-audio ±100ms QC, 길이는 TTS audio duration 기반 | `qc.run_qc()` |
| 결과물 경로 기본 `output/ret.mp4` | `pipeline.DEFAULT_OUTPUT_COPY`, `cli.py` |
