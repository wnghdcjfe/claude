"""Markdown → Korean script fallback extractor.

When the OpenAI script_engine is unavailable (no key, non-Korean leak, API
error), the pipeline demotes to this rule-based path. It performs basic
markdown stripping and a hook / body / cta heuristic split so the rest of
the pipeline (TTS, Scribe, captions) keeps working without an LLM.
"""

from __future__ import annotations

import re
from typing import Any

_MARKDOWN_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+", re.MULTILINE)
_MARKDOWN_BLOCKQUOTE_RE = re.compile(r"^\s{0,3}>\s?", re.MULTILINE)
_MARKDOWN_LIST_BULLET_RE = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_MARKDOWN_LIST_NUMBER_RE = re.compile(r"^\s*\d+\.\s+", re.MULTILINE)
_MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
_MARKDOWN_INLINE_CODE_RE = re.compile(r"`([^`]+)`")
_MARKDOWN_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_MARKDOWN_ITALIC_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
_MARKDOWN_CODEBLOCK_RE = re.compile(r"```[\s\S]*?```", re.MULTILINE)
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")


def strip_markdown(markdown: str) -> str:
    """Convert a markdown document to plain Korean prose."""

    text = _MARKDOWN_CODEBLOCK_RE.sub("", markdown)
    text = _MARKDOWN_IMAGE_RE.sub("", text)
    text = _MARKDOWN_LINK_RE.sub(r"\1", text)
    text = _MARKDOWN_HEADING_RE.sub("", text)
    text = _MARKDOWN_BLOCKQUOTE_RE.sub("", text)
    text = _MARKDOWN_LIST_BULLET_RE.sub("", text)
    text = _MARKDOWN_LIST_NUMBER_RE.sub("", text)
    text = _MARKDOWN_INLINE_CODE_RE.sub(r"\1", text)
    text = _MARKDOWN_BOLD_RE.sub(r"\1", text)
    text = _MARKDOWN_ITALIC_RE.sub(r"\1", text)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)
    return text.strip()


def _split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def fallback_extract(markdown: str) -> dict[str, Any]:
    """Build a hook / body / cta script dict from raw markdown."""

    plain = strip_markdown(markdown)
    paragraphs = _split_paragraphs(plain)
    if not paragraphs:
        return {
            "hook": "",
            "body": "",
            "cta": "",
            "full_text": "",
            "plan": {
                "engine": "fallback_extract",
                "model": None,
                "fallback_reason": "empty_input",
            },
        }

    hook = paragraphs[0]
    cta = paragraphs[-1] if len(paragraphs) > 1 else ""
    body_parts = paragraphs[1:-1] if len(paragraphs) > 2 else (paragraphs[1:] if len(paragraphs) == 2 else [])
    body = "\n\n".join(body_parts)
    full_text = "\n\n".join(p for p in [hook, body, cta] if p)

    return {
        "hook": hook,
        "body": body,
        "cta": cta,
        "full_text": full_text,
        "plan": {
            "engine": "fallback_extract",
            "model": None,
            "fallback_reason": None,
        },
    }
