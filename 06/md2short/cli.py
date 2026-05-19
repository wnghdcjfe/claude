"""Typer multi-command CLI for MD2Short."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Annotated

import typer
from dotenv import load_dotenv

from .pipeline import DEFAULT_OUTPUT_COPY, run_job
from .schema import DEFAULT_VOICES, JobConfig, VisualMode

app = typer.Typer(
    name="md2short",
    help="Markdown to 9:16 Korean shortform MP4 — local CLI",
    no_args_is_help=True,
    add_completion=False,
)


@app.callback()
def _main() -> None:
    """MD2Short — markdown-to-9:16 Korean shortform MP4 generator."""


def _exit(message: str, code: int = 1) -> None:
    typer.echo(message, err=True)
    raise typer.Exit(code=code)


@app.command()
def run(
    markdown_file: Annotated[Path, typer.Argument(exists=False, help="Korean markdown input")],
    lang: Annotated[str, typer.Option("--lang", "-l", help="Output language (ko locked in v1)")] = "ko",
    voice: Annotated[str, typer.Option("--voice", "-v", help="ElevenLabs voice id")] = "",
    speed: Annotated[float, typer.Option("--speed", help="TTS speed 0.7..1.2")] = 1.0,
    template: Annotated[str, typer.Option("--template", "-t", help="Composition template id")] = "tech_explainer",
    chunk_size: Annotated[int, typer.Option("--chunk-size", help="Caption max words/chunk 1..24")] = 8,
    bg: Annotated[str, typer.Option("--bg", help="Background color 0xRRGGBB or #RRGGBB")] = "0xFFFFFF",
    jobs_root: Annotated[Path, typer.Option("--jobs-root", help="Job artifact root")] = Path("jobs"),
    engine: Annotated[str, typer.Option("--engine", help="Render engine (remotion only)")] = "remotion",
    visual_mode: Annotated[str, typer.Option("--visual-mode", help="emoticon | photo")] = "emoticon",
    model: Annotated[str, typer.Option("--model", help="OpenAI script model")] = "gpt-5-mini",
    output: Annotated[Path, typer.Option("--output", "-o", help="Final mp4 copy path (empty disables)")] = DEFAULT_OUTPUT_COPY,
) -> None:
    """Generate a shortform MP4 from a Korean markdown file."""

    if not os.getenv("MD2SHORT_SKIP_DOTENV"):
        load_dotenv()

    if not markdown_file.exists():
        _exit(f"Markdown input not found: {markdown_file}")

    if lang != "ko":
        _exit(f"--lang must be 'ko' in v1 (got: {lang})")
    if engine != "remotion":
        _exit(f"--engine must be 'remotion' in v1 (got: {engine})")
    if visual_mode not in {"emoticon", "photo"}:
        _exit(f"--visual-mode must be 'emoticon' or 'photo' (got: {visual_mode})")
    if not 1 <= chunk_size <= 24:
        _exit(f"--chunk-size must be in [1, 24] (got: {chunk_size})")
    if not 0.7 <= speed <= 1.2:
        _exit(f"--speed must be in [0.7, 1.2] (got: {speed})")

    if not os.getenv("ELEVENLABS_API_KEY"):
        _exit("ELEVENLABS_API_KEY missing from environment / .env")
    if visual_mode == "photo" and not os.getenv("OPENAI_API_KEY"):
        _exit("--visual-mode photo requires OPENAI_API_KEY")

    if visual_mode == "photo":
        _exit("visual_mode='photo' is not wired in the MVP slice; use --visual-mode emoticon")

    bg_color = bg if bg.startswith("0x") else (
        "0x" + bg.lstrip("#") if bg.startswith("#") else bg
    )

    config = JobConfig(
        platform="youtube_shorts",
        language="ko",
        voice_id=(voice or DEFAULT_VOICES["ko"]),
        voice_speed=speed,
        template_id=template,
        bg_color=bg_color,
        chunk_size=chunk_size,
        engine="remotion",
        visual_mode=VisualMode(visual_mode),
        show_opening=True,
        show_outro=False,
    )

    try:
        result = run_job(
            markdown_file,
            config,
            jobs_root=jobs_root,
            output_path=output if str(output) else None,
        )
    except FileNotFoundError as exc:
        _exit(str(exc))
        return
    except Exception as exc:  # noqa: BLE001 — surface stage errors with exit 2
        typer.echo(f"Pipeline error: {exc}", err=True)
        raise typer.Exit(code=2) from exc

    typer.echo(
        f"Job {result.job_id} status={result.final_status.value} "
        f"root={result.paths.root}",
    )
    typer.echo(
        "Stages 1..8 (script→voice→transcript→planner→render→QC) land in US-004..US-009.",
    )


if __name__ == "__main__":
    sys.exit(app())
