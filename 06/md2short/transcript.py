"""ElevenLabs Scribe (speech-to-text) client with ms-normalised output."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Final

import httpx

from ._retry import post_with_retry

SCRIBE_URL: Final[str] = "https://api.elevenlabs.io/v1/speech-to-text"
DEFAULT_MODEL_ID: Final[str] = "scribe_v1"


def _seconds_to_ms(value: float | int | None) -> int:
    if value is None:
        return 0
    return int(round(float(value) * 1000.0))


def _normalise_words(raw_words: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only ``type=='word'`` items and round timing to integer ms."""

    normalised: list[dict[str, Any]] = []
    for entry in raw_words or []:
        kind = entry.get("type", "word")
        if kind != "word":
            continue
        normalised.append(
            {
                "text": entry.get("text", ""),
                "start": _seconds_to_ms(entry.get("start")),
                "end": _seconds_to_ms(entry.get("end")),
            },
        )
    return normalised


def transcribe(
    *,
    api_key: str,
    audio_path: Path | str,
    language_code: str = "kor",
    model_id: str = DEFAULT_MODEL_ID,
    audio_duration_ms: int | None = None,
    raw_dump_path: Path | str | None = None,
    client: httpx.Client | None = None,
    timeout: float = 240.0,
) -> dict[str, Any]:
    """Run Scribe over ``audio_path`` and return a words.json-shaped dict.

    ``audio_duration_ms`` may be supplied by the caller (``render.get_audio_duration_ms``);
    otherwise the value defaults to the last word's end time when available.
    """

    audio_file_path = Path(audio_path)
    raw_path = Path(raw_dump_path) if raw_dump_path else None

    headers = {"xi-api-key": api_key}
    data = {
        "model_id": model_id,
        "language_code": language_code,
    }

    with open(audio_file_path, "rb") as audio_file:
        files = {"file": (audio_file_path.name, audio_file, "audio/mpeg")}
        if client is None:
            with httpx.Client(timeout=timeout) as owned:
                response = post_with_retry(
                    owned, SCRIBE_URL, headers=headers, data=data, files=files,
                )
        else:
            response = post_with_retry(
                client, SCRIBE_URL, headers=headers, data=data, files=files,
            )
    response.raise_for_status()
    raw = response.json()

    if raw_path is not None:
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(
            json.dumps(raw, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    words = _normalise_words(raw.get("words", []) or [])
    final_duration = audio_duration_ms
    if final_duration is None and words:
        final_duration = words[-1]["end"]

    return {
        "language_code": raw.get("language_code", language_code),
        "audio_duration_ms": final_duration or 0,
        "text": raw.get("text", ""),
        "words": words,
    }
