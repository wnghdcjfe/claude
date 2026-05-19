"""HTTP retry helper for external API calls.

Retries on 429 / 5xx responses and on transport / timeout errors, with
backoff 0.5s, 1.0s, 2.0s (3 retries after the initial attempt — 4 total
attempts). Per ``docs/architecture.md`` §1.1 + §5.2 this is the only
retry policy used by ``voice``, ``transcript``, and ``photo_engine``.
"""

from __future__ import annotations

import time
from typing import Any, Callable

import httpx

BACKOFFS = (0.5, 1.0, 2.0)
RETRY_STATUS_FORCELIST = frozenset({429, 500, 502, 503, 504})


def _should_retry_status(status_code: int) -> bool:
    return status_code in RETRY_STATUS_FORCELIST or status_code >= 500


def post_with_retry(
    client: httpx.Client,
    url: str,
    *,
    sleep: Callable[[float], None] = time.sleep,
    **kwargs: Any,
) -> httpx.Response:
    """POST ``url`` retrying up to 3 times on 429 / 5xx / transport errors.

    ``sleep`` is injectable so tests can run without real wall-clock delay.
    """

    last_response: httpx.Response | None = None
    for attempt in range(len(BACKOFFS) + 1):
        try:
            response = client.post(url, **kwargs)
        except (httpx.TimeoutException, httpx.TransportError):
            if attempt >= len(BACKOFFS):
                raise
            sleep(BACKOFFS[attempt])
            continue

        if _should_retry_status(response.status_code):
            last_response = response
            if attempt >= len(BACKOFFS):
                response.raise_for_status()
            sleep(BACKOFFS[attempt])
            continue
        return response

    # Defensive: loop above either returns or raises.
    if last_response is not None:
        last_response.raise_for_status()
    raise RuntimeError("post_with_retry exhausted without response")
