"""Convert display-form script text into a TTS-friendly string.

The caption pipeline always reads the *original* script (display form), so
nothing produced here ever reaches the screen — every transform is scoped
to the audio path only. Two families of transforms run:

1. **Acronym spell-out.** English acronyms (``S&P 500``, ``AI``) become
   Hangul so ElevenLabs reads them as Koreans actually say them.
2. **Number phonetics.** ElevenLabs misreads
   ``7,230 → "칠이삼영"`` / ``0.94% → "영돗구사퍼센트"`` for Korean voices,
   so we rewrite numbers (comma-groups), percentages (signed + decimals),
   and 4-digit years into Sino-Korean readings *before* the synth call.

The caption layer never sees these phonetic strings — they exist only to
make the narration intelligible.
"""

from __future__ import annotations

import re

_DASH_PAUSE_RE = re.compile(r"[—–]+")
_MULTI_DOT_RE = re.compile(r"\.{2,}")
_ELLIPSIS_RE = re.compile(r"…")
_COLON_BEFORE_TEXT_RE = re.compile(r":\s+(?=\S)")
_SEMI_RE = re.compile(r";")
_BULLET_LEADIN_RE = re.compile(r"^\s*[-•·]\s+", re.MULTILINE)

_ACRONYM_REPLACEMENTS: dict[str, str] = {
    "S&P 500": "에스앤피 오백",
    "S&P500": "에스앤피 오백",
    "S&P": "에스앤피",
    "AI": "에이아이",
    "AMD": "에이엠디",
    "ETF": "이티에프",
    "GDP": "지디피",
    "CEO": "씨이오",
    "API": "에이피아이",
    "ASML": "에이에스엠엘",
    "TSMC": "티에스엠씨",
    "NVIDIA": "엔비디아",
}

_SINO_DIGITS: dict[int, str] = {
    0: "영",
    1: "일",
    2: "이",
    3: "삼",
    4: "사",
    5: "오",
    6: "육",
    7: "칠",
    8: "팔",
    9: "구",
}


def _read_below_man(n: int) -> str:
    """Render an integer in [0, 9999] in Sino-Korean.

    Drops the leading ``일`` on ``일십/일백/일천`` (``11 → 십일``, not
    ``일십일``) to match natural Korean reading.
    """

    if n == 0:
        return ""
    parts: list[str] = []
    for value, name in ((1000, "천"), (100, "백"), (10, "십")):
        if n >= value:
            quotient = n // value
            n = n % value
            if quotient == 1:
                parts.append(name)
            else:
                parts.append(_SINO_DIGITS[quotient] + name)
    if n > 0:
        parts.append(_SINO_DIGITS[n])
    return "".join(parts)


def _read_sino_integer(n: int) -> str:
    """Sino-Korean reading for an integer; supports the 만 / 억 column."""

    if n < 0:
        return "마이너스 " + _read_sino_integer(-n)
    if n == 0:
        return "영"
    pieces: list[str] = []
    eok, rest = divmod(n, 100_000_000)
    if eok:
        pieces.append(_read_below_man(eok) + "억")
        n = rest
    man, rest = divmod(n, 10_000)
    if man:
        man_text = _read_below_man(man)
        # ``1만 → 만``, ``2만 → 이만`` (drop the leading 일).
        if man == 1:
            pieces.append("만")
        else:
            pieces.append(man_text + "만")
        n = rest
    if n:
        pieces.append(_read_below_man(n))
    return "".join(pieces)


def _read_decimal_digits(decimal_part: str) -> str:
    """Read ``94`` as ``구사`` — one Sino digit per character, no spacing.

    Matches the conversational Korean reading of fractional percentages
    (``0.94% → 영점 구사 퍼센트``).
    """

    return "".join(_SINO_DIGITS[int(c)] for c in decimal_part)


_PERCENT_RE = re.compile(
    r"([+\-−])?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?\s*%",
)
_YEAR_RE = re.compile(r"(\d{1,4})년")
_GROUPED_NUMBER_RE = re.compile(r"\d{1,3}(?:,\d{3})+")


def _percent_sub(match: re.Match[str]) -> str:
    sign = match.group(1) or ""
    int_part = match.group(2).replace(",", "")
    dec_part = match.group(3)
    int_value = int(int_part)
    if dec_part:
        text = f"{_read_sino_integer(int_value)}점 {_read_decimal_digits(dec_part)} 퍼센트"
    else:
        text = f"{_read_sino_integer(int_value)} 퍼센트"
    if sign in ("+",):
        text = "플러스 " + text
    elif sign in ("-", "−"):
        text = "마이너스 " + text
    return text


def _year_sub(match: re.Match[str]) -> str:
    return f"{_read_sino_integer(int(match.group(1)))}년"


def _grouped_number_sub(match: re.Match[str]) -> str:
    return _read_sino_integer(int(match.group(0).replace(",", "")))


def _normalize_numbers_korean(text: str) -> str:
    """Rewrite numeric tokens into Sino-Korean spellings for ElevenLabs.

    Order matters: percent first (so ``0.94%`` is consumed as one token),
    then years (``2024년``), finally comma-separated big numbers like
    ``7,230``. Bare small integers (``5주``, ``4월``, ``8%`` already handled
    above) are left alone — ElevenLabs reads single-digit + unit combos
    naturally, and the percent rule above covers the ``8%`` case.
    """

    text = _PERCENT_RE.sub(_percent_sub, text)
    text = _YEAR_RE.sub(_year_sub, text)
    text = _GROUPED_NUMBER_RE.sub(_grouped_number_sub, text)
    return text


def _spell_out_acronyms(text: str) -> str:
    # Replace longest tokens first so "S&P 500" beats "S&P".
    for needle, replacement in sorted(
        _ACRONYM_REPLACEMENTS.items(), key=lambda kv: -len(kv[0])
    ):
        text = text.replace(needle, replacement)
    return text


def _flatten_pause_punctuation(text: str) -> str:
    text = _DASH_PAUSE_RE.sub(", ", text)
    text = _ELLIPSIS_RE.sub(", ", text)
    text = _MULTI_DOT_RE.sub(". ", text)
    text = _COLON_BEFORE_TEXT_RE.sub(", ", text)
    text = _SEMI_RE.sub(",", text)
    text = _BULLET_LEADIN_RE.sub("", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def prepare_tts_text(script_text: str) -> str:
    """Return TTS-only text for an ElevenLabs synth call."""

    text = _normalize_numbers_korean(script_text)
    text = _spell_out_acronyms(text)
    text = _flatten_pause_punctuation(text)
    return text
