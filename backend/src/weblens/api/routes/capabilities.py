"""Capabilities: what this build can actually do."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from weblens.api.deps import SettingsDep
from weblens.version import ENGINE_VERSION, SCHEMA_VERSION

router = APIRouter(tags=["meta"])


class SourceCapability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_type: str
    description: str
    example: str


class CapabilitiesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    engine_version: str
    schema_version: str
    collection_mode: str
    github_analysis: bool
    website_analysis: bool
    sources: list[SourceCapability]
    github_rate_limited: bool


@router.get(
    "/capabilities",
    response_model=CapabilitiesResponse,
    summary="What this build can analyze",
)
async def capabilities(settings: SettingsDep) -> CapabilitiesResponse:
    github_token_set = bool(getattr(settings, "github_token", ""))
    return CapabilitiesResponse(
        engine_version=ENGINE_VERSION,
        schema_version=SCHEMA_VERSION,
        collection_mode="browser",
        github_analysis=True,
        website_analysis=True,
        github_rate_limited=not github_token_set,
        sources=[
            SourceCapability(
                source_type="website",
                description="Publicly reachable http/https URL",
                example="https://example.com",
            ),
            SourceCapability(
                source_type="github_repo",
                description="GitHub repository URL or owner/repo identifier",
                example="https://github.com/owner/repo",
            ),
        ],
    )
