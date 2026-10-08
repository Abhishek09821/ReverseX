"""Reconstruction pipeline.

Sequences evidence collection (for websites) or GitHub analysis (for repos)
and produces a single reconstruction prompt.
"""

from __future__ import annotations

from weblens.collection.base import Collector
from weblens.collection.target import NormalizedTarget
from weblens.config import Settings
from weblens.domain.enums import ScanStatus, StageKey
from weblens.domain.errors import ReverseXError
from weblens.domain.reconstruction import (
    ReconstructionMetadata,
    ReconstructionPrompt,
    ReconstructionResult,
    SourceType,
)
from weblens.domain.scan import ScanOptions
from weblens.github.analyzer import GitHubRepoAnalyzer
from weblens.github.client import GitHubClient, RepoNotFoundError, parse_github_url
from weblens.logging import get_logger
from weblens.orchestration.job_store import Job
from weblens.orchestration.progress import ProgressChannel
from weblens.reconstruction.prompt_generator import PromptGenerator
from weblens.reconstruction.website_summarizer import WebsiteSummarizer
from weblens.utils.timing import Stopwatch, utc_now

logger = get_logger(__name__)


class ReconstructionPipeline:
    """Runs the full analysis pipeline and produces a ReconstructionResult."""

    def __init__(
        self,
        settings: Settings,
        collector: Collector,
        github_token: str | None = None,
    ) -> None:
        self._settings = settings
        self._collector = collector
        self._generator = PromptGenerator(settings)
        self._github_token = github_token

        # Use GitReverse engine if LLM is configured
        self._use_gitreverse = settings.llm_provider != "none"
        if self._use_gitreverse:
            try:
                from weblens.reconstruction.gitreverse_engine import GitReverseEngine
                self._gitreverse_engine = GitReverseEngine(settings)
                logger.info("GitReverse engine enabled (LLM provider configured)")
            except Exception as e:
                logger.warning(f"GitReverse engine initialization failed: {e}, using fallback")
                self._use_gitreverse = False
                self._gitreverse_engine = None
        else:
            self._gitreverse_engine = None
            logger.info("Using structured prompts (LLM provider=none)")

    async def run(self, job: Job, target: NormalizedTarget) -> ReconstructionResult:
        """Execute the pipeline for the given job and target."""
        channel = job.channel
        watch = Stopwatch()

        await channel.mark_running()
        await channel.stage_started(StageKey.VALIDATE)
        await channel.stage_completed(StageKey.VALIDATE)

        parsed = parse_github_url(target.requested_url)
        source_type = SourceType.GITHUB_REPO if parsed else SourceType.WEBSITE

        try:
            if source_type == SourceType.GITHUB_REPO and parsed is not None:
                prompt = await self._run_github(
                    parsed[0], parsed[1], target.requested_url, channel
                )
                github_info = None
                try:
                    async with GitHubClient(token=self._github_token) as client:
                        github_info = await client.get_repo_info(parsed[0], parsed[1])
                except Exception:
                    logger.debug("GitHub repo info fetch failed, continuing without it")
            else:
                prompt = await self._run_website(target, job.options, channel)
                github_info = None
        except ReverseXError:
            raise
        except Exception as exc:
            raise ReverseXError(f"Pipeline failed: {exc}") from exc

        await channel.finalize_pending(
            "Not required for this source type.",
            exclude=(StageKey.ASSEMBLE,),
        )
        await channel.stage_started(StageKey.ASSEMBLE)

        result = ReconstructionResult(
            metadata=ReconstructionMetadata(
                scan_id=job.scan_id,
                status=ScanStatus.COMPLETED,
                source_type=source_type,
                source_url=target.requested_url,
                created_at=job.created_at,
                started_at=channel.started_at,
                finished_at=utc_now(),
                duration_ms=watch.elapsed_ms(),
            ),
            prompt=prompt,
            github_info=github_info,
        )
        await channel.stage_completed(StageKey.ASSEMBLE)
        return result

    async def _run_website(
        self,
        target: NormalizedTarget,
        options: ScanOptions,
        channel: ProgressChannel,
    ) -> ReconstructionPrompt:
        """Collect website evidence and generate prompt."""
        await channel.stage_started(StageKey.HTTP_PROBE)
        outcome = await self._collector.collect(target, options, channel)
        await channel.stage_completed(StageKey.HTTP_PROBE)

        await channel.stage_started(StageKey.ANALYZE)
        summarizer = WebsiteSummarizer()
        findings = summarizer.summarize(outcome.evidence)

        # Use GitReverse engine if available, otherwise fallback to structured
        if self._use_gitreverse and self._gitreverse_engine:
            logger.info(f"Using GitReverse engine for {target.requested_url}")
            prompt = await self._gitreverse_engine.generate_prompt(
                target.requested_url, outcome.evidence, findings
            )
        else:
            logger.info(f"Using structured prompt generator for {target.requested_url}")
            prompt = await self._generator.generate_from_website(
                target.requested_url, outcome.evidence, findings
            )

        await channel.stage_completed(StageKey.ANALYZE)
        return prompt

    async def _run_github(
        self,
        owner: str,
        repo: str,
        original_url: str,
        channel: ProgressChannel,
    ) -> ReconstructionPrompt:
        """Fetch GitHub repo data and generate prompt."""
        await channel.stage_started(StageKey.HTTP_PROBE)
        try:
            async with GitHubClient(token=self._github_token) as client:
                analyzer = GitHubRepoAnalyzer(client)
                repo_info = await client.get_repo_info(owner, repo)
                readme = await client.get_readme(owner, repo, repo_info.default_branch)
                structure = await analyzer.analyze_structure(
                    owner, repo, repo_info.default_branch
                )
                stack = await analyzer.detect_stack(
                    owner, repo, repo_info.default_branch, readme
                )
        except RepoNotFoundError as exc:
            raise ReverseXError(str(exc)) from exc
        await channel.stage_completed(StageKey.HTTP_PROBE)

        await channel.stage_started(StageKey.ANALYZE)
        prompt = await self._generator.generate_from_github(
            original_url, repo_info, structure, stack, readme
        )
        await channel.stage_completed(StageKey.ANALYZE)
        return prompt
