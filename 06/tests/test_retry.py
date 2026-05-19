from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import pytest

from md2short._retry import BACKOFFS, post_with_retry


class _Recorder:
    def __init__(self) -> None:
        self.slept: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.slept.append(seconds)


def _make_response(status: int) -> httpx.Response:
    return httpx.Response(status_code=status, request=httpx.Request("POST", "https://x"))


def test_success_first_try_no_retry():
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(200)
    sleep = _Recorder()
    resp = post_with_retry(client, "https://x/y", sleep=sleep)
    assert resp.status_code == 200
    assert client.post.call_count == 1
    assert sleep.slept == []


def test_retry_on_429_then_success():
    client = MagicMock(spec=httpx.Client)
    client.post.side_effect = [_make_response(429), _make_response(200)]
    sleep = _Recorder()
    resp = post_with_retry(client, "https://x/y", sleep=sleep)
    assert resp.status_code == 200
    assert client.post.call_count == 2
    assert sleep.slept == [BACKOFFS[0]]


def test_retry_on_500_then_success():
    client = MagicMock(spec=httpx.Client)
    client.post.side_effect = [_make_response(503), _make_response(502), _make_response(200)]
    sleep = _Recorder()
    resp = post_with_retry(client, "https://x/y", sleep=sleep)
    assert resp.status_code == 200
    assert client.post.call_count == 3
    assert sleep.slept == [BACKOFFS[0], BACKOFFS[1]]


def test_exhaust_three_retries_on_persistent_500():
    client = MagicMock(spec=httpx.Client)
    client.post.return_value = _make_response(500)
    sleep = _Recorder()
    with pytest.raises(httpx.HTTPStatusError):
        post_with_retry(client, "https://x/y", sleep=sleep)
    # 4 total attempts (1 initial + 3 retries)
    assert client.post.call_count == 4
    assert sleep.slept == list(BACKOFFS)


def test_retry_on_transport_error_then_success():
    client = MagicMock(spec=httpx.Client)
    request = httpx.Request("POST", "https://x")
    client.post.side_effect = [
        httpx.ConnectError("nope", request=request),
        _make_response(200),
    ]
    sleep = _Recorder()
    resp = post_with_retry(client, "https://x/y", sleep=sleep)
    assert resp.status_code == 200
    assert sleep.slept == [BACKOFFS[0]]


def test_exhaust_retries_on_persistent_timeout():
    client = MagicMock(spec=httpx.Client)
    request = httpx.Request("POST", "https://x")
    client.post.side_effect = httpx.ReadTimeout("slow", request=request)
    sleep = _Recorder()
    with pytest.raises(httpx.TimeoutException):
        post_with_retry(client, "https://x/y", sleep=sleep)
    assert client.post.call_count == 4
    assert sleep.slept == list(BACKOFFS)
