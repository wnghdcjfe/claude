from __future__ import annotations

from md2short.caption_plan import (
    HIGHLIGHT_COLOR_DOWN,
    HIGHLIGHT_COLOR_NEUTRAL,
    HIGHLIGHT_COLOR_UP,
    build_caption_line_segments,
    build_caption_segments_from_script,
)


def _words(*pairs):
    return [{"text": t, "start": s, "end": e} for (t, s, e) in pairs]


def test_terminal_punctuation_closes_segment():
    words = _words(
        ("지난", 0, 200),
        ("금요일", 220, 480),
        ("상승했습니다.", 500, 900),
        ("S&P", 950, 1100),
        ("500", 1110, 1300),
        ("기록.", 1320, 1600),
    )
    segs = build_caption_line_segments(words, chunk_size=14)
    assert len(segs) == 2
    assert segs[0].text.endswith("상승했습니다.")
    assert segs[0].start_ms == 0
    assert segs[0].end_ms == 900
    assert segs[1].text.endswith("기록.")


def test_long_gap_closes_segment():
    # Gap of 700ms between word2 and word3 — triggers boundary.
    words = _words(
        ("애플", 0, 200),
        ("호실적", 220, 480),
        ("샌디스크", 1180, 1400),
        ("급등", 1420, 1600),
    )
    segs = build_caption_line_segments(words)
    assert len(segs) == 2
    assert segs[0].text == "애플 호실적"
    assert segs[1].text == "샌디스크 급등"


def test_chunk_size_cap():
    # 20 short words with no punctuation, small gaps — chunk_size=5 splits them.
    words = _words(*[(f"w{i}", i * 100, i * 100 + 80) for i in range(20)])
    segs = build_caption_line_segments(words, chunk_size=5)
    assert len(segs) == 4
    for s in segs:
        assert len(s.word_indices) <= 5


def test_empty_words_returns_empty():
    assert build_caption_line_segments([]) == []


def test_invalid_chunk_size_rejected():
    import pytest
    with pytest.raises(ValueError):
        build_caption_line_segments([{"text": "x", "start": 0, "end": 1}], chunk_size=25)


def test_segment_records_indices_and_timing():
    words = _words(
        ("안녕.", 0, 200),
        ("세계.", 250, 600),
    )
    segs = build_caption_line_segments(words)
    assert [s.word_indices for s in segs] == [[0], [1]]
    assert segs[0].start_ms == 0 and segs[0].end_ms == 200
    assert segs[1].start_ms == 250 and segs[1].end_ms == 600


def test_char_budget_splits_long_glued_token():
    # Long glued Scribe tokens (Korean digit-runs) push the cumulative char
    # count past the budget — the segment must flush before the next token
    # so captions stay within the 2-line cap.
    words = _words(
        ("에스엔피", 0, 300),
        ("오백", 320, 600),
        ("종가가", 620, 880),
        ("칠이삼영을", 900, 1300),  # 5 chars
        ("기록했고,", 1320, 1700),
    )
    segs = build_caption_line_segments(words, chunk_size=24, char_budget=14)
    # First segment caps before the long token tips over 14 chars.
    assert len(segs) >= 2
    assert sum(1 for s in segs if len(s.text) > 14) == 0


def test_chunk_size_default_is_eight():
    # Five short words, no punctuation, small gaps — default chunk_size=8
    # must not split a 5-word run.
    words = _words(*[(f"w{i}", i * 100, i * 100 + 80) for i in range(5)])
    segs = build_caption_line_segments(words)
    assert len(segs) == 1


def test_from_script_uses_original_text_when_counts_match():
    # Scribe normalised "5주" → "오 주" and "8%" → "팔 퍼센트"; the new
    # builder restores the original markdown form from the script.
    script = "샌디스크는 8% 급등했습니다. 5주 연속 상승입니다."
    words = _words(
        ("샌디스크는", 0, 300),
        ("팔", 320, 500),
        ("퍼센트", 510, 700),
        ("급등했습니다.", 720, 1100),
        ("오", 1300, 1400),
        ("주", 1410, 1550),
        ("연속", 1560, 1800),
        ("상승입니다.", 1820, 2200),
    )
    segs = build_caption_segments_from_script(script, words)
    assert len(segs) == 2
    assert segs[0].text == "샌디스크는 8% 급등했습니다."
    assert segs[0].start_ms == 0
    assert segs[0].end_ms == 1100
    assert segs[1].text == "5주 연속 상승입니다."
    assert segs[1].start_ms == 1300
    assert segs[1].end_ms == 2200


def test_from_script_one_sentence_per_segment():
    # Each terminator (./!/?) produces its own segment so a single screen
    # only ever shows one sentence at a time.
    script = "지난 금요일 미국 증시가 강하게 마감했습니다."
    words = _words(
        ("지난", 0, 200),
        ("금요일", 220, 480),
        ("미국", 500, 700),
        ("증시가", 720, 1000),
        ("강하게", 1020, 1300),
        ("마감했습니다.", 1320, 1700),
    )
    segs = build_caption_segments_from_script(script, words)
    assert len(segs) == 1
    assert segs[0].text == script
    assert segs[0].end_ms == 1700


def test_from_script_falls_back_to_scribe_text_on_mismatch():
    # If Scribe split into a different number of sentences than the script,
    # the builder keeps timing intact by using Scribe's text per span.
    script = "한 문장만 있습니다."
    words = _words(
        ("한", 0, 200),
        ("문장만", 220, 500),
        ("있습니다.", 520, 800),
        ("그리고", 820, 1000),
        ("추가됐습니다.", 1020, 1400),
    )
    segs = build_caption_segments_from_script(script, words)
    assert len(segs) == 2
    assert segs[0].text == "한 문장만 있습니다."
    assert segs[1].text == "그리고 추가됐습니다."


def test_from_script_recuts_when_scribe_merges_sentences():
    # Scribe missed the "." between two short sentences (short pause), so
    # the terminator-based span count (1) is fewer than the script sentence
    # count (2). The builder must re-cut on the largest inter-word gap so
    # both display-form sentences land on screen.
    script = "5주 연속 상승. 2024년 이후 최장 랠리입니다."
    words = _words(
        ("오", 0, 150),
        ("주", 160, 280),
        ("연속", 300, 500),
        ("상승,", 520, 760),  # comma instead of "." — terminator missed
        ("이천이십사", 1200, 1700),  # 440ms gap: largest in the run
        ("년", 1720, 1850),
        ("이후", 1870, 2050),
        ("최장", 2070, 2300),
        ("랠리입니다.", 2320, 2700),
    )
    segs = build_caption_segments_from_script(script, words)
    assert len(segs) == 2
    assert segs[0].text == "5주 연속 상승."
    assert segs[1].text == "2024년 이후 최장 랠리입니다."
    # Timing still derived from Scribe.
    assert segs[0].start_ms == 0
    assert segs[1].start_ms == 1200


def test_from_script_empty_words_returns_empty():
    assert build_caption_segments_from_script("문장입니다.", []) == []


def test_highlight_picks_percent_token_with_up_color():
    script = "나스닥은 0.94% 상승했습니다."
    words = _words(
        ("나스닥은", 0, 300),
        ("영점", 320, 500),
        ("구사", 510, 680),
        ("퍼센트", 700, 900),
        ("상승했습니다.", 920, 1300),
    )
    segs = build_caption_segments_from_script(script, words)
    assert len(segs) == 1
    assert segs[0].highlight_token == "0.94%"
    assert segs[0].highlight_color == HIGHLIGHT_COLOR_UP


def test_highlight_picks_signed_percent_red_for_minus():
    script = "로블록스, -18% 급락했습니다."
    words = _words(
        ("로블록스", 0, 300),
        ("마이너스", 320, 600),
        ("십팔", 620, 800),
        ("퍼센트", 820, 1000),
        ("급락했습니다.", 1020, 1400),
    )
    segs = build_caption_segments_from_script(script, words)
    assert segs[0].highlight_token == "-18%"
    assert segs[0].highlight_color == HIGHLIGHT_COLOR_DOWN


def test_highlight_falls_back_to_stock_name_when_no_number():
    script = "오라클이 미 국방부 AI 네트워크 프로젝트에 합류했습니다."
    words = _words(
        ("오라클이", 0, 400),
        ("미", 420, 540),
        ("국방부", 560, 800),
        ("AI", 820, 940),
        ("네트워크", 960, 1200),
        ("프로젝트에", 1220, 1500),
        ("합류했습니다.", 1520, 1900),
    )
    segs = build_caption_segments_from_script(script, words)
    assert segs[0].highlight_token == "오라클"
    # No direction verb → neutral colour.
    assert segs[0].highlight_color == HIGHLIGHT_COLOR_NEUTRAL


def test_highlight_direction_verb_when_no_number_or_stock():
    script = "강하게 상승 마감했습니다."
    words = _words(
        ("강하게", 0, 300),
        ("상승", 320, 500),
        ("마감했습니다.", 520, 900),
    )
    segs = build_caption_segments_from_script(script, words)
    assert segs[0].highlight_token == "상승"
    assert segs[0].highlight_color == HIGHLIGHT_COLOR_UP


def test_highlight_serialised_in_to_dict():
    script = "애플 3.2% 상승."
    words = _words(
        ("애플", 0, 300),
        ("삼점", 320, 500),
        ("이", 510, 600),
        ("퍼센트", 620, 800),
        ("상승.", 820, 1000),
    )
    segs = build_caption_segments_from_script(script, words)
    payload = segs[0].to_dict()
    assert payload["highlightToken"] == "3.2%"
    assert payload["highlightColor"] == HIGHLIGHT_COLOR_UP
