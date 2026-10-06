"""Reconstruction service.

Handles admission, scheduling, and failure translation for reconstruction jobs.
Mirrors the existing ScanService pattern so the API layer stays thin.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime

from weblens.collection.base import Collector
from weblens.collection.target import NormalizedTarget, TargetGuard
from weblens.config import Settings
from weblens.domain.enums import ScanStatus
from weblens.domain.errors import (
    ProblemDetail,
    RateLimitedError,
    ReverseXError,
    ScanInProgressError,
    ScanNotFoundError,
)
from weblens.domain.reconstruction import (
    ReconstructionAcceptedResponse,
    ReconstructionJobState,
    ReconstructionRequest,
    ReconstructionResult,
    SourceType,
)
from weblens.github.client import parse_github_url
from weblens.logging import get_logger
from weblens.orchestration.job_store import Job
from weblens.orchestration.progress import ProgressChannel
from weblens.reconstruction.pipeline import ReconstructionPipeline
from weblens.utils.ids import new_ulid
from weblens.utils.timing import utc_now

logger = get_logger(__name__)


@dataclass
class ReconstructionJob:
    scan_id: str
    source_url: str
    source_type: SourceType
    channel: ProgressChannel
    created_at: datetime = field(default_factory=utc_now)
    result: ReconstructionResult | None = None
    task: asyncio.Task[None] | None = None
    completed_at: datetime | None = None


class ReconstructionService:
    """Manages reconstruction jobs for websites and GitHub repositories."""

    def __init__(
        self,
        settings: Settings,
        guard: TargetGuard,
        collector: Collector,
    ) -> None:
        self._settings = settings
        self._guard = guard
        self._pipeline = ReconstructionPipeline(
            settings,
            collector,
            github_token=getattr(settings, "github_token", None),
        )
        self._jobs: dict[str, ReconstructionJob] = {}
        self._lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_scans)

    async def submit(self, request: ReconstructionRequest) -> ReconstructionAcceptedResponse:
        """Validate, admit, and schedule a reconstruction job."""
        url = request.url.strip()
        parsed = parse_github_url(url)

        if parsed:
            source_type = SourceType.GITHUB_REPO
            owner, repo = parsed
            normalized_url = f"https://github.com/{owner}/{repo}"
            target = None  # GitHub jobs don't use NormalizedTarget
        else:
            source_type = SourceType.WEBSITE
            normalized_url = url
            target = await self._guard.prepare(url)
            normalized_url = target.display_url

        # Admission: cap concurrent scans
        active = sum(
            1 for j in self._jobs.values()
            if j.task is not None and not j.task.done()
        )
        if active >= self._settings.max_concurrent_scans:
            raise RateLimitedError(
                f"Too many concurrent analyses ({active}). Try again shortly.",
                retry_after_seconds=10,
            )

        scan_id = new_ulid()
        channel = ProgressChannel(scan_id=scan_id, requested_url=url)
        job = ReconstructionJob(
            scan_id=scan_id,
            source_url=url,
            source_type=source_type,
            channel=channel,
        )

        async with self._lock:
            self._jobs[scan_id] = job

        if source_type == SourceType.GITHUB_REPO:
            job.task = asyncio.create_task(
                self._execute_github(job, owner, repo),  # type: ignore[arg-type]
                name=f"reversex-github-{scan_id}",
            )
        else:
            if target is None:
                raise RuntimeError("target must not be None for website reconstruction")
            job.task = asyncio.create_task(
                self._execute_website(job, target),
                name=f"reversex-scan-{scan_id}",
            )

        logger.info(
            "reconstruction accepted",
            extra={"scan_id": scan_id, "source_type": source_type.value},
        )
        return ReconstructionAcceptedResponse(
            scan_id=scan_id,
            status=ScanStatus.QUEUED,
            source_type=source_type,
            source_url=url,
            normalized_url=normalized_url,
            created_at=job.created_at,
            links={
                "self": f"/api/v1/reconstruct/{scan_id}",
                "events": f"/api/v1/reconstruct/{scan_id}/events",
                "result": f"/api/v1/reconstruct/{scan_id}/result",
            },
        )

    async def job_state(self, scan_id: str) -> ReconstructionJobState:
        job = await self._require(scan_id)
        snapshot = job.channel.snapshot()
        return ReconstructionJobState(
            scan_id=scan_id,
            status=snapshot.status,
            source_type=job.source_type,
            source_url=job.source_url,
            created_at=job.created_at,
            started_at=snapshot.started_at,
            finished_at=snapshot.finished_at,
            current_stage=snapshot.progress.current_stage_label,
            progress_percent=_progress_percent(snapshot),
            error_message=snapshot.problem.detail if snapshot.problem else None,
        )

    async def result(self, scan_id: str) -> ReconstructionResult:
        job = await self._require(scan_id)
        if job.result is not None:
            return job.result
        snap = job.channel.snapshot()
        if snap.status.is_terminal:
            raise ReverseXError(
                "The analysis finished without producing a result. See job state for the error."
            )
        raise ScanInProgressError(f"Analysis {scan_id} is {snap.status.value}.")

    async def channel(self, scan_id: str) -> ProgressChannel:
        return (await self._require(scan_id)).channel

    async def delete(self, scan_id: str) -> None:
        async with self._lock:
            job = self._jobs.pop(scan_id, None)
        if job and job.task and not job.task.done():
            job.task.cancel()

    # ── execution ──────────────────────────────────────────────────────

    async def _execute_website(self, job: ReconstructionJob, target: object) -> None:
        from weblens.collection.target import NormalizedTarget  # avoid circular
        if not isinstance(target, NormalizedTarget):
            raise TypeError(f"Expected NormalizedTarget, got {type(target)}")
        normalized: NormalizedTarget = target
        await self._run(job, lambda: self._pipeline.run(
            self._make_job(job), normalized
        ))

    async def _execute_github(
        self, job: ReconstructionJob, owner: str, repo: str
    ) -> None:
        # For GitHub we create a stub target
        stub = _make_github_target(job.source_url, owner, repo)
        await self._run(job, lambda: self._pipeline.run(
            self._make_job(job), stub
        ))

    async def _run(
        self,
        job: ReconstructionJob,
        runner: Callable[[], Awaitable[ReconstructionResult]],
    ) -> None:
        async with self._semaphore:
            try:
                if not callable(runner):
                    raise TypeError(f"runner must be callable, got {type(runner)}")
                result = await runner()
                job.result = result
                job.completed_at = utc_now()
                await job.channel.mark_finished(ScanStatus.COMPLETED)
            except ReverseXError as exc:
                logger.warning(
                    "reconstruction failed",
                    extra={"scan_id": job.scan_id, "error": str(exc)},
                )
                await job.channel.mark_failed(ProblemDetail.from_error(exc))
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception(
                    "unexpected reconstruction failure",
                    extra={"scan_id": job.scan_id},
                )
                wrapped = ReverseXError(f"Unexpected error: {type(exc).__name__}: {exc}")
                await job.channel.mark_failed(ProblemDetail.from_error(wrapped))

    def _make_job(self, rjob: ReconstructionJob) -> Job:
        """Create a pipeline-compatible Job from a ReconstructionJob."""
        from weblens.domain.scan import ScanOptions
        from weblens.orchestration.job_store import Job as PipelineJob
        return PipelineJob(
            scan_id=rjob.scan_id,
            requested_url=rjob.source_url,
            normalized_url=rjob.source_url,
            host=rjob.source_url,
            options=ScanOptions(),
            channel=rjob.channel,
            created_at=rjob.created_at,
        )

    async def _require(self, scan_id: str) -> ReconstructionJob:
        async with self._lock:
            job = self._jobs.get(scan_id)
        if job is None:
            raise ScanNotFoundError(
                f"No analysis with id {scan_id!r} is buffered. "
                "Results are released once the client stores them."
            )
        return job


def _progress_percent(snapshot: object) -> int:
    from weblens.domain.scan import ScanJobState
    if not isinstance(snapshot, ScanJobState):
        return 0
    total = snapshot.progress.total_weight
    if total == 0:
        return 0
    return min(100, int(snapshot.progress.completed_weight * 100 / total))


def _make_github_target(url: str, owner: str, repo: str) -> NormalizedTarget:
    """Create a minimal NormalizedTarget for GitHub URLs."""
    from typing import ClassVar

    class _MinimalTarget:
        requested_url = url
        display_url = f"https://github.com/{owner}/{repo}"
        host = f"github.com/{owner}/{repo}"
        port = 443
        scheme = "https"
        resolved_ips: ClassVar[list[str]] = []

    return _MinimalTarget()  # type: ignore[return-value]
