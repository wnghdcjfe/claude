"""File-based job state machine.

Canonical statuses live in ``jobs/<job_id>/status.json``. Progress events
(``photo_generating``, ``photos_generated``, ``photo_fallback``) are surfaced
through the ``on_stage`` callback only — never written to ``status.json``
(``docs/architecture.md`` §3.1).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any


class JobStatus(str, Enum):
    CREATED = "created"
    SCRIPT_GENERATED = "script_generated"
    VOICE_GENERATED = "voice_generated"
    TRANSCRIBED = "transcribed"
    SUBTITLED = "subtitled"
    FINAL_RENDERED = "final_rendered"
    QC_PASSED = "qc_passed"
    QC_FAILED = "qc_failed"
    FAILED = "failed"


TERMINAL_STATUSES: frozenset[JobStatus] = frozenset(
    {JobStatus.QC_PASSED, JobStatus.QC_FAILED, JobStatus.FAILED},
)

# Happy-path forward edges from architecture.md §3.
_FORWARD_EDGES: dict[JobStatus, frozenset[JobStatus]] = {
    JobStatus.CREATED: frozenset({JobStatus.SCRIPT_GENERATED}),
    JobStatus.SCRIPT_GENERATED: frozenset({JobStatus.VOICE_GENERATED}),
    JobStatus.VOICE_GENERATED: frozenset({JobStatus.TRANSCRIBED}),
    JobStatus.TRANSCRIBED: frozenset({JobStatus.SUBTITLED}),
    JobStatus.SUBTITLED: frozenset({JobStatus.FINAL_RENDERED}),
    JobStatus.FINAL_RENDERED: frozenset({JobStatus.QC_PASSED, JobStatus.QC_FAILED}),
}


def _coerce(value: JobStatus | str) -> JobStatus:
    if isinstance(value, JobStatus):
        return value
    return JobStatus(value)


def validate_transition(current: JobStatus | str, next_status: JobStatus | str) -> bool:
    """Return True iff ``current -> next_status`` is allowed.

    The rule (``architecture.md`` §3): any non-terminal status may also
    transition to ``failed`` regardless of forward edges.
    """

    current_s = _coerce(current)
    next_s = _coerce(next_status)

    if current_s in TERMINAL_STATUSES:
        return False
    if next_s == JobStatus.FAILED:
        return True
    return next_s in _FORWARD_EDGES.get(current_s, frozenset())


def write_status(
    job_dir: Path | str,
    status: JobStatus | str,
    *,
    job_id: str,
    previous: JobStatus | str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Persist ``status.json`` enforcing the state machine.

    If ``previous`` is provided, ``validate_transition(previous, status)`` must
    succeed; otherwise a ``ValueError`` is raised. ``status.json`` is rewritten
    atomically — caller passes whatever extra metadata (config, paths, qc
    summary) is appropriate for the new status.
    """

    job_path = Path(job_dir)
    job_path.mkdir(parents=True, exist_ok=True)
    status_s = _coerce(status)
    if previous is not None and not validate_transition(previous, status_s):
        raise ValueError(
            f"Invalid status transition: {_coerce(previous).value} -> {status_s.value}",
        )

    status_file = job_path / "status.json"
    now = datetime.now(timezone.utc).isoformat()
    payload: dict[str, Any] = {}
    if status_file.exists():
        try:
            payload = json.loads(status_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = {}

    payload.setdefault("job_id", job_id)
    payload.setdefault("started_at", now)
    payload["status"] = status_s.value
    payload["updated_at"] = now
    payload.update(extra)

    status_file.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return payload
