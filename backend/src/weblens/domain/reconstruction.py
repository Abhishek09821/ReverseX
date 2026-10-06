"""Reconstruction prompt models for GitReverse-style output.

Replaces the multi-section analysis with a single, high-quality reconstruction prompt
that tells an AI coding agent how to rebuild the analyzed website or project.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from weblens.domain.enums import ScanStatus
from weblens.utils.timing import utc_now
from weblens.version import ENGINE_VERSION, SCHEMA_VERSION


class SourceType(StrEnum):
    """Type of source that was analyzed."""

    WEBSITE = "website"
    GITHUB_REPO = "github_repo"


class ReconstructionPrompt(BaseModel):
    """The single output: a prompt for rebuilding the analyzed target."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    prompt: str = Field(
        description="Natural language reconstruction prompt for an AI coding agent."
    )
    source_type: SourceType
    source_url: str = Field(description="Original URL or GitHub repository URL that was analyzed.")
    confidence: str = Field(
        description="Overall confidence: 'high', 'medium', or 'low' based on evidence quality."
    )
    limitations: list[str] = Field(
        default_factory=list,
        description="What could not be determined from public observation.",
    )
    metadata: dict[str, str | int | bool | None] = Field(
        default_factory=dict,
        description="Extracted metadata (tech stack, features, complexity estimate, etc.)",
    )


class GitHubRepoInfo(BaseModel):
    """Information extracted from a GitHub repository."""

    model_config = ConfigDict(extra="forbid")

    owner: str
    repo: str
    full_name: str
    description: str | None = None
    default_branch: str = "main"
    stars: int = 0
    forks: int = 0
    language: str | None = None
    topics: list[str] = Field(default_factory=list)
    license: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    size_kb: int = 0
    is_private: bool = False
    is_fork: bool = False
    homepage: str | None = None


class RepoStructure(BaseModel):
    """Repository file structure analysis."""

    model_config = ConfigDict(extra="forbid")

    total_files: int = 0
    total_directories: int = 0
    main_directories: list[str] = Field(
        default_factory=list, description="Top-level directories in the repo."
    )
    key_files: list[str] = Field(
        default_factory=list,
        description="Important files (README, package.json, requirements.txt, etc.).",
    )
    has_tests: bool = False
    has_docs: bool = False
    has_ci_cd: bool = False


class DetectedStack(BaseModel):
    """Detected technology stack from repository analysis."""

    model_config = ConfigDict(extra="forbid")

    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    package_managers: list[str] = Field(default_factory=list)
    confidence: str = "medium"


class ReconstructionMetadata(BaseModel):
    """Metadata about the reconstruction analysis."""

    model_config = ConfigDict(extra="forbid")

    scan_id: str
    status: ScanStatus
    source_type: SourceType
    source_url: str
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: float | None = None
    engine_version: str = ENGINE_VERSION
    schema_version: str = SCHEMA_VERSION


class ReconstructionResult(BaseModel):
    """Complete reconstruction analysis result."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str = SCHEMA_VERSION
    metadata: ReconstructionMetadata
    prompt: ReconstructionPrompt
    # Optional: preserve repo info for GitHub sources
    github_info: GitHubRepoInfo | None = None
    repo_structure: RepoStructure | None = None
    detected_stack: DetectedStack | None = None


class ReconstructionRequest(BaseModel):
    """Request to analyze a website or GitHub repository."""

    model_config = ConfigDict(extra="forbid")

    url: str = Field(
        min_length=3,
        max_length=2048,
        description="Website URL (http/https) or GitHub repository URL/identifier.",
    )
    include_screenshot: bool = Field(
        default=True, description="Include screenshot for website analysis (ignored for GitHub)."
    )


class ReconstructionAcceptedResponse(BaseModel):
    """Response when reconstruction analysis is accepted."""

    model_config = ConfigDict(extra="forbid")

    scan_id: str
    status: ScanStatus
    source_type: SourceType
    source_url: str
    normalized_url: str
    created_at: datetime
    links: dict[str, str]


class ReconstructionJobState(BaseModel):
    """Current state of a reconstruction job."""

    model_config = ConfigDict(extra="forbid")

    scan_id: str
    status: ScanStatus
    source_type: SourceType
    source_url: str
    created_at: datetime = Field(default_factory=utc_now)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    current_stage: str | None = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    error_message: str | None = None
