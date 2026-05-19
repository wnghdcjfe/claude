from __future__ import annotations

import json
from pathlib import Path

import pytest

from md2short.state import (
    JobStatus,
    validate_transition,
    write_status,
)


HAPPY_PATH = [
    (JobStatus.CREATED, JobStatus.SCRIPT_GENERATED),
    (JobStatus.SCRIPT_GENERATED, JobStatus.VOICE_GENERATED),
    (JobStatus.VOICE_GENERATED, JobStatus.TRANSCRIBED),
    (JobStatus.TRANSCRIBED, JobStatus.SUBTITLED),
    (JobStatus.SUBTITLED, JobStatus.FINAL_RENDERED),
    (JobStatus.FINAL_RENDERED, JobStatus.QC_PASSED),
]


@pytest.mark.parametrize("current, next_status", HAPPY_PATH)
def test_happy_path_transitions_allowed(current, next_status):
    assert validate_transition(current, next_status) is True


def test_final_rendered_can_go_to_qc_failed():
    assert validate_transition(JobStatus.FINAL_RENDERED, JobStatus.QC_FAILED) is True


def test_invalid_skip_transition_rejected():
    assert validate_transition(JobStatus.CREATED, JobStatus.FINAL_RENDERED) is False
    assert validate_transition(JobStatus.SCRIPT_GENERATED, JobStatus.QC_PASSED) is False


def test_any_non_terminal_can_fail():
    for s in [
        JobStatus.CREATED,
        JobStatus.SCRIPT_GENERATED,
        JobStatus.VOICE_GENERATED,
        JobStatus.TRANSCRIBED,
        JobStatus.SUBTITLED,
        JobStatus.FINAL_RENDERED,
    ]:
        assert validate_transition(s, JobStatus.FAILED) is True


def test_terminal_cannot_transition():
    assert validate_transition(JobStatus.QC_PASSED, JobStatus.FAILED) is False
    assert validate_transition(JobStatus.QC_FAILED, JobStatus.QC_PASSED) is False
    assert validate_transition(JobStatus.FAILED, JobStatus.QC_PASSED) is False


def test_string_inputs_accepted():
    assert validate_transition("created", "script_generated") is True
    assert validate_transition("created", "final_rendered") is False


def test_write_status_creates_status_file(tmp_path: Path):
    job_dir = tmp_path / "sf_20260514_abcdef"
    payload = write_status(job_dir, JobStatus.CREATED, job_id="sf_20260514_abcdef")
    status_file = job_dir / "status.json"
    assert status_file.exists()
    on_disk = json.loads(status_file.read_text())
    assert on_disk["status"] == "created"
    assert on_disk["job_id"] == "sf_20260514_abcdef"
    assert "started_at" in on_disk
    assert "updated_at" in on_disk
    assert payload == on_disk


def test_write_status_enforces_transition(tmp_path: Path):
    job_dir = tmp_path / "sf_20260514_abcdef"
    write_status(job_dir, JobStatus.CREATED, job_id="sf_20260514_abcdef")
    write_status(
        job_dir,
        JobStatus.SCRIPT_GENERATED,
        job_id="sf_20260514_abcdef",
        previous=JobStatus.CREATED,
    )
    with pytest.raises(ValueError):
        write_status(
            job_dir,
            JobStatus.QC_PASSED,
            job_id="sf_20260514_abcdef",
            previous=JobStatus.SCRIPT_GENERATED,
        )


def test_write_status_preserves_started_at(tmp_path: Path):
    job_dir = tmp_path / "sf_20260514_abcdef"
    first = write_status(job_dir, JobStatus.CREATED, job_id="sf_20260514_abcdef")
    second = write_status(
        job_dir,
        JobStatus.SCRIPT_GENERATED,
        job_id="sf_20260514_abcdef",
        previous=JobStatus.CREATED,
    )
    assert first["started_at"] == second["started_at"]
    assert second["status"] == "script_generated"
