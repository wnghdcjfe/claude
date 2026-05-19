"""Spoken + visual opening line composition (Korean v1)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class OpeningSpec:
    """Two views of the opening line.

    ``spoken``  → prepended to the TTS narration so the audio actually
                  announces the date.
    ``visual``  → the two-line text shown by ``OpeningBriefing.tsx``.
    """

    spoken: str
    visual: str


def compose_opening(date: datetime, *, language: str = "ko") -> OpeningSpec:
    if language != "ko":
        raise ValueError(f"language must be 'ko' (got: {language})")
    visual = f"{date.month}월 {date.day}일\n데이브리핑"
    spoken = f"{date.month}월 {date.day}일 데이브리핑입니다."
    return OpeningSpec(spoken=spoken, visual=visual)
