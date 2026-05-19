from __future__ import annotations

from md2short.tts_text import prepare_tts_text


def test_spells_out_sp500_acronym():
    out = prepare_tts_text("S&P 500은 종가 7,230을 기록했습니다.")
    assert "에스앤피 오백" in out
    assert "S&P" not in out


def test_spells_out_ai_acronym():
    out = prepare_tts_text("정부의 AI 시장이 본격 매출 사이클에 진입했습니다.")
    assert "에이아이" in out
    assert " AI " not in out


def test_pause_heavy_punctuation_flattened():
    out = prepare_tts_text("핵심 — 이것은 — 중요합니다.")
    assert "—" not in out
    assert ", 이것은" in out


def test_ellipsis_flattened():
    out = prepare_tts_text("결과는… 좋았습니다.")
    assert "…" not in out
    assert ", 좋았습니다" in out


def test_colon_before_text_flattened():
    out = prepare_tts_text("핵심: 5주 연속 상승")
    assert "핵심," in out


def test_bullet_leadins_stripped():
    out = prepare_tts_text("- 항목1\n- 항목2")
    assert "- " not in out


def test_grouped_number_normalised():
    out = prepare_tts_text("종가 7,230을 기록했습니다.")
    assert "칠천이백삼십" in out
    assert "7,230" not in out


def test_integer_percent_normalised():
    out = prepare_tts_text("로블록스는 18% 급락했습니다.")
    assert "십팔 퍼센트" in out
    assert "18%" not in out


def test_decimal_percent_normalised():
    out = prepare_tts_text("애플이 3.2% 상승했습니다.")
    assert "삼점 이 퍼센트" in out
    assert "3.2%" not in out


def test_sub_one_decimal_percent_normalised():
    out = prepare_tts_text("나스닥은 0.94% 상승했습니다.")
    assert "영점 구사 퍼센트" in out
    assert "0.94%" not in out


def test_signed_percent_includes_direction():
    plus = prepare_tts_text("나스닥은 +0.94% 상승했습니다.")
    assert "플러스 영점 구사 퍼센트" in plus
    minus = prepare_tts_text("로블록스 -18% 급락.")
    assert "마이너스 십팔 퍼센트" in minus


def test_year_normalised():
    out = prepare_tts_text("1995년 이후 최장 랠리입니다.")
    assert "천구백구십오년" in out
    assert "1995년" not in out


def test_four_digit_year_normalised():
    out = prepare_tts_text("2024년 이후 최장 랠리입니다.")
    assert "이천이십사년" in out


def test_simple_unit_numbers_untouched():
    # Single-digit + 단위 combos (``5주``, ``4월``) read correctly without
    # explicit Sino spelling, so we keep the cheap path.
    out = prepare_tts_text("5주 연속 상승, 4월 기준")
    assert "5주" in out
    assert "4월" in out


def test_leaves_korean_untouched():
    out = prepare_tts_text("지난 금요일 미국 증시 강하게 마감")
    assert out.startswith("지난 금요일")
