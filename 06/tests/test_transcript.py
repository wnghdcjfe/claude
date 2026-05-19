from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import httpx

from md2short.transcript import transcribe


def _resp(payload: dict) -> httpx.Response:
    return httpx.Response(
        status_code=200,
        content=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        request=httpx.Request("POST", "https://api.elevenlabs.io/v1/speech-to-text"),
    )


def test_seconds_normalised_to_int_ms(tmp_path: Path):
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"fake-mp3-bytes")
    payload = {
        "language_code": "kor",
        "text": "안녕하세요 세계.",
        "words": [
            {"type": "word", "text": "안녕하세요", "start": 0.0, "end": 0.512},
            {"type": "spacing", "text": " ", "start": 0.512, "end": 0.6},
            {"type": "word", "text": "세계", "start": 0.6, "end": 1.0},
        ],
    }
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _resp(payload)

    raw_dump = tmp_path / "logs" / "scribe_raw.json"
    out = transcribe(
        api_key="elevenkey",
        audio_path=audio,
        language_code="kor",
        client=client,
        raw_dump_path=raw_dump,
    )

    assert out["language_code"] == "kor"
    assert out["text"] == "안녕하세요 세계."
    assert out["words"] == [
        {"text": "안녕하세요", "start": 0, "end": 512},
        {"text": "세계", "start": 600, "end": 1000},
    ]
    # spacing entries dropped
    assert all(w["text"] != " " for w in out["words"])
    # raw response persisted
    on_disk = json.loads(raw_dump.read_text())
    assert on_disk == payload
    # audio_duration_ms inferred from last word when not provided
    assert out["audio_duration_ms"] == 1000


def test_uses_supplied_audio_duration(tmp_path: Path):
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"x")
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _resp(
        {
            "language_code": "kor",
            "text": "한 단어",
            "words": [{"type": "word", "text": "한", "start": 0.0, "end": 0.1}],
        },
    )
    out = transcribe(
        api_key="k",
        audio_path=audio,
        client=client,
        audio_duration_ms=2500,
    )
    assert out["audio_duration_ms"] == 2500
