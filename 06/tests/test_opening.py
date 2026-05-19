from __future__ import annotations

from datetime import datetime

import pytest

from md2short.opening import compose_opening


def test_compose_opening_visual_two_lines():
    spec = compose_opening(datetime(2026, 5, 14))
    assert spec.visual == "5월 14일\n데이브리핑"


def test_compose_opening_spoken_includes_date():
    spec = compose_opening(datetime(2026, 5, 14))
    assert "5월 14일" in spec.spoken
    assert "데이브리핑" in spec.spoken


def test_compose_opening_rejects_non_ko():
    with pytest.raises(ValueError):
        compose_opening(datetime(2026, 1, 1), language="en")
