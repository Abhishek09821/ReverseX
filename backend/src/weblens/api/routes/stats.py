"""Aggregate usage statistics.

A single public total, so the site can state how much analysis this deployment has performed
without inventing a number. Nothing here identifies a target or a visitor.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from weblens.api.deps import UsageCounterDep

router = APIRouter(tags=["meta"])


class StatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_scans: int = Field(
        description="Completed scans recorded by this deployment. Aggregate only.",
    )
    counting_since: str | None = Field(
        default=None,
        description="When counting began, or null if nothing has been counted yet.",
    )
    enabled: bool = Field(
        description="False when the deployment disabled counting; total_scans is then 0.",
    )


@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Aggregate scan count for this deployment",
)
async def stats(counter: UsageCounterDep) -> StatsResponse:
    current = await counter.read()
    return StatsResponse(
        total_scans=current.total_scans,
        counting_since=current.counting_since,
        enabled=counter.enabled,
    )
