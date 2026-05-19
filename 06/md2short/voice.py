"""ElevenLabs text-to-speech client."""

from __future__ import annotations

from pathlib import Path
from typing import Final

import httpx

from ._retry import post_with_retry

ELEVENLABS_BASE_URL: Final[str] = "https://api.elevenlabs.io"
DEFAULT_MODEL_ID: Final[str] = "eleven_multilingual_v2"
DEFAULT_OUTPUT_FORMAT: Final[str] = "mp3_44100_128"


def synthesize(
    *,
    api_key: str,
    voice_id: str,
    text: str,
    output_path: Path | str,
    speed: float = 1.0,
    model_id: str = DEFAULT_MODEL_ID,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
    client: httpx.Client | None = None,
    timeout: float = 180.0,
) -> Path:
    """Call ElevenLabs TTS and write the audio bytes to ``output_path``.

    Retries via ``_retry.post_with_retry`` on 429 / 5xx / transport errors.
    The returned path is the resolved ``Path`` for caller convenience.
    """

    url = f"{ELEVENLABS_BASE_URL}/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "output_format": output_format,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": speed,
        },
    }

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if client is None:
        with httpx.Client(timeout=timeout) as owned:
            response = post_with_retry(owned, url, headers=headers, json=payload)
    else:
        response = post_with_retry(client, url, headers=headers, json=payload)
    response.raise_for_status()
    out_path.write_bytes(response.content)
    return out_path
