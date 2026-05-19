"""Job orchestration — directory setup, status transitions, stage callbacks.

Stage implementations (script, voice, transcript, planner, render, qc) land
in US-004 through US-009. This module exposes the seam they wire into so the
CLI keeps a stable interface from US-003 onwards.
"""

from __future__ import annotations

import json
import os
import secrets
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from .caption_plan import build_caption_segments_from_script, segments_to_jsonable
from .emoticon_map import cues_to_jsonable, plan_cues
from .opening import compose_opening
from .qc import run_qc, write_qc_report
from .render import (
    get_audio_duration_ms,
    render_remotion,
    stage_assets,
    trim_silence,
    write_props,
)
from .schema import CTA_TEXT, JobConfig
from .script_engine import SYSTEM_PROMPT, generate_script
from .state import JobStatus, write_status
from .transcript import transcribe
from .tts_text import prepare_tts_text
from .voice import synthesize

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EMOTICON_DIR = PROJECT_ROOT / "emoticon"

DEFAULT_OUTPUT_COPY = Path("output/ret.mp4")

# Words the Remotion ``Captions`` overlay paints yellow + bigger for visual
# accent. The list deliberately stays short so the eye still has somewhere
# to rest; Captions.tsx highlights at most one word per chunk.
DEFAULT_HIGHLIGHT_KEYWORDS: tuple[str, ...] = (
    "사상", "최고치", "최저치",
    "급등", "급락", "폭등", "폭락",
    "상승", "하락",
    "랠리", "신호", "합류",
    "기록", "진입",
    "%",
)

_JOB_SUBDIRS = ("inputs", "audio", "transcripts", "edit", "logs", "thumbs")


@dataclass
class JobPaths:
    """Resolved on-disk locations for one job."""

    job_id: str
    root: Path
    inputs: Path
    audio: Path
    transcripts: Path
    edit: Path
    logs: Path
    thumbs: Path

    @property
    def status_file(self) -> Path:
        return self.root / "status.json"


@dataclass
class JobResult:
    job_id: str
    paths: JobPaths
    final_status: JobStatus
    qc_report_path: Path | None = None
    output_mp4_path: Path | None = None
    extras: dict[str, object] = field(default_factory=dict)


def _generate_job_id(now: datetime | None = None) -> str:
    moment = now or datetime.now()
    return f"sf_{moment.strftime('%Y%m%d')}_{secrets.token_hex(3)}"


def _prepare_job_dir(job_id: str, jobs_root: Path) -> JobPaths:
    root = jobs_root / job_id
    root.mkdir(parents=True, exist_ok=True)
    subpaths = {name: (root / name) for name in _JOB_SUBDIRS}
    for path in subpaths.values():
        path.mkdir(parents=True, exist_ok=True)
    return JobPaths(job_id=job_id, root=root, **subpaths)


def run_job(
    markdown_path: Path | str,
    config: JobConfig,
    *,
    jobs_root: Path | str = "jobs",
    output_path: Path | str | None = None,
    on_stage: Callable[[str, dict[str, object]], None] | None = None,
) -> JobResult:
    """Run the full pipeline for one markdown input.

    Stage callbacks are emitted via ``on_stage(event_name, payload)``. The
    skeleton (US-003) only performs scaffold work — directory layout, source
    copy, and the initial ``status.json = created`` write. Later user stories
    extend this function with script / voice / transcript / planner / render /
    qc stages, each guarded by ``validate_transition`` and recorded under
    ``logs/``.
    """

    md_path = Path(markdown_path).resolve()
    if not md_path.is_file():
        raise FileNotFoundError(f"markdown input not found: {md_path}")

    jobs_root_path = Path(jobs_root)
    job_id = _generate_job_id()
    paths = _prepare_job_dir(job_id, jobs_root_path)

    shutil.copy2(md_path, paths.inputs / "source.md")
    source_markdown = md_path.read_text(encoding="utf-8")

    write_status(
        paths.root,
        JobStatus.CREATED,
        job_id=job_id,
        markdown_input=str(md_path),
        config=config.model_dump(mode="json"),
    )
    if on_stage:
        on_stage("job_created", {"job_id": job_id, "root": str(paths.root)})

    # Stage 1: Korean script generation (OpenAI → fallback_extract chain).
    script = _run_script_stage(
        source_markdown,
        config=config,
        paths=paths,
        model=config_to_model(config),
    )
    write_status(
        paths.root,
        JobStatus.SCRIPT_GENERATED,
        job_id=job_id,
        previous=JobStatus.CREATED,
        script_chars=len(script["full_text"]),
        script_engine=script["plan"]["engine"],
    )
    if on_stage:
        on_stage(
            "script_generated",
            {"engine": script["plan"]["engine"], "chars": len(script["full_text"])},
        )

    if not script["full_text"]:
        raise RuntimeError("Script stage produced empty full_text; cannot continue")

    # Stage 2: TTS narration.
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not elevenlabs_key:
        raise RuntimeError("ELEVENLABS_API_KEY missing — required for TTS stage")
    narration_path = _run_voice_stage(
        script_text=script["full_text"],
        config=config,
        paths=paths,
        api_key=elevenlabs_key,
    )
    audio_duration_ms = get_audio_duration_ms(narration_path)
    write_status(
        paths.root,
        JobStatus.VOICE_GENERATED,
        job_id=job_id,
        previous=JobStatus.SCRIPT_GENERATED,
        audio_duration_ms=audio_duration_ms,
        narration_path=str(narration_path.relative_to(paths.root)),
    )
    if on_stage:
        on_stage(
            "voice_generated",
            {"audio_duration_ms": audio_duration_ms, "path": str(narration_path)},
        )

    # Stage 3: Scribe transcript with ms-resolution word timing.
    words_doc = _run_transcript_stage(
        narration_path=narration_path,
        config=config,
        paths=paths,
        api_key=elevenlabs_key,
        audio_duration_ms=audio_duration_ms,
    )
    write_status(
        paths.root,
        JobStatus.TRANSCRIBED,
        job_id=job_id,
        previous=JobStatus.VOICE_GENERATED,
        word_count=len(words_doc["words"]),
    )
    if on_stage:
        on_stage(
            "transcribed",
            {
                "word_count": len(words_doc["words"]),
                "audio_duration_ms": words_doc["audio_duration_ms"],
            },
        )

    # Stage 4: caption + emoticon cue planner.
    segments, cues = _run_planner_stage(
        words=words_doc["words"],
        script_text=script["full_text"],
        config=config,
        paths=paths,
        audio_duration_ms=int(words_doc.get("audio_duration_ms", 0) or 0),
    )
    write_status(
        paths.root,
        JobStatus.SUBTITLED,
        job_id=job_id,
        previous=JobStatus.TRANSCRIBED,
        segment_count=len(segments),
        cue_count=len(cues),
    )
    if on_stage:
        on_stage(
            "subtitled",
            {"segments": len(segments), "cues": len(cues)},
        )

    # Stage 5+6: Remotion staging + render.
    final_mp4 = _run_render_stage(
        job_id=job_id,
        config=config,
        paths=paths,
        words_doc=words_doc,
        caption_segments_jsonable=segments_to_jsonable(segments),
        emoticon_cues_jsonable=cues_to_jsonable(cues),
        script=script,
    )
    write_status(
        paths.root,
        JobStatus.FINAL_RENDERED,
        job_id=job_id,
        previous=JobStatus.SUBTITLED,
        final_mp4=str(final_mp4.relative_to(paths.root)),
    )
    if on_stage:
        on_stage("final_rendered", {"final_mp4": str(final_mp4)})

    # Stage 7: optional output copy.
    delivered_path: Path | None = None
    if output_path:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(final_mp4, out)
        delivered_path = out

    # Stage 8: QC + cost estimate.
    qc_input_chars = (
        len(source_markdown) + len(SYSTEM_PROMPT)
        if script["plan"]["engine"] == "openai"
        else 0
    )
    qc_output_chars = (
        len(script["full_text"]) if script["plan"]["engine"] == "openai" else 0
    )
    qc_result = run_qc(
        audio_path=paths.audio / "narration.mp3",
        final_mp4_path=final_mp4,
        words_doc=words_doc,
        tts_chars=len(prepare_tts_text(script["full_text"])),
        openai_input_chars=qc_input_chars,
        openai_output_chars=qc_output_chars,
    )
    qc_report_path = paths.root / "qc_report.json"
    write_qc_report(qc_report_path, qc_result)

    terminal_status = JobStatus.QC_PASSED if qc_result.passed else JobStatus.QC_FAILED
    write_status(
        paths.root,
        terminal_status,
        job_id=job_id,
        previous=JobStatus.FINAL_RENDERED,
        qc_passed=qc_result.passed,
        qc_report="qc_report.json",
    )
    if on_stage:
        on_stage(
            "qc_complete",
            {"passed": qc_result.passed, "report": str(qc_report_path)},
        )

    return JobResult(
        job_id=job_id,
        paths=paths,
        final_status=terminal_status,
        qc_report_path=qc_report_path,
        output_mp4_path=delivered_path,
        extras={
            "script_engine": script["plan"]["engine"],
            "audio_duration_ms": words_doc["audio_duration_ms"],
            "word_count": len(words_doc["words"]),
            "segment_count": len(segments),
            "cue_count": len(cues),
            "final_mp4": str(final_mp4),
            "qc_passed": qc_result.passed,
        },
    )


def config_to_model(config: JobConfig) -> str:
    """Return the OpenAI script-engine model name for this config.

    Currently fixed to ``gpt-5-mini``; CLI ``--model`` override surfaces here
    once the pipeline accepts a model argument (US-005+).
    """

    # NB: the CLI passes ``--model`` through but US-004 keeps the default until
    # the rest of the pipeline can exercise alternatives end-to-end.
    return "gpt-5-mini"


def _run_script_stage(
    source_markdown: str,
    *,
    config: JobConfig,
    paths: JobPaths,
    model: str,
) -> dict[str, Any]:
    opening = compose_opening(datetime.now()) if config.show_opening else None
    script = generate_script(source_markdown, model=model)

    if script["plan"]["fallback_reason"]:
        (paths.logs / "fallback.json").write_text(
            json.dumps(
                {
                    "stage": "script",
                    "engine": script["plan"]["engine"],
                    "fallback_reason": script["plan"]["fallback_reason"],
                    "model": script["plan"]["model"],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    if opening is not None and script["full_text"]:
        script["opening"] = {"spoken": opening.spoken, "visual": opening.visual}
        script["full_text"] = f"{opening.spoken}\n\n{script['full_text']}"
    elif opening is not None:
        script["opening"] = {"spoken": opening.spoken, "visual": opening.visual}
        script["full_text"] = opening.spoken
    else:
        script["opening"] = None

    script["outro"] = None  # show_outro=False per JobConfig default

    (paths.inputs / "script.md").write_text(
        script["full_text"], encoding="utf-8",
    )
    (paths.inputs / "script.json").write_text(
        json.dumps(script, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return script


def _run_voice_stage(
    *,
    script_text: str,
    config: JobConfig,
    paths: JobPaths,
    api_key: str,
) -> Path:
    tts_text = prepare_tts_text(script_text)
    (paths.logs / "tts_input.txt").write_text(tts_text, encoding="utf-8")
    raw_output = paths.audio / "narration_raw.mp3"
    synthesize(
        api_key=api_key,
        voice_id=config.voice_id,
        text=tts_text,
        output_path=raw_output,
        speed=config.voice_speed,
    )
    # Clamp long inter-sentence silences so the visual layer never has to
    # paper over multi-second dead air. The trimmed file is what Scribe
    # transcribes and what Remotion ultimately mixes — narration.mp3 is the
    # single source of truth from this point on.
    trimmed_output = paths.audio / "narration.mp3"
    trim_silence(raw_output, trimmed_output)
    return trimmed_output


def _run_transcript_stage(
    *,
    narration_path: Path,
    config: JobConfig,
    paths: JobPaths,
    api_key: str,
    audio_duration_ms: int,
) -> dict[str, Any]:
    raw_dump = paths.logs / "scribe_raw.json"
    words_doc = transcribe(
        api_key=api_key,
        audio_path=narration_path,
        language_code="kor" if config.language == "ko" else config.language,
        audio_duration_ms=audio_duration_ms,
        raw_dump_path=raw_dump,
    )

    (paths.transcripts / "words.json").write_text(
        json.dumps(words_doc, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return words_doc


def _run_planner_stage(
    *,
    words: list[dict[str, Any]],
    script_text: str,
    config: JobConfig,
    paths: JobPaths,
    emoticon_dir: Path | str = DEFAULT_EMOTICON_DIR,
    audio_duration_ms: int | None = None,
) -> tuple[list, list]:
    segments = build_caption_segments_from_script(script_text, words)
    cues = plan_cues(
        words,
        emoticon_dir,
        fill_gaps=True,
        audio_duration_ms=audio_duration_ms,
    )

    (paths.edit / "caption_segments.json").write_text(
        json.dumps(segments_to_jsonable(segments), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (paths.edit / "emoticon_cues.json").write_text(
        json.dumps(cues_to_jsonable(cues), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return segments, cues


def _run_render_stage(
    *,
    job_id: str,
    config: JobConfig,
    paths: JobPaths,
    words_doc: dict[str, Any],
    caption_segments_jsonable: list[dict[str, Any]],
    emoticon_cues_jsonable: list[dict[str, Any]],
    script: dict[str, Any],
) -> Path:
    narration_path = paths.audio / "narration.mp3"
    words_path = paths.transcripts / "words.json"

    public_job_dir = stage_assets(
        job_id=job_id,
        narration_path=narration_path,
        words_doc_path=words_path,
    )

    opening_block = script.get("opening") or {}
    opening_visual = (opening_block or {}).get("visual", "") if isinstance(opening_block, dict) else ""
    opening_spoken = (opening_block or {}).get("spoken", "") if isinstance(opening_block, dict) else ""

    props_path = write_props(
        job_id=job_id,
        config_dump=config.model_dump(mode="json"),
        caption_segments=caption_segments_jsonable,
        emoticon_cues=emoticon_cues_jsonable,
        audio_duration_ms=int(words_doc.get("audio_duration_ms", 0)),
        opening_text=opening_visual or opening_spoken,
        opening_visual=opening_visual,
        show_opening=config.show_opening,
        show_outro=config.show_outro,
        cta_text=CTA_TEXT.get(config.language, ""),
        highlight_keywords=list(DEFAULT_HIGHLIGHT_KEYWORDS),
        words=words_doc.get("words"),
        public_job_dir=public_job_dir,
    )

    final_mp4 = paths.edit / "final.mp4"
    render_remotion(
        job_id=job_id,
        props_path=props_path,
        output_path=final_mp4,
        log_path=paths.logs / "remotion.log",
    )
    return final_mp4
