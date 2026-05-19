"""Smoke-test the CLI skeleton — argument validation, .env handling, job dir creation."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from md2short.cli import app


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


@pytest.fixture
def sample_md(tmp_path: Path) -> Path:
    p = tmp_path / "sample.md"
    p.write_text("간단한 한국어 본문입니다.", encoding="utf-8")
    return p


def test_help_exits_zero(runner: CliRunner):
    result = runner.invoke(app, ["run", "--help"])
    assert result.exit_code == 0
    assert "Korean markdown input" in result.stdout
    for flag in [
        "--lang",
        "--voice",
        "--speed",
        "--template",
        "--chunk-size",
        "--bg",
        "--jobs-root",
        "--engine",
        "--visual-mode",
        "--model",
        "--output",
    ]:
        assert flag in result.stdout


def test_rejects_non_ko_language(runner: CliRunner, sample_md: Path, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    result = runner.invoke(app, ["run", str(sample_md), "--lang", "en"])
    assert result.exit_code == 1
    assert "ko" in result.stderr.lower() or "ko" in result.stdout.lower()


def test_rejects_chunk_size_out_of_bounds(runner: CliRunner, sample_md: Path, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    result = runner.invoke(app, ["run", str(sample_md), "--chunk-size", "25"])
    assert result.exit_code == 1


def test_rejects_bad_visual_mode(runner: CliRunner, sample_md: Path, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    result = runner.invoke(app, ["run", str(sample_md), "--visual-mode", "video"])
    assert result.exit_code == 1


def test_missing_elevenlabs_key_exits_one(runner: CliRunner, sample_md: Path, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.setenv("MD2SHORT_SKIP_DOTENV", "1")
    result = runner.invoke(app, ["run", str(sample_md)])
    assert result.exit_code == 1
    assert "ELEVENLABS_API_KEY" in (result.stderr or result.stdout)


def test_creates_job_directory_tree(runner: CliRunner, sample_md: Path, tmp_path: Path, monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "k")
    monkeypatch.setenv("MD2SHORT_SKIP_DOTENV", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    # Stub the external audio + STT calls so the pipeline can advance through
    # voice_generated and transcribed without hitting live ElevenLabs.
    from md2short import pipeline as pipeline_mod

    def _fake_synthesize(*, output_path, **kwargs):
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        # Minimal silent MP3 frame so ffprobe can read a non-zero duration.
        # 1 frame of MPEG-1 Layer 3, 44.1kHz, 128kbps padded with zeros.
        out.write_bytes(b"\xff\xfb\x90\x00" + b"\x00" * 416)
        return out

    def _fake_transcribe(*, audio_path, raw_dump_path=None, audio_duration_ms=None, **kwargs):
        if raw_dump_path is not None:
            Path(raw_dump_path).parent.mkdir(parents=True, exist_ok=True)
            Path(raw_dump_path).write_text("{}", encoding="utf-8")
        return {
            "language_code": "kor",
            "audio_duration_ms": audio_duration_ms or 1000,
            "text": "샘플 한국어 텍스트.",
            "words": [
                {"text": "샘플", "start": 0, "end": 200},
                {"text": "한국어", "start": 220, "end": 540},
                {"text": "텍스트", "start": 560, "end": 800},
            ],
        }

    def _fake_trim_silence(src_path, dst_path, **kwargs):
        # Production trim re-encodes via ffmpeg; the stub MP3 frame is too
        # short for ffmpeg to parse, so just copy the bytes over instead.
        from shutil import copy2

        Path(dst_path).parent.mkdir(parents=True, exist_ok=True)
        copy2(src_path, dst_path)
        return Path(dst_path)

    monkeypatch.setattr(pipeline_mod, "synthesize", _fake_synthesize)
    monkeypatch.setattr(pipeline_mod, "trim_silence", _fake_trim_silence)
    monkeypatch.setattr(pipeline_mod, "transcribe", _fake_transcribe)
    monkeypatch.setattr(pipeline_mod, "get_audio_duration_ms", lambda _: 1000)

    # Stub the render bridge so the integration test never spawns the
    # ~30-second Remotion bundle. The render contract is exercised live by
    # `uv run md2short run sample.md` (US-009 end-to-end).
    def _fake_stage_assets(*, job_id, narration_path, words_doc_path):
        target = tmp_path / "remotion-public" / "jobs" / job_id
        target.mkdir(parents=True, exist_ok=True)
        return target

    def _fake_write_props(*, public_job_dir, **kwargs):
        props_path = public_job_dir / "props.json"
        props_path.write_text("{}", encoding="utf-8")
        return props_path

    def _fake_render_remotion(*, output_path, log_path, **kwargs):
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_bytes(b"\x00" * 64)  # placeholder mp4 bytes
        Path(log_path).parent.mkdir(parents=True, exist_ok=True)
        Path(log_path).write_text("stub render", encoding="utf-8")
        return Path(output_path)

    monkeypatch.setattr(pipeline_mod, "stage_assets", _fake_stage_assets)
    monkeypatch.setattr(pipeline_mod, "write_props", _fake_write_props)
    monkeypatch.setattr(pipeline_mod, "render_remotion", _fake_render_remotion)

    # qc.run_qc internally calls get_audio_duration_ms on the audio + mp4
    # files; with stub bytes ffprobe would fail. Patch the qc-side import.
    from md2short import qc as qc_mod

    monkeypatch.setattr(qc_mod, "get_audio_duration_ms", lambda _: 1000)

    jobs_root = tmp_path / "jobs"
    result = runner.invoke(
        app,
        [
            "run",
            str(sample_md),
            "--jobs-root",
            str(jobs_root),
            "--output",
            "",
        ],
    )
    assert result.exit_code == 0, result.stdout + result.stderr
    job_dirs = list(jobs_root.glob("sf_*_*"))
    assert len(job_dirs) == 1
    job_dir = job_dirs[0]
    for sub in ("inputs", "audio", "transcripts", "edit", "logs", "thumbs"):
        assert (job_dir / sub).is_dir(), f"missing subdir {sub}"

    status = json.loads((job_dir / "status.json").read_text())
    assert status["status"] == "qc_passed"
    assert status["job_id"] == job_dir.name
    assert status["script_engine"] == "fallback_extract"
    assert status["audio_duration_ms"] > 0
    assert status["word_count"] == 3
    assert status["segment_count"] >= 1
    assert status["cue_count"] >= 1
    assert status["final_mp4"] == "edit/final.mp4"
    assert status["qc_passed"] is True
    assert status["qc_report"] == "qc_report.json"

    assert (job_dir / "inputs" / "source.md").read_text(encoding="utf-8") == sample_md.read_text(
        encoding="utf-8",
    )
    script_json = json.loads((job_dir / "inputs" / "script.json").read_text(encoding="utf-8"))
    assert script_json["plan"]["engine"] == "fallback_extract"
    assert script_json["plan"]["fallback_reason"] == "OPENAI_API_KEY_missing"

    # Voice stage artefacts
    assert (job_dir / "audio" / "narration.mp3").exists()
    tts_input = (job_dir / "logs" / "tts_input.txt").read_text(encoding="utf-8")
    assert tts_input  # non-empty
    # numbers spelled out (e.g. 3.2% → digits separated for the TTS input)
    assert "S&P" not in tts_input

    # Transcript stage artefacts
    words_doc = json.loads((job_dir / "transcripts" / "words.json").read_text(encoding="utf-8"))
    assert words_doc["language_code"] == "kor"
    assert words_doc["audio_duration_ms"] > 0
    assert len(words_doc["words"]) == 3
    assert (job_dir / "logs" / "scribe_raw.json").exists()
    assert (job_dir / "logs" / "fallback.json").exists()

    # Planner stage artefacts
    segments = json.loads((job_dir / "edit" / "caption_segments.json").read_text(encoding="utf-8"))
    assert isinstance(segments, list) and len(segments) >= 1
    cues = json.loads((job_dir / "edit" / "emoticon_cues.json").read_text(encoding="utf-8"))
    assert isinstance(cues, list) and len(cues) >= 1
    for cue in cues:
        assert cue["emoticonFileName"].startswith("emoticon/")
        assert cue["assetKind"] == "emoticon"
        assert cue["visualMode"] == "emoticon"

    # Render stage artefacts
    assert (job_dir / "edit" / "final.mp4").exists()
    assert (job_dir / "logs" / "remotion.log").exists()

    # QC stage artefacts
    qc_report = json.loads((job_dir / "qc_report.json").read_text(encoding="utf-8"))
    assert qc_report["passed"] is True
    check_names = {c["name"] for c in qc_report["checks"]}
    assert check_names == {"sync_last_word_vs_audio", "final_mp4_vs_audio"}
    assert all(c["pass"] for c in qc_report["checks"])
    assert qc_report["duration_policy"]["source"] == "tts_audio_duration"


def test_no_ffmpeg_subtitles_filter_in_pipeline():
    """AGENTS.md §3.4: captions live in Remotion pixels, not ffmpeg overlays."""

    import subprocess
    from pathlib import Path

    md2short_dir = Path(__file__).resolve().parents[1] / "md2short"
    for needle in ("subtitles=", '"subtitles"'):
        result = subprocess.run(
            ["grep", "-rn", needle, str(md2short_dir)],
            capture_output=True,
            text=True,
        )
        # grep exits 1 when no match (good); exit 0 when a match is found (bad).
        assert result.returncode == 1, (
            f"Forbidden ffmpeg captions filter found ({needle}):\n{result.stdout}"
        )
