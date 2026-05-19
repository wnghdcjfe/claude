"""Pydantic schemas, enums, and Korean-locked defaults for MD2Short v1.

The full rationale for these field constraints lives in `docs/architecture.md`
§1.5 (Korean lock), §4.1 (JobConfig), and `docs/voice.md` (default voice).
Multi-language and visual_mode=photo expansion is scoped to v2.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class VisualMode(str, Enum):
    """Visual rendering mode for the composition.

    - ``emoticon``: deterministic tiger PNG cues, no extra API cost.
    - ``photo``: gpt-image-2 realistic shots (requires OPENAI_API_KEY).
      MVP only wires the emoticon path; photo is scaffolded for the next slice.
    """

    EMOTICON = "emoticon"
    PHOTO = "photo"


class CaptionWord(BaseModel):
    """One word with millisecond-resolution timing from ElevenLabs Scribe.

    All timing in the pipeline derives from these values
    (``docs/architecture.md`` §1.2 single source of truth).
    """

    text: str
    start: int = Field(ge=0, description="Start timestamp in integer ms")
    end: int = Field(ge=0, description="End timestamp in integer ms")


class JobConfig(BaseModel):
    """Per-job configuration locked to Korean v1 defaults."""

    platform: Literal["youtube_shorts", "instagram_reels", "tiktok"] = "youtube_shorts"
    language: Literal["ko"] = "ko"
    voice_id: str = "v1jVu1Ky28piIPEJqRrm"
    voice_speed: float = Field(default=1.0, ge=0.7, le=1.2)
    template_id: str = "tech_explainer"
    bg_color: str = "0xFFFFFF"
    chunk_size: int = Field(default=8, ge=1, le=24)
    engine: Literal["remotion"] = "remotion"
    visual_mode: VisualMode = VisualMode.EMOTICON
    show_opening: bool = True
    show_outro: bool = False


DEFAULT_VOICES: dict[str, str] = {
    "ko": "v1jVu1Ky28piIPEJqRrm",
}

CTA_TEXT: dict[str, str] = {
    "ko": "구독과 알람 부탁드립니다!",
}

SCRIBE_LANG: dict[str, str] = {
    "ko": "kor",
}
