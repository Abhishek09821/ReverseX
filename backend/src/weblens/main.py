"""Application factory and lifespan.

Components are constructed once here and attached to ``app.state``, which keeps wiring in one
readable place and lets tests swap the collector or the guard by overriding a single attribute.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weblens.api.problems import register_exception_handlers
from weblens.api.router import api_router, root_router
from weblens.collection.base import Collector
from weblens.collection.browser_collector import BrowserEvidenceCollector
from weblens.collection.target import TargetGuard
from weblens.config import Settings, get_settings
from weblens.logging import configure_logging, get_logger
from weblens.orchestration.job_store import InMemoryJobStore, periodic_sweep
from weblens.orchestration.stats import UsageCounter
from weblens.reconstruction.service import ReconstructionService
from weblens.version import ENGINE_VERSION

logger = get_logger(__name__)

DESCRIPTION = """
ReverseX — GitReverse-style reconstruction prompt generator.

Input a **website URL** or **GitHub repository** URL → ReverseX analyzes it →
returns **one optimized, copy-paste-ready reconstruction prompt** for AI coding agents.

Two input types are supported:
- **Website URL** (`http://` or `https://`): crawls and analyzes the public page
- **GitHub repository** (`github.com/owner/repo` or `owner/repo`): analyzes structure and stack
""".strip()


def create_app(
    settings: Settings | None = None,
    collector: Collector | None = None,
    guard: TargetGuard | None = None,
) -> FastAPI:
    """Build the application."""
    resolved = settings or get_settings()
    configure_logging(level=resolved.log_level, fmt=resolved.log_format)

    app = FastAPI(
        title="ReverseX API",
        version=ENGINE_VERSION,
        description=DESCRIPTION,
        lifespan=_lifespan,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.settings = resolved
    app.state.collector_override = collector
    app.state.guard_override = guard

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    register_exception_handlers(app)
    app.include_router(root_router)
    app.include_router(api_router)
    return app


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings

    guard: TargetGuard = getattr(app.state, "guard_override", None) or TargetGuard(settings)
    store = InMemoryJobStore(settings)
    override: Collector | None = getattr(app.state, "collector_override", None)
    collector: Collector = override or BrowserEvidenceCollector(settings, guard)

    usage_counter = UsageCounter(settings.stats_path, enabled=settings.stats_enabled)

    app.state.target_guard = guard
    app.state.job_store = store
    app.state.collector = collector
    app.state.usage_counter = usage_counter

    # Wire up the reconstruction service (replaces the old ScanService)
    reconstruction_service = ReconstructionService(
        settings,
        guard,
        collector,
    )
    app.state.reconstruction_service = reconstruction_service

    sweeper = asyncio.create_task(periodic_sweep(store), name="weblens-job-sweeper")

    logger.info(
        "reversex started",
        extra={
            "engine_version": ENGINE_VERSION,
            "collection_mode": collector.collection_mode,
        },
    )
    if settings.allow_private_targets:
        logger.warning(
            "allow_private_targets is enabled: the API will scan loopback and private addresses. "
            "This is a test-only setting."
        )

    try:
        yield
    finally:
        sweeper.cancel()
        with suppress(asyncio.CancelledError):
            await sweeper
        logger.info("reversex stopped")


app = create_app()
