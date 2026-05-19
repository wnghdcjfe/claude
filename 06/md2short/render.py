"""Python ↔ Remotion bridge.

Owns the ffmpeg / ffprobe / Remotion preflight, asset staging under
``remotion/public/jobs/<job_id>/``, ``props.json`` generation, and the
``npx remotion render`` subprocess call. Captions / overlays are produced
*entirely* by Remotion's React composition — no ffmpeg subtitles filter
or burn-in overlay is invoked anywhere in this module (``AGENTS.md`` §3.4
+ ``docs/architecture.md`` §5.5).
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Final

DEFAULT_FPS: Final[int] = 30

PROJECT_ROOT: Final[Path] = Path(__file__).resolve().parents[1]
REMOTION_DIR: Final[Path] = PROJECT_ROOT / "remotion"
REMOTION_PUBLIC: Final[Path] = REMOTION_DIR / "public"
REMOTION_NODE_MODULES: Final[Path] = REMOTION_DIR / "node_modules"
REMOTION_ENTRY: Final[str] = "src/index.ts"
REMOTION_COMPOSITION_ID: Final[str] = "TechExplainer"


def ensure_ffmpeg_available() -> None:
    """Raise ``RuntimeError`` if ffmpeg or ffprobe is not on PATH."""

    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise RuntimeError(
            f"Required tools missing from PATH: {', '.join(missing)}. "
            "Install via `brew install ffmpeg` (macOS) or your package manager.",
        )


def get_audio_duration_ms(audio_path: Path | str) -> int:
    """Return the duration of an audio file in integer milliseconds.

    Uses ``ffprobe`` and rounds the floating-point seconds value to ms.
    """

    ensure_ffmpeg_available()
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"audio file not found: {path}")

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    seconds = float(result.stdout.strip())
    return int(round(seconds * 1000.0))


# ElevenLabs leaves ≥1s of trailing silence between sentences for some Korean
# voices. Anything over 250 ms reads as "dead air" in a 9:16 short, so we
# clamp every silence longer than ``stop_duration`` down to that floor.
# Threshold of −40 dB is conservative enough to keep breath/quiet syllables
# intact while still catching the obvious between-sentence gaps.
SILENCE_STOP_DURATION_S: Final[float] = 0.25
SILENCE_THRESHOLD_DB: Final[int] = -40


def trim_silence(
    src_path: Path | str,
    dst_path: Path | str,
    *,
    stop_duration_s: float = SILENCE_STOP_DURATION_S,
    threshold_db: int = SILENCE_THRESHOLD_DB,
) -> Path:
    """Re-encode ``src_path`` with long silences clamped to ``stop_duration_s``.

    Uses ffmpeg's ``silenceremove`` (``stop_periods=-1`` so every silent run
    is processed, not just the leading one). Writes MP3 to ``dst_path`` and
    returns it. Word timings produced from the trimmed audio remain valid
    because Scribe re-runs over the trimmed file.
    """

    ensure_ffmpeg_available()
    src = Path(src_path)
    if not src.is_file():
        raise FileNotFoundError(f"audio file not found: {src}")
    dst = Path(dst_path)
    dst.parent.mkdir(parents=True, exist_ok=True)

    silence_filter = (
        f"silenceremove=stop_periods=-1"
        f":stop_duration={stop_duration_s}"
        f":stop_threshold={threshold_db}dB"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-af",
        silence_filter,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "128k",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg silenceremove failed (exit {result.returncode}): "
            f"{result.stderr[-400:]}",
        )
    return dst


def ms_to_frames(ms: int, fps: int = DEFAULT_FPS) -> int:
    """Convert integer ms to integer frames at the given fps (round)."""

    if ms < 0:
        raise ValueError(f"ms must be non-negative (got: {ms})")
    return int(round(ms * fps / 1000.0))


def ensure_remotion_available() -> None:
    """Raise ``RuntimeError`` if any Remotion dependency is missing."""

    missing: list[str] = []
    if not REMOTION_DIR.is_dir():
        missing.append("remotion/")
    if not REMOTION_NODE_MODULES.is_dir():
        missing.append("remotion/node_modules (run `npm install` inside remotion/)")
    if shutil.which("npx") is None:
        missing.append("npx (install Node ≥ 20)")
    if missing:
        raise RuntimeError(
            "Required Remotion dependencies missing: " + ", ".join(missing),
        )


def _ensure_emoticon_symlink() -> None:
    target = REMOTION_PUBLIC / "emoticon"
    source = PROJECT_ROOT / "emoticon"
    REMOTION_PUBLIC.mkdir(parents=True, exist_ok=True)
    if target.exists() or target.is_symlink():
        return
    try:
        target.symlink_to(source, target_is_directory=True)
    except OSError:
        shutil.copytree(source, target)


def _bg_color_to_css(value: str) -> str:
    """Normalise ``0xRRGGBB`` (or ``#RRGGBB``/``RRGGBB``) to ``#RRGGBB``."""

    s = value.strip()
    if s.startswith("0x"):
        s = s[2:]
    if s.startswith("#"):
        s = s[1:]
    if len(s) == 6 and all(c in "0123456789abcdefABCDEF" for c in s):
        return f"#{s.upper()}"
    return value


def _opening_duration_ms(
    *,
    show_opening: bool,
    caption_segments: list[dict[str, Any]] | None,
    words: list[dict[str, Any]] | None,
) -> int:
    """Estimate how long the spoken opening occupies in the narration.

    The pipeline prepends one short sentence (``compose_opening``) to the
    TTS feed. Its caption span is the first segment that ends with terminal
    punctuation. Fallback to the first word's end + 200 ms if segments are
    unavailable.
    """

    if not show_opening:
        return 0
    if caption_segments:
        first = caption_segments[0]
        return int(first.get("endMs", first.get("end_ms", 0)) or 0) + 200
    if words:
        first_end = int(words[0].get("end", 0) or 0)
        return first_end + 200
    return 0


def stage_assets(
    *,
    job_id: str,
    narration_path: Path,
    words_doc_path: Path,
) -> Path:
    """Copy ``narration.mp3`` + ``words.json`` under ``remotion/public/jobs/<id>/``."""

    ensure_remotion_available()
    _ensure_emoticon_symlink()

    public_job_dir = REMOTION_PUBLIC / "jobs" / job_id
    public_job_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(narration_path, public_job_dir / "narration.mp3")
    shutil.copy2(words_doc_path, public_job_dir / "words.json")

    return public_job_dir


def write_props(
    *,
    job_id: str,
    config_dump: dict[str, Any],
    caption_segments: list[dict[str, Any]],
    emoticon_cues: list[dict[str, Any]],
    audio_duration_ms: int,
    opening_text: str = "",
    opening_visual: str = "",
    show_opening: bool = True,
    show_outro: bool = False,
    cta_text: str = "",
    highlight_keywords: list[str] | None = None,
    words: list[dict[str, Any]] | None = None,
    public_job_dir: Path | None = None,
) -> Path:
    """Build ``props.json`` for the staged composition and return its path."""

    public_job_dir = public_job_dir or (REMOTION_PUBLIC / "jobs" / job_id)
    public_job_dir.mkdir(parents=True, exist_ok=True)

    props = {
        "audioFileName": f"jobs/{job_id}/narration.mp3",
        "wordsFileName": f"jobs/{job_id}/words.json",
        "bgColor": _bg_color_to_css(str(config_dump.get("bg_color", "0xFFFFFF"))),
        "chunkSize": int(config_dump.get("chunk_size", 8)),
        "emoticonCues": emoticon_cues,
        "captionSegments": caption_segments,
        "companyLogoCues": [],
        "numberCards": [],
        "highlightKeywords": highlight_keywords or [],
        "openingText": opening_visual if show_opening else "",
        "openingDurationMs": _opening_duration_ms(
            show_opening=show_opening,
            caption_segments=caption_segments,
            words=words,
        ),
        "showOpening": bool(show_opening),
        "ctaText": cta_text,
        "showOutro": bool(show_outro),
        "durationInFrames": max(1, ms_to_frames(int(audio_duration_ms))),
    }
    # Keep openingText derived from the visual line so the OpeningOverlay
    # in TechExplainer.tsx receives the multi-line briefing.
    if show_opening and not props["openingText"] and opening_text:
        props["openingText"] = opening_text

    props_path = public_job_dir / "props.json"
    props_path.write_text(
        json.dumps(props, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return props_path


def render_remotion(
    *,
    job_id: str,
    props_path: Path,
    output_path: Path,
    log_path: Path,
    bg_color_css: str | None = None,
) -> Path:
    """Run ``npx remotion render`` and stream stderr to ``log_path``."""

    ensure_ffmpeg_available()
    ensure_remotion_available()

    output_abs = Path(output_path).resolve()
    output_abs.parent.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "npx",
        "remotion",
        "render",
        REMOTION_ENTRY,
        REMOTION_COMPOSITION_ID,
        str(output_abs),
        f"--props={Path(props_path).resolve()}",
        "--codec=h264",
        # CRF 26 ≈ 1.6–1.8 Mbps for talking-head shorts. Visually identical to
        # the Remotion default for these flat illustrations but ~35 % smaller.
        "--crf=26",
        "--log=warn",
        "--overwrite",
    ]
    void_bg = bg_color_css  # parameter retained for future Remotion CLI overrides
    del void_bg

    with open(log_path, "wb") as log_file:
        log_file.write(b"$ " + " ".join(cmd).encode("utf-8") + b"\n")
        result = subprocess.run(
            cmd,
            cwd=str(REMOTION_DIR),
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )
    if result.returncode != 0:
        raise RuntimeError(
            f"Remotion render failed (exit {result.returncode}); see {log_path}",
        )
    return output_path


