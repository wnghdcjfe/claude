from __future__ import annotations

import json
from pathlib import Path

import pytest

from md2short import qc as qc_mod
from md2short.qc import (
    FINAL_VS_AUDIO_TOLERANCE_MS,
    LAST_WORD_TAIL_TOLERANCE_MS,
    estimate_cost,
    run_qc,
    write_qc_report,
)


@pytest.fixture
def fake_durations(monkeypatch):
    """Replace ffprobe duration measurement with deterministic values."""

    durations: dict[str, int] = {}

    def _fake(path):
        path_str = str(path)
        return durations[path_str]

    monkeypatch.setattr(qc_mod, "get_audio_duration_ms", _fake)
    return durations


def test_estimate_cost_breakdown():
    cost = estimate_cost(
        tts_chars=500,
        audio_seconds=30.0,
        openai_input_chars=2000,
        openai_output_chars=600,
    )
    assert cost.tts_usd == pytest.approx(500 / 1000 * 0.30)
    assert cost.stt_usd == pytest.approx(30 / 3600 * 0.40)
    expected_openai = (
        (2000 / 4) * 0.25 / 1_000_000 + (600 / 4) * 2.00 / 1_000_000
    )
    assert cost.openai_text_usd == pytest.approx(expected_openai)
    assert cost.total_usd == pytest.approx(
        cost.tts_usd + cost.stt_usd + cost.openai_text_usd,
    )
    assert cost.detail["tts_chars"] == 500
    assert cost.detail["audio_seconds"] == 30.0


def test_run_qc_passes_when_in_tolerance(tmp_path: Path, fake_durations):
    audio = tmp_path / "a.mp3"
    final = tmp_path / "f.mp4"
    audio.write_bytes(b"x")
    final.write_bytes(b"y")
    fake_durations[str(audio)] = 30_000
    fake_durations[str(final)] = 30_050  # within ±100ms

    words_doc = {
        "audio_duration_ms": 30_000,
        "words": [
            {"text": "안녕", "start": 0, "end": 200},
            {"text": "끝.", "start": 29_400, "end": 29_700},  # within ±1000ms
        ],
    }
    result = run_qc(
        audio_path=audio,
        final_mp4_path=final,
        words_doc=words_doc,
        tts_chars=400,
        openai_input_chars=1000,
        openai_output_chars=300,
    )
    assert result.passed is True
    names = [c.name for c in result.checks]
    assert names == ["sync_last_word_vs_audio", "final_mp4_vs_audio"]
    assert all(c.pass_ for c in result.checks)
    assert result.duration_policy["source"] == "tts_audio_duration"
    assert result.duration_policy["audio_duration_ms"] == 30_000
    assert result.duration_policy["final_mp4_duration_ms"] == 30_050
    assert result.duration_policy["last_word_end_ms"] == 29_700


def test_run_qc_fails_when_final_mp4_out_of_tolerance(tmp_path: Path, fake_durations):
    audio = tmp_path / "a.mp3"
    final = tmp_path / "f.mp4"
    audio.write_bytes(b"x")
    final.write_bytes(b"y")
    fake_durations[str(audio)] = 30_000
    fake_durations[str(final)] = 30_500  # 500ms off — fails ±100ms

    result = run_qc(
        audio_path=audio,
        final_mp4_path=final,
        words_doc={"words": [{"text": "끝.", "start": 0, "end": 29_900}]},
        tts_chars=0,
        openai_input_chars=0,
        openai_output_chars=0,
    )
    assert result.passed is False
    final_check = next(c for c in result.checks if c.name == "final_mp4_vs_audio")
    assert final_check.pass_ is False
    assert final_check.tolerance_ms == FINAL_VS_AUDIO_TOLERANCE_MS


def test_run_qc_fails_when_last_word_tail_too_long(tmp_path: Path, fake_durations):
    audio = tmp_path / "a.mp3"
    final = tmp_path / "f.mp4"
    audio.write_bytes(b"x")
    final.write_bytes(b"y")
    fake_durations[str(audio)] = 30_000
    fake_durations[str(final)] = 30_010
    # last word ends 1500ms before audio ends — outside ±1000ms tolerance.
    words_doc = {"words": [{"text": "끝.", "start": 0, "end": 28_500}]}

    result = run_qc(
        audio_path=audio,
        final_mp4_path=final,
        words_doc=words_doc,
        tts_chars=0,
        openai_input_chars=0,
        openai_output_chars=0,
    )
    tail_check = next(c for c in result.checks if c.name == "sync_last_word_vs_audio")
    assert tail_check.pass_ is False
    assert tail_check.tolerance_ms == LAST_WORD_TAIL_TOLERANCE_MS
    assert result.passed is False


def test_write_qc_report_round_trips(tmp_path: Path, fake_durations):
    audio = tmp_path / "a.mp3"
    final = tmp_path / "f.mp4"
    audio.write_bytes(b"x")
    final.write_bytes(b"y")
    fake_durations[str(audio)] = 1000
    fake_durations[str(final)] = 1000
    result = run_qc(
        audio_path=audio,
        final_mp4_path=final,
        words_doc={"words": [{"text": "끝.", "start": 0, "end": 1000}]},
        tts_chars=100,
        openai_input_chars=100,
        openai_output_chars=100,
    )
    report_path = tmp_path / "qc_report.json"
    write_qc_report(report_path, result)
    on_disk = json.loads(report_path.read_text(encoding="utf-8"))
    assert on_disk["passed"] is True
    assert {c["name"] for c in on_disk["checks"]} == {
        "sync_last_word_vs_audio",
        "final_mp4_vs_audio",
    }
    assert on_disk["cost_estimate"]["total_usd"] > 0
