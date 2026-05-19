from __future__ import annotations

import pytest
from pydantic import ValidationError

from md2short.schema import (
    CTA_TEXT,
    DEFAULT_VOICES,
    SCRIBE_LANG,
    CaptionWord,
    JobConfig,
    VisualMode,
)


def test_job_config_defaults_match_architecture_doc():
    cfg = JobConfig()
    assert cfg.platform == "youtube_shorts"
    assert cfg.language == "ko"
    assert cfg.voice_id == "v1jVu1Ky28piIPEJqRrm"
    assert cfg.voice_speed == 1.0
    assert cfg.template_id == "tech_explainer"
    assert cfg.bg_color == "0xFFFFFF"
    assert cfg.chunk_size == 8
    assert cfg.engine == "remotion"
    assert cfg.visual_mode == VisualMode.EMOTICON
    assert cfg.show_opening is True
    assert cfg.show_outro is False


def test_korean_lock_rejects_non_ko_language():
    with pytest.raises(ValidationError):
        JobConfig(language="en")  # type: ignore[arg-type]


def test_chunk_size_bound_enforced():
    JobConfig(chunk_size=1)
    JobConfig(chunk_size=24)
    with pytest.raises(ValidationError):
        JobConfig(chunk_size=0)
    with pytest.raises(ValidationError):
        JobConfig(chunk_size=25)


def test_voice_speed_bound_enforced():
    JobConfig(voice_speed=0.7)
    JobConfig(voice_speed=1.2)
    with pytest.raises(ValidationError):
        JobConfig(voice_speed=0.5)


def test_caption_word_ms_typed_as_int():
    w = CaptionWord(text="안녕", start=0, end=320)
    assert w.start == 0
    assert w.end == 320
    with pytest.raises(ValidationError):
        CaptionWord(text="x", start=-1, end=10)


def test_korean_only_keys_exposed():
    assert set(DEFAULT_VOICES.keys()) == {"ko"}
    assert set(CTA_TEXT.keys()) == {"ko"}
    assert set(SCRIBE_LANG.keys()) == {"ko"}
    assert DEFAULT_VOICES["ko"] == "v1jVu1Ky28piIPEJqRrm"
    assert SCRIBE_LANG["ko"] == "kor"
