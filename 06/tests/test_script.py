from __future__ import annotations

from md2short.script import fallback_extract, strip_markdown


def test_strip_markdown_removes_headings_and_bullets():
    raw = "# 제목\n\n- 항목1\n- 항목2\n\n**굵게** 본문."
    out = strip_markdown(raw)
    assert "#" not in out
    assert "**" not in out
    assert "항목1" in out
    assert "항목2" in out


def test_fallback_extract_preserves_korean_content():
    md = (
        "지난 금요일 미국 증시 강하게 상승 마감.\n\n"
        "S&P 500 종가 7,230 기록.\n나스닥 0.94% 상승.\n\n"
        "구독과 알람 부탁드립니다."
    )
    result = fallback_extract(md)
    assert result["hook"].startswith("지난 금요일")
    assert "S&P 500" in result["body"]
    assert "구독" in result["cta"]
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"] is None
    assert result["full_text"]
    assert "지난 금요일" in result["full_text"]


def test_fallback_extract_handles_empty():
    result = fallback_extract("")
    assert result["full_text"] == ""
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"] == "empty_input"


def test_fallback_extract_single_paragraph():
    result = fallback_extract("한 문단만 있습니다.")
    assert result["hook"] == "한 문단만 있습니다."
    assert result["body"] == ""
    assert result["cta"] == ""
