"""Quality control checks + per-job cost estimation.

Two hard tolerances are enforced (``docs/architecture.md`` §5.6):

* ``sync_last_word_vs_audio`` — last Scribe word end should be within
  ±1000 ms of the measured audio duration (allows for a tail of silence).
* ``final_mp4_vs_audio`` — the rendered MP4 duration must be within ±100
  ms of the audio duration (Remotion derives frames from the audio).

Failing either check ends the job at ``qc_failed`` (terminal).
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .render import get_audio_duration_ms

LAST_WORD_TAIL_TOLERANCE_MS = 1000
FINAL_VS_AUDIO_TOLERANCE_MS = 100

# Rates kept as conservative published-snapshot constants per
# ``docs/architecture.md`` §5.6. The image-mode cost path is intentionally
# *not* estimated locally — see the doc for the rationale.
ELEVENLABS_TTS_USD_PER_1K_CHARS = 0.30
ELEVENLABS_STT_USD_PER_HOUR = 0.40
OPENAI_GPT55_INPUT_USD_PER_M_TOK = 0.25
OPENAI_GPT55_OUTPUT_USD_PER_M_TOK = 2.00


@dataclass
class QCCheck:
    name: str
    pass_: bool
    observed_ms: int
    expected_ms: int
    tolerance_ms: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "pass": self.pass_,
            "observed_ms": self.observed_ms,
            "expected_ms": self.expected_ms,
            "tolerance_ms": self.tolerance_ms,
        }


@dataclass
class CostEstimate:
    tts_usd: float
    stt_usd: float
    openai_text_usd: float
    total_usd: float
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass
class QCResult:
    passed: bool
    checks: list[QCCheck]
    duration_policy: dict[str, Any]
    cost_estimate: CostEstimate

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "checks": [c.to_dict() for c in self.checks],
            "duration_policy": self.duration_policy,
            "cost_estimate": {
                "tts_usd": round(self.cost_estimate.tts_usd, 6),
                "stt_usd": round(self.cost_estimate.stt_usd, 6),
                "openai_text_usd": round(self.cost_estimate.openai_text_usd, 6),
                "total_usd": round(self.cost_estimate.total_usd, 6),
                "detail": self.cost_estimate.detail,
            },
        }


def estimate_cost(
    *,
    tts_chars: int,
    audio_seconds: float,
    openai_input_chars: int,
    openai_output_chars: int,
) -> CostEstimate:
    tts_usd = (tts_chars / 1000.0) * ELEVENLABS_TTS_USD_PER_1K_CHARS
    stt_usd = (audio_seconds / 3600.0) * ELEVENLABS_STT_USD_PER_HOUR
    input_tokens = openai_input_chars / 4.0
    output_tokens = openai_output_chars / 4.0
    openai_usd = (
        input_tokens * OPENAI_GPT55_INPUT_USD_PER_M_TOK / 1_000_000.0
        + output_tokens * OPENAI_GPT55_OUTPUT_USD_PER_M_TOK / 1_000_000.0
    )
    total = tts_usd + stt_usd + openai_usd
    return CostEstimate(
        tts_usd=tts_usd,
        stt_usd=stt_usd,
        openai_text_usd=openai_usd,
        total_usd=total,
        detail={
            "tts_chars": tts_chars,
            "audio_seconds": round(audio_seconds, 3),
            "openai_input_chars": openai_input_chars,
            "openai_output_chars": openai_output_chars,
            "rates": {
                "tts_usd_per_1k_chars": ELEVENLABS_TTS_USD_PER_1K_CHARS,
                "stt_usd_per_hour": ELEVENLABS_STT_USD_PER_HOUR,
                "openai_input_usd_per_m_tok": OPENAI_GPT55_INPUT_USD_PER_M_TOK,
                "openai_output_usd_per_m_tok": OPENAI_GPT55_OUTPUT_USD_PER_M_TOK,
            },
        },
    )


def _check_within(
    name: str,
    observed_ms: int,
    expected_ms: int,
    tolerance_ms: int,
) -> QCCheck:
    diff = abs(observed_ms - expected_ms)
    return QCCheck(
        name=name,
        pass_=diff <= tolerance_ms,
        observed_ms=observed_ms,
        expected_ms=expected_ms,
        tolerance_ms=tolerance_ms,
    )


def run_qc(
    *,
    audio_path: Path,
    final_mp4_path: Path,
    words_doc: dict[str, Any],
    tts_chars: int,
    openai_input_chars: int,
    openai_output_chars: int,
) -> QCResult:
    """Compute sync checks + cost estimate from on-disk artifacts."""

    audio_duration_ms = get_audio_duration_ms(audio_path)
    final_duration_ms = get_audio_duration_ms(final_mp4_path)
    words = words_doc.get("words", []) or []
    last_word_end_ms = int(words[-1]["end"]) if words else 0

    check_tail = _check_within(
        "sync_last_word_vs_audio",
        observed_ms=last_word_end_ms,
        expected_ms=audio_duration_ms,
        tolerance_ms=LAST_WORD_TAIL_TOLERANCE_MS,
    )
    check_final = _check_within(
        "final_mp4_vs_audio",
        observed_ms=final_duration_ms,
        expected_ms=audio_duration_ms,
        tolerance_ms=FINAL_VS_AUDIO_TOLERANCE_MS,
    )

    cost = estimate_cost(
        tts_chars=tts_chars,
        audio_seconds=audio_duration_ms / 1000.0,
        openai_input_chars=openai_input_chars,
        openai_output_chars=openai_output_chars,
    )

    return QCResult(
        passed=check_tail.pass_ and check_final.pass_,
        checks=[check_tail, check_final],
        duration_policy={
            "source": "tts_audio_duration",
            "audio_duration_ms": audio_duration_ms,
            "final_mp4_duration_ms": final_duration_ms,
            "last_word_end_ms": last_word_end_ms,
        },
        cost_estimate=cost,
    )


def write_qc_report(report_path: Path | str, result: QCResult) -> Path:
    path = Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


# Keep ``asdict`` reachable in case callers want plain serialisation.
__all__ = [
    "CostEstimate",
    "QCCheck",
    "QCResult",
    "asdict",
    "estimate_cost",
    "run_qc",
    "write_qc_report",
    "LAST_WORD_TAIL_TOLERANCE_MS",
    "FINAL_VS_AUDIO_TOLERANCE_MS",
]
