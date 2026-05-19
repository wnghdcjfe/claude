from __future__ import annotations

from pathlib import Path

from md2short.emoticon_map import (
    EMOTICON_KEYWORDS,
    NEUTRAL_DEFAULT_FILE,
    plan_cues,
)


def _words(*pairs):
    return [{"text": t, "start": s, "end": e} for (t, s, e) in pairs]


def test_keyword_dict_has_at_least_20_entries():
    assert len(EMOTICON_KEYWORDS) >= 20


def test_real_emoticon_dir_contains_referenced_files():
    project_root = Path(__file__).resolve().parents[1]
    emoticon_dir = project_root / "emoticon"
    assert emoticon_dir.is_dir()
    available = {p.name for p in emoticon_dir.iterdir()}
    missing = [f for f in EMOTICON_KEYWORDS.values() if f not in available]
    assert missing == [], f"keyword filenames missing from emoticon/: {missing}"


def test_plan_cues_matches_apple_keyword():
    words = _words(
        ("애플은", 0, 300),
        ("호실적으로", 320, 700),
        ("상승했습니다.", 720, 1100),
    )
    available = {"25_애플깜짝성장_실적호조.png", NEUTRAL_DEFAULT_FILE}
    cues = plan_cues(words, "/unused", available_assets=available)
    assert len(cues) == 1
    cue = cues[0]
    assert cue.emoticon_file_name == "25_애플깜짝성장_실적호조.png"
    # Either keyword wins as long as the resolved file is the Apple emoticon.
    assert cue.keywords and any(kw in {"애플", "호실적"} for kw in cue.keywords)


def test_plan_cues_neutral_fallback_when_no_keyword():
    words = _words(
        ("의자", 0, 200),
        ("책상", 220, 480),
        ("종이.", 500, 800),
    )
    available = {NEUTRAL_DEFAULT_FILE}
    cues = plan_cues(words, "/unused", available_assets=available, fill_gaps=True)
    assert len(cues) == 1
    assert cues[0].emoticon_file_name == NEUTRAL_DEFAULT_FILE


def test_plan_cues_skips_keywords_with_missing_asset():
    words = _words(("애플은", 0, 200), ("상승했습니다.", 220, 600))
    # 'asssets' deliberately exclude the apple file.
    available = {NEUTRAL_DEFAULT_FILE}
    cues = plan_cues(words, "/unused", available_assets=available)
    assert cues[0].emoticon_file_name == NEUTRAL_DEFAULT_FILE


def test_plan_cues_empty_words():
    assert plan_cues([], "/unused", available_assets={NEUTRAL_DEFAULT_FILE}) == []


def test_plan_cues_no_fill_when_disabled():
    words = _words(("의자", 0, 200), ("종이.", 220, 600))
    cues = plan_cues(
        words,
        "/unused",
        available_assets={NEUTRAL_DEFAULT_FILE},
        fill_gaps=False,
    )
    assert cues == []


def test_cue_dict_shape():
    words = _words(("AI", 0, 200), ("승인.", 220, 600))
    available = {"27_AI계약_승인.png", NEUTRAL_DEFAULT_FILE}
    cues = plan_cues(words, "/unused", available_assets=available)
    d = cues[0].to_dict()
    assert d["emoticonFileName"] == "emoticon/27_AI계약_승인.png"
    assert d["startMs"] == 0
    assert d["durationMs"] == 600
    assert d["assetKind"] == "emoticon"
    assert d["visualMode"] == "emoticon"
