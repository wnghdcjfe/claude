"""Plan caption line segments that share boundaries with Remotion captions.

Two builders live here:

* :func:`build_caption_segments_from_script` — the production path. Splits
  the *original* script into sentences and assigns each sentence the time
  window of the matching Scribe sentence span. Caption text stays in
  display form (``5주``, ``3.2%``) regardless of how ElevenLabs/Scribe
  pronounced/transcribed it.
* :func:`build_caption_line_segments` — legacy word-based builder kept for
  the older tests and as a fallback. Splits on terminal punctuation, long
  gaps, or a chunk-size cap on Scribe's own text output.

The Remotion side reads ``CaptionSegment.text`` verbatim, so whatever this
module emits is what appears on screen. Each segment also carries a
single ``highlight_token`` + ``highlight_color`` derived from the sentence
contents — the Captions.tsx layer paints only that one token, dropping
the previous "every keyword token glows yellow" behavior (review.md §3순위).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

GAP_BOUNDARY_MS = 600
TERMINAL_PUNCTUATION = (".", "!", "?", "。", "！", "？", "…")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?。！？…])\s+")

# Direction palette — kept in one place so the planner and the Remotion
# layer agree without duplicating hex constants.
HIGHLIGHT_COLOR_UP = "#22C55E"      # green for 상승/급등/+%
HIGHLIGHT_COLOR_DOWN = "#EF4444"    # red for 하락/급락/-%
HIGHLIGHT_COLOR_NEUTRAL = "#FFD93D" # yellow for information/neutral

# Direction lexicons. Longest-match wins inside each list when scanning a
# sentence — but the dominant direction is picked by simple existence so
# the colour stays predictable for QA.
_UP_KEYWORDS: tuple[str, ...] = (
    "사상최고치", "신고가", "최고치",
    "급등", "폭등",
    "상승", "강세", "랠리",
    "호조", "호실적",
)
_DOWN_KEYWORDS: tuple[str, ...] = (
    "급락", "폭락",
    "하락", "약세",
    "패닉",
)
_NEUTRAL_KEYWORDS: tuple[str, ...] = (
    "진입", "합류", "승인", "합의", "협상", "발표", "기록",
    "신호", "갈림길", "혼조",
)

# Stock / index names we'll happily promote to a highlight when no number
# or verb is available. Listed in priority order (longer / more specific
# first) so ``S&P 500`` beats ``S&P``.
_STOCK_KEYWORDS: tuple[str, ...] = (
    "S&P 500", "S&P500", "S&P",
    "나스닥", "코스닥", "코스피", "다우",
    "애플", "로블록스", "샌디스크", "오라클", "퀄컴",
    "엔비디아", "NVIDIA", "AMD", "ASML", "TSMC",
)

# Percent token (with optional sign and decimal). Used both for highlight
# selection and for sign-based color override.
_PERCENT_TOKEN_RE = re.compile(
    r"[+\-−]?\d{1,3}(?:,\d{3})*(?:\.\d+)?%",
)


@dataclass
class CaptionSegment:
    start_ms: int
    end_ms: int
    text: str
    word_indices: list[int] = field(default_factory=list)
    highlight_token: str | None = None
    highlight_color: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "startMs": self.start_ms,
            "endMs": self.end_ms,
            "text": self.text,
            "wordIndices": self.word_indices,
            "highlightToken": self.highlight_token,
            "highlightColor": self.highlight_color,
        }


def _ends_with_terminal(text: str) -> bool:
    if not text:
        return False
    return text[-1] in TERMINAL_PUNCTUATION


CHAR_BUDGET_PER_SEGMENT = 28


def build_caption_line_segments(
    words: list[dict[str, Any]],
    chunk_size: int = 8,
    char_budget: int = CHAR_BUDGET_PER_SEGMENT,
) -> list[CaptionSegment]:
    """Return sentence-aligned caption segments for the given Scribe words.

    Beyond the existing sentence-terminator and gap-based breaks, segments
    are also closed once the cumulative visible character count exceeds
    ``char_budget``. That keeps Korean captions to a 2-line cap even when
    Scribe glues several Korean syllables into a single long token
    (e.g. ``칠이삼영을`` for ``7,230을``).
    """

    if not words:
        return []
    if not 1 <= chunk_size <= 24:
        raise ValueError(f"chunk_size must be in [1, 24] (got: {chunk_size})")
    if char_budget < 6:
        raise ValueError(f"char_budget must be >= 6 (got: {char_budget})")

    segments: list[CaptionSegment] = []
    current_words: list[str] = []
    current_indices: list[int] = []
    current_start: int | None = None
    current_end: int | None = None
    current_chars: int = 0
    last_end: int | None = None

    def _flush() -> None:
        nonlocal current_words, current_indices, current_start, current_end, current_chars
        if not current_words or current_start is None or current_end is None:
            return
        seg_text = " ".join(current_words).strip()
        token, color = _pick_highlight(seg_text)
        segments.append(
            CaptionSegment(
                start_ms=current_start,
                end_ms=current_end,
                text=seg_text,
                word_indices=list(current_indices),
                highlight_token=token,
                highlight_color=color,
            ),
        )
        current_words = []
        current_indices = []
        current_start = None
        current_end = None
        current_chars = 0

    for idx, word in enumerate(words):
        text = (word.get("text") or "").strip()
        if not text:
            continue
        start = int(word.get("start", 0))
        end = int(word.get("end", start))

        gap_break = last_end is not None and (start - last_end) >= GAP_BOUNDARY_MS

        if gap_break and current_words:
            _flush()

        # Char-budget pre-check: if appending this token would blow the
        # 2-line budget, close the current segment first so the long token
        # starts a fresh line group.
        prospective_chars = current_chars + (1 if current_words else 0) + len(text)
        if current_words and prospective_chars > char_budget:
            _flush()

        if current_start is None:
            current_start = start
        current_end = end
        current_words.append(text)
        current_indices.append(idx)
        current_chars += (1 if len(current_words) > 1 else 0) + len(text)
        last_end = end

        if _ends_with_terminal(text) or len(current_words) >= chunk_size:
            _flush()

    _flush()
    return segments


def segments_to_jsonable(segments: list[CaptionSegment]) -> list[dict[str, Any]]:
    return [s.to_dict() for s in segments]


def _split_script_sentences(text: str) -> list[str]:
    """Split the original script into sentences on terminal punctuation."""

    if not text:
        return []
    flat = text.replace("\n", " ").strip()
    parts = [p.strip() for p in _SENTENCE_SPLIT_RE.split(flat) if p.strip()]
    return parts


def _scribe_sentence_spans(
    words: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Group Scribe words into one span per sentence (terminal punctuation)."""

    spans: list[dict[str, Any]] = []
    current_start: int | None = None
    current_end: int | None = None
    current_indices: list[int] = []
    current_texts: list[str] = []

    def _flush() -> None:
        nonlocal current_start, current_end, current_indices, current_texts
        if current_start is None or current_end is None or not current_indices:
            return
        spans.append(
            {
                "start_ms": current_start,
                "end_ms": current_end,
                "word_indices": list(current_indices),
                "fallback_text": " ".join(current_texts).strip(),
            }
        )
        current_start = None
        current_end = None
        current_indices = []
        current_texts = []

    for idx, word in enumerate(words):
        text = (word.get("text") or "").strip()
        if not text:
            continue
        start = int(word.get("start", 0))
        end = int(word.get("end", start))
        if current_start is None:
            current_start = start
        current_end = end
        current_indices.append(idx)
        current_texts.append(text)
        if text[-1] in TERMINAL_PUNCTUATION:
            _flush()
    _flush()
    return spans


def _segment_direction(text: str) -> str:
    """Return ``"up" | "down" | "neutral"`` for the sentence as a whole.

    Used as the default highlight color when a chosen token has no
    sentiment of its own (e.g. a stock name).
    """

    has_up = any(kw in text for kw in _UP_KEYWORDS)
    has_down = any(kw in text for kw in _DOWN_KEYWORDS)
    if has_up and not has_down:
        return "up"
    if has_down and not has_up:
        return "down"
    return "neutral"


def _color_for_direction(direction: str) -> str:
    if direction == "up":
        return HIGHLIGHT_COLOR_UP
    if direction == "down":
        return HIGHLIGHT_COLOR_DOWN
    return HIGHLIGHT_COLOR_NEUTRAL


def _percent_color(token: str, sentence_direction: str) -> str:
    """Color a percent token using its sign, falling back to the sentence."""

    if token.startswith("+"):
        return HIGHLIGHT_COLOR_UP
    if token.startswith("-") or token.startswith("−"):
        return HIGHLIGHT_COLOR_DOWN
    return _color_for_direction(sentence_direction)


def _pick_highlight(text: str) -> tuple[str | None, str | None]:
    """Choose the single most-impactful token in ``text`` and its color.

    Priority order (review.md §3순위):
    1. Numbers / percentages (the data the viewer actually came for)
    2. Stock or index name (gives "who" without using the verb's slot)
    3. Direction verb (lowest — colour already carries the direction)

    Returns ``(None, None)`` if no candidate is found, so the caller can
    skip painting any token.
    """

    if not text:
        return None, None
    direction = _segment_direction(text)

    # 1) percent / number
    percent_match = _PERCENT_TOKEN_RE.search(text)
    if percent_match:
        token = percent_match.group(0)
        return token, _percent_color(token, direction)

    # 2) stock / index — pick the first occurrence (longest names are listed
    #    earlier so the iteration order resolves "S&P 500" before "S&P").
    for kw in _STOCK_KEYWORDS:
        if kw and kw in text:
            return kw, _color_for_direction(direction)

    # 3) direction verb — prefer the strongest (longest) match.
    for bucket in (_UP_KEYWORDS, _DOWN_KEYWORDS, _NEUTRAL_KEYWORDS):
        for kw in bucket:
            if kw in text:
                if bucket is _UP_KEYWORDS:
                    return kw, HIGHLIGHT_COLOR_UP
                if bucket is _DOWN_KEYWORDS:
                    return kw, HIGHLIGHT_COLOR_DOWN
                return kw, HIGHLIGHT_COLOR_NEUTRAL

    return None, None


def _force_span_count(
    words: list[dict[str, Any]],
    target_count: int,
) -> list[dict[str, Any]]:
    """Cut ``words`` into exactly ``target_count`` contiguous spans.

    Used when the Scribe-derived sentence count diverges from the script
    sentence count (often because a short ``.`` pause did not produce a
    terminator-tagged token). Picks the ``target_count - 1`` largest
    inter-word gaps as boundaries so the natural breathing pauses still
    drive the cuts, while guaranteeing the count matches.
    """

    if target_count <= 0 or not words:
        return []
    n = len(words)
    if target_count >= n:
        # Degenerate: at most one word per span. Just split per word.
        spans: list[dict[str, Any]] = []
        for i, w in enumerate(words):
            spans.append(
                {
                    "start_ms": int(w.get("start", 0)),
                    "end_ms": int(w.get("end", w.get("start", 0))),
                    "word_indices": [i],
                    "fallback_text": (w.get("text") or "").strip(),
                }
            )
        return spans

    # Rank inter-word gaps. Position ``i`` denotes the boundary *before*
    # ``words[i]`` (so a boundary at i=3 puts words[0:3] in one span and
    # words[3:...] in the next).
    gaps: list[tuple[int, int]] = []
    for i in range(1, n):
        start = int(words[i].get("start", 0))
        prev_end = int(words[i - 1].get("end", words[i - 1].get("start", 0)))
        gap = max(0, start - prev_end)
        gaps.append((gap, i))
    gaps.sort(key=lambda x: (-x[0], x[1]))
    boundary_positions = sorted(pos for _, pos in gaps[: target_count - 1])

    cuts = [0, *boundary_positions, n]
    spans = []
    for k in range(len(cuts) - 1):
        a, b = cuts[k], cuts[k + 1]
        slice_ = words[a:b]
        if not slice_:
            continue
        spans.append(
            {
                "start_ms": int(slice_[0].get("start", 0)),
                "end_ms": int(slice_[-1].get("end", slice_[-1].get("start", 0))),
                "word_indices": list(range(a, b)),
                "fallback_text": " ".join(
                    (w.get("text") or "").strip() for w in slice_
                ).strip(),
            }
        )
    return spans


def build_caption_segments_from_script(
    script_text: str,
    words: list[dict[str, Any]],
) -> list[CaptionSegment]:
    """Build sentence-aligned caption segments from the original script.

    The original script is the single source of truth for caption text —
    Scribe is used only for timing. Each sentence in ``script_text`` is
    mapped 1:1 to the matching Scribe sentence span. When Scribe's own
    sentence terminators produce a different number of spans (common when
    a short pause swallows a period), we re-cut the word stream by the
    largest inter-word gaps so the count matches and the display form is
    preserved on screen.
    """

    sentences = _split_script_sentences(script_text)
    terminator_spans = _scribe_sentence_spans(words)
    if not sentences and not terminator_spans:
        return []
    if not sentences:
        # No script to anchor display form on — fall back to Scribe text.
        spans = terminator_spans
    elif terminator_spans and len(terminator_spans) == len(sentences):
        spans = terminator_spans
    elif sentences and words and len(sentences) > len(terminator_spans):
        # Script has more sentences than Scribe found terminators — usually
        # a missed ``.`` between short clauses. Re-cut the word stream by
        # the largest gaps so each script sentence still gets its own span.
        spans = _force_span_count(words, len(sentences))
    else:
        # Script has fewer sentences than Scribe (rare: TTS expanded the
        # script). Use Scribe spans as-is and fall back to Scribe text so
        # we don't drop content.
        spans = terminator_spans

    if not spans:
        return []

    use_script = bool(sentences) and len(sentences) == len(spans)

    segments: list[CaptionSegment] = []
    for i, span in enumerate(spans):
        text = sentences[i] if use_script else span.get("fallback_text", "")
        text = (text or "").strip()
        token, color = _pick_highlight(text)
        segments.append(
            CaptionSegment(
                start_ms=span["start_ms"],
                end_ms=span["end_ms"],
                text=text,
                word_indices=span["word_indices"],
                highlight_token=token,
                highlight_color=color,
            )
        )
    return segments
