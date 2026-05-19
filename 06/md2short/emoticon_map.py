"""Map Korean briefing words to deterministic tiger PNG cues.

Each keyword resolves to a filename inside the ``emoticon/`` library at
the project root (``docs/architecture.md`` §5.8). Filenames must exist on
disk — ``plan_cues`` filters out keywords whose target file has been
removed so the Remotion render never references a missing asset.

Cue duration rules (review.md §M1 + §H2 follow-up):
* Each cue is extended to the start of the next cue so the visual layer
  never goes blank between sentences (review.md §1순위.2). The final cue
  optionally extends to ``audio_duration_ms`` for the same reason.
* Spans without a keyword match prefer to *hold* the previous matched
  image rather than fall back to the neutral 정독 tiger (review.md §4순위).
  The 정독 backstop is reserved for spans that have no prior match
  (typically the intro) and is capped at ``NEUTRAL_FILLIN_CAP_MS`` so it
  cannot dominate a long unmatched gap.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Keyword → filename mapping. Filenames are relative to ``emoticon/`` and
# are validated at planner load time. Order matters only for tie-breaks
# (longest matching keyword wins; see ``_score_keyword``).
EMOTICON_KEYWORDS: dict[str, str] = {
    "사상최고치": "46_사상최고치_지수신고가.png",
    "신고가": "46_사상최고치_지수신고가.png",
    "최고치": "46_사상최고치_지수신고가.png",
    "연속 상승": "30_랠리_상승파티.png",
    "랠리": "30_랠리_상승파티.png",
    "급등": "26_반도체급등_로켓상승.png",
    "로켓": "18_테마주탑승_로켓.png",
    "테마": "18_테마주탑승_로켓.png",
    "상승": "09_가즈아_상승.png",
    "강세": "09_가즈아_상승.png",
    "호조": "20_깜짝성장_실적호조.png",
    "호실적": "25_애플깜짝성장_실적호조.png",
    "애플": "25_애플깜짝성장_실적호조.png",
    "샌디스크": "26_반도체급등_로켓상승.png",
    "반도체": "26_반도체급등_로켓상승.png",
    "급락": "28_폭락_패닉하락.png",
    "폭락": "28_폭락_패닉하락.png",
    "하락": "04_나도울고싶어_하락.png",
    "약세": "04_나도울고싶어_하락.png",
    "오라클": "27_AI계약_승인.png",
    "AI": "27_AI계약_승인.png",
    "AI 네트워크": "27_AI계약_승인.png",
    "국방부": "27_AI계약_승인.png",
    "정부": "07_승인완료_도장.png",
    "승인": "07_승인완료_도장.png",
    "분석": "05_분석중_차트.png",
    "리포트": "01_정독중_리포트.png",
    "차트": "05_분석중_차트.png",
    "관망": "06_움직임없음_관망.png",
    "혼조": "38_혼조세_증시갈림길.png",
    "갈림길": "38_혼조세_증시갈림길.png",
    "패닉": "28_폭락_패닉하락.png",
    "로블록스": "04_나도울고싶어_하락.png",
    "어린이": "21_소비심리추락_불안.png",
    "사용자": "21_소비심리추락_불안.png",
    "S&P 500": "46_사상최고치_지수신고가.png",
    "S&P500": "46_사상최고치_지수신고가.png",
    "나스닥": "46_사상최고치_지수신고가.png",
    "다우": "31_매파_금리압박.png",
    "코스피": "30_랠리_상승파티.png",
    "코스닥": "30_랠리_상승파티.png",
    "금리": "31_매파_금리압박.png",
    "연준": "24_연준혼돈_금리불확실.png",
    "Fed": "24_연준혼돈_금리불확실.png",
    "FED": "24_연준혼돈_금리불확실.png",
    "유가": "22_유가비상_원유급등.png",
    "원유": "22_유가비상_원유급등.png",
    "OPEC": "43_UAE탈퇴_OPEC불확실.png",
    "협상": "44_평화협상_중동긴장완화.png",
    "퀄컴": "51_퀄컴오픈AI협력설_AI협업.png",
}

NEUTRAL_DEFAULT_KEYWORD = "정독"
NEUTRAL_DEFAULT_FILE = "01_정독중_리포트.png"

# Hard cap for any neutral fillin segment. Longer "no match" spans hold the
# previous topic's image instead (see review.md §4순위).
NEUTRAL_FILLIN_CAP_MS = 1500


@dataclass
class VisualCue:
    emoticon_file_name: str
    start_ms: int
    duration_ms: int
    keywords: list[str] = field(default_factory=list)
    asset_kind: str = "emoticon"
    visual_mode: str = "emoticon"

    def to_dict(self) -> dict[str, Any]:
        return {
            "emoticonFileName": f"emoticon/{self.emoticon_file_name}",
            "startMs": self.start_ms,
            "durationMs": self.duration_ms,
            "keywords": list(self.keywords),
            "assetKind": self.asset_kind,
            "visualMode": self.visual_mode,
        }


def _score_keyword(keyword: str, text: str) -> int:
    """Higher score = better match. Returns 0 when keyword absent."""

    if not keyword or keyword not in text:
        return 0
    # Prefer longer keywords (more specific) and slightly weight occurrence count.
    return len(keyword) * (text.count(keyword) + 1)


def _load_available_assets(emoticon_dir: Path) -> set[str]:
    if not emoticon_dir.is_dir():
        return set()
    return {p.name for p in emoticon_dir.iterdir() if p.suffix.lower() == ".png"}


def _segment_text(words_slice: list[dict[str, Any]]) -> str:
    return " ".join((w.get("text") or "").strip() for w in words_slice).strip()


def _split_into_visual_spans(
    words: list[dict[str, Any]],
    *,
    gap_boundary_ms: int = 600,
) -> list[tuple[int, int]]:
    """Yield (start_idx, end_idx_exclusive) tuples for each visual span."""

    spans: list[tuple[int, int]] = []
    n = len(words)
    if n == 0:
        return spans
    span_start = 0
    last_end: int | None = None
    for i, word in enumerate(words):
        text = (word.get("text") or "").strip()
        start = int(word.get("start", 0))
        end = int(word.get("end", start))
        gap_break = last_end is not None and (start - last_end) >= gap_boundary_ms
        if gap_break:
            spans.append((span_start, i))
            span_start = i
        last_end = end
        if text and text[-1] in (".", "!", "?", "。", "！", "？", "…"):
            spans.append((span_start, i + 1))
            span_start = i + 1
    if span_start < n:
        spans.append((span_start, n))
    return spans


def _best_keyword(
    text: str,
    mapping: dict[str, str],
    assets: set[str],
) -> tuple[str | None, str | None]:
    """Return (keyword, filename) for the highest-scoring keyword, or (None, None)."""

    best_keyword: str | None = None
    best_score = 0
    for keyword, filename in mapping.items():
        if filename not in assets:
            continue
        score = _score_keyword(keyword, text)
        if score > best_score:
            best_score = score
            best_keyword = keyword
    if best_keyword is None:
        return None, None
    return best_keyword, mapping[best_keyword]


def plan_cues(
    words: list[dict[str, Any]],
    emoticon_dir: Path | str,
    *,
    fill_gaps: bool = True,
    keyword_map: dict[str, str] | None = None,
    available_assets: set[str] | None = None,
    audio_duration_ms: int | None = None,
) -> list[VisualCue]:
    """Build a deterministic list of emoticon cues from Scribe words.

    Each cue is extended to the start of the next cue so the visual layer
    never goes blank between sentences. Unmatched spans hold the previous
    matched image rather than reverting to the neutral 정독 tiger, capping
    the share of time the default character occupies (review.md §4순위).
    """

    if not words:
        return []

    mapping = keyword_map if keyword_map is not None else EMOTICON_KEYWORDS
    assets = available_assets if available_assets is not None else _load_available_assets(
        Path(emoticon_dir),
    )
    if NEUTRAL_DEFAULT_FILE not in assets:
        # Pick the first PNG asset as a backstop so plan_cues stays
        # deterministic even if the neutral filename was renamed.
        backstop = next(iter(sorted(assets)), None)
    else:
        backstop = NEUTRAL_DEFAULT_FILE
    if backstop is None:
        return []

    spans = _split_into_visual_spans(words)
    if not spans:
        return []

    # First pass: score each span. Unmatched spans carry None placeholders
    # so the hold/fillin logic below has the chronology to work with.
    intermediate: list[tuple[int, int, str | None, str | None]] = []
    for start_idx, end_idx in spans:
        slice_ = words[start_idx:end_idx]
        if not slice_:
            continue
        span_start_ms = int(slice_[0].get("start", 0))
        span_end_ms = int(slice_[-1].get("end", span_start_ms))
        text = _segment_text(slice_)
        keyword, filename = _best_keyword(text, mapping, assets)
        intermediate.append((span_start_ms, span_end_ms, keyword, filename))

    # Second pass: resolve unmatched spans by holding the previous matched
    # image. If no prior match exists (intro span) fall back to the neutral
    # 정독 tiger, capped at ``NEUTRAL_FILLIN_CAP_MS``.
    cues: list[VisualCue] = []
    last_matched_keyword: str | None = None
    last_matched_file: str | None = None
    for span_start_ms, span_end_ms, keyword, filename in intermediate:
        duration_ms = max(1, span_end_ms - span_start_ms)
        if keyword is not None and filename is not None:
            cues.append(
                VisualCue(
                    emoticon_file_name=filename,
                    start_ms=span_start_ms,
                    duration_ms=duration_ms,
                    keywords=[keyword],
                ),
            )
            last_matched_keyword = keyword
            last_matched_file = filename
        elif last_matched_file is not None:
            # Hold the previous matched image rather than cutting to 정독.
            cues.append(
                VisualCue(
                    emoticon_file_name=last_matched_file,
                    start_ms=span_start_ms,
                    duration_ms=duration_ms,
                    keywords=[last_matched_keyword or "", "hold"],
                ),
            )
        elif fill_gaps:
            # Pre-first-match span (intro). Cap the 정독 fillin so it cannot
            # eat more than ``NEUTRAL_FILLIN_CAP_MS`` of dead air.
            capped_duration = min(duration_ms, NEUTRAL_FILLIN_CAP_MS)
            cues.append(
                VisualCue(
                    emoticon_file_name=backstop,
                    start_ms=span_start_ms,
                    duration_ms=capped_duration,
                    keywords=[NEUTRAL_DEFAULT_KEYWORD],
                ),
            )

    # Third pass: extend each cue to the start of the next cue so the
    # visual layer never blanks mid-narration (review.md §1순위.2). The
    # final cue extends to ``audio_duration_ms`` when supplied, otherwise
    # it keeps its sentence-bounded duration.
    if not cues:
        return cues
    for i, cue in enumerate(cues[:-1]):
        next_start = cues[i + 1].start_ms
        new_duration = max(1, next_start - cue.start_ms)
        cue.duration_ms = new_duration
    if audio_duration_ms is not None:
        last = cues[-1]
        new_duration = max(1, audio_duration_ms - last.start_ms)
        # Only extend, never shorten: the sentence-bound duration is a
        # floor so a stray short ``audio_duration_ms`` cannot truncate the
        # final beat.
        last.duration_ms = max(last.duration_ms, new_duration)
    return cues


def cues_to_jsonable(cues: list[VisualCue]) -> list[dict[str, Any]]:
    return [c.to_dict() for c in cues]
