from __future__ import annotations

import json
from unittest.mock import MagicMock

import httpx
import pytest

from md2short.script_engine import (
    DEFAULT_MODEL,
    _looks_korean,
    generate_script,
)


def _make_response(payload: dict | str, status: int = 200) -> httpx.Response:
    body = payload if isinstance(payload, str) else json.dumps(payload)
    return httpx.Response(
        status_code=status,
        content=body.encode("utf-8"),
        headers={"Content-Type": "application/json"},
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )


def test_looks_korean_true_for_korean_only():
    assert _looks_korean("지난 금요일 미국 증시 강하게 상승 마감했습니다.") is True


def test_looks_korean_true_for_korean_with_short_acronyms():
    assert _looks_korean("S&P 500 종가 7,230 기록했습니다. AI 시장은 본격적인 매출 사이클에 진입했습니다.") is True


def test_looks_korean_false_for_latin_sentence_leak():
    assert (
        _looks_korean(
            "The market rallied today. 시장이 상승했습니다.",
        )
        is False
    )


def test_looks_korean_false_for_japanese_kana():
    assert _looks_korean("こんにちは 시장이 상승했습니다.") is False


def test_looks_korean_false_for_han_ideograph():
    assert _looks_korean("中国 시장이 상승했습니다.") is False


def test_generate_script_falls_back_when_no_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    md = "한 문단의 한국어입니다.\n\n두 번째 문단."
    result = generate_script(md, api_key=None)
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"] == "OPENAI_API_KEY_missing"
    assert "한 문단" in result["hook"]


def test_generate_script_uses_openai_path_when_response_korean():
    payload = {
        "output_text": json.dumps(
            {
                "hook": "지난 금요일 미국 증시 강세 마감.",
                "body": "S&P 500 종가 7,230 기록. 나스닥 0.94% 상승.",
                "cta": "구독과 알람 부탁드립니다.",
            },
            ensure_ascii=False,
        ),
    }
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(payload)
    result = generate_script("원문 마크다운.", api_key="sk-fake", client=client)
    assert result["plan"]["engine"] == "openai"
    assert result["plan"]["model"] == DEFAULT_MODEL
    assert result["plan"]["fallback_reason"] is None
    assert result["hook"].startswith("지난 금요일")
    assert "S&P 500" in result["body"]
    assert client.post.call_count == 1


def test_generate_script_demotes_when_response_is_english():
    payload = {
        "output_text": json.dumps(
            {
                "hook": "Markets rallied strongly on Friday.",
                "body": "The S&P closed at 7,230. Nasdaq rose 0.94%.",
                "cta": "Please subscribe.",
            },
        ),
    }
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(payload)
    md = "한국어 원문 마크다운입니다.\n\n두 번째 한국어 문단."
    result = generate_script(md, api_key="sk-fake", client=client)
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"] == "korean_guard_rejected_output"


def test_generate_script_demotes_on_http_error():
    request = httpx.Request("POST", "https://api.openai.com/v1/responses")
    client = MagicMock(spec=httpx.Client)
    client.post.side_effect = httpx.ConnectError("nope", request=request)
    result = generate_script("내용", api_key="sk-fake", client=client)
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"].startswith("openai_http_error")


def test_generate_script_demotes_on_invalid_json_output():
    payload = {"output_text": "not json {}"}
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(payload)
    result = generate_script("내용", api_key="sk-fake", client=client)
    assert result["plan"]["engine"] == "fallback_extract"
    assert result["plan"]["fallback_reason"] == "openai_json_decode_failed"


def test_generate_script_extracts_from_output_chunks():
    """Responses API can return output as nested content chunks."""
    payload = {
        "output": [
            {
                "content": [
                    {
                        "type": "output_text",
                        "text": json.dumps(
                            {
                                "hook": "한국어 도입.",
                                "body": "한국어 본문 단락입니다.",
                                "cta": "구독해 주세요.",
                            },
                            ensure_ascii=False,
                        ),
                    },
                ],
            },
        ],
    }
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(payload)
    result = generate_script("원문.", api_key="sk-fake", client=client)
    assert result["plan"]["engine"] == "openai"
    assert "한국어 도입" in result["hook"]


def test_generate_script_demotes_on_empty_response():
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response({"output": []})
    result = generate_script("내용", api_key="sk-fake", client=client)
    assert result["plan"]["fallback_reason"] == "empty_openai_output"
