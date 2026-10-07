"""Centralised configuration.

Every tunable in ReverseX lives here. Nothing outside this module reads ``os.environ``,
so the set of knobs is discoverable in one place and a typo in an env var name fails
loudly at startup instead of silently changing behaviour.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_ALLOWED_PORTS = frozenset({80, 443})

# ``src/weblens/config.py`` -> ``backend/``. Resolved from the module rather than the process
# working directory, because the API is started from the repository root by `make dev-backend`
# but its dotenv and writable state live under ``backend/``.
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

# Query-string parameter names whose values are replaced before evidence is created.
# Redaction happens at collection time so a secret never enters the evidence graph at all.
SENSITIVE_QUERY_PARAMS = frozenset(
    {
        "access_token",
        "api_key",
        "apikey",
        "auth",
        "code",
        "credential",
        "id_token",
        "key",
        "password",
        "pwd",
        "refresh_token",
        "secret",
        "session",
        "sig",
        "signature",
        "token",
    }
)

# Request headers that are never captured into evidence, in either direction.
NEVER_CAPTURED_HEADERS = frozenset(
    {
        "authorization",
        "cookie",
        "proxy-authorization",
        "set-cookie",  # parsed into attribute observations instead; values are dropped
        "x-api-key",
        "x-auth-token",
        "x-csrf-token",
    }
)


class Settings(BaseSettings):
    """Runtime configuration, populated from ``WEBLENS_*`` environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="WEBLENS_",
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Server ---
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = False
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )

    # --- Logging ---
    log_format: str = Field(default="text", pattern="^(text|json)$")
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

    # --- Scan budgets (milliseconds) ---
    navigation_timeout_ms: int = Field(default=30_000, ge=1_000, le=120_000)
    settle_timeout_ms: int = Field(default=5_000, ge=0, le=30_000)
    total_scan_budget_ms: int = Field(default=90_000, ge=5_000, le=600_000)
    http_timeout_ms: int = Field(default=15_000, ge=1_000, le=60_000)
    analyzer_timeout_ms: int = Field(default=5_000, ge=100, le=60_000)

    # --- Politeness and concurrency ---
    max_concurrent_scans: int = Field(default=2, ge=1, le=16)
    max_concurrent_scans_per_host: int = Field(default=1, ge=1, le=4)
    min_host_interval_seconds: float = Field(default=5.0, ge=0.0, le=300.0)
    respect_robots: bool = True
    max_redirects: int = Field(default=5, ge=0, le=20)
    probe_http_downgrade: bool = True

    # --- Evidence caps ---
    max_body_bytes: int = Field(default=2 * 1024 * 1024, ge=1024)
    max_network_requests_recorded: int = Field(default=400, ge=10)
    max_style_samples: int = Field(default=1500, ge=50)

    # --- Result buffer ---
    result_ttl_seconds: int = Field(default=900, ge=30, le=86_400)
    max_retained_results: int = Field(default=25, ge=1, le=500)

    # --- Target guard ---
    allowed_extra_ports: list[int] = Field(default_factory=list)
    allow_private_targets: bool = False
    """TEST ONLY. Permits loopback/private targets so the live suite can scan a local
    dev server. Enabling this on a reachable deployment turns the API into an internal
    network probe."""

    # --- Security scoring ---
    minimum_applicable_points: float = Field(default=40.0, ge=0.0, le=100.0)

    # --- Public usage counter ---
    stats_enabled: bool = True
    """Count completed scans so the site can show how much analysis this deployment has done.
    Only aggregate totals are stored: never a URL, host, or anything about a target."""

    stats_path: Path = Field(default_factory=lambda: BACKEND_ROOT / "var" / "stats.json")

    # --- Support contact ---
    contact_enabled: bool = False
    contact_to_email: str = ""
    contact_from_email: str = ""
    contact_smtp_host: str = ""
    contact_smtp_port: int = Field(default=587, ge=1, le=65_535)
    contact_smtp_username: str = ""
    contact_smtp_password: SecretStr = Field(default_factory=lambda: SecretStr(""))
    contact_smtp_security: Literal["starttls", "ssl"] = "starttls"
    contact_smtp_timeout_seconds: float = Field(default=10.0, gt=0.0, le=60.0)
    contact_rate_limit_requests: int = Field(default=5, ge=1, le=100)
    contact_rate_limit_window_seconds: float = Field(default=3600.0, ge=1.0, le=86_400.0)
    contact_rate_limit_max_clients: int = Field(default=10_000, ge=100, le=100_000)

    # --- GitHub analysis ---
    github_token: str = Field(default="")
    """Optional GitHub personal access token. Raises GitHub API rate limit from 60 to 5000
    requests/hour. Required only for private repositories (not supported in V1)."""

    # --- Optional AI layer ---
    ai_provider: str = Field(default="none", pattern="^(none)$")
    """Only ``none`` is accepted in V1. The provider protocol exists; no implementation
    ships in the default install path."""

    # --- LLM-based prompt synthesis (GitReverse-style) ---
    llm_provider: str = Field(default="none", pattern="^(none|openai|anthropic|ollama)$")
    """LLM provider for natural-language prompt synthesis. Options:
    - none: Use structured template-based prompts (default, no external API calls)
    - openai: OpenAI/Azure OpenAI/compatible endpoints
    - anthropic: Claude API
    - ollama: Local Ollama server"""

    llm_api_key: str = Field(default="")
    """API key for OpenAI or Anthropic. Not required for Ollama."""

    llm_model: str = Field(default="gpt-4o-mini")
    """Model to use. Examples:
    - OpenAI: gpt-4o-mini, gpt-4o, gpt-4-turbo
    - Anthropic: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
    - Ollama: llama3.1, qwen2.5, mistral"""

    llm_base_url: str = Field(default="https://api.openai.com/v1")
    """Base URL for LLM API. Defaults:
    - OpenAI: https://api.openai.com/v1
    - Anthropic: https://api.anthropic.com/v1
    - Ollama: http://localhost:11434"""

    llm_timeout_seconds: float = Field(default=30.0, ge=5.0, le=120.0)
    """HTTP timeout for LLM API calls."""

    # --- V2: Research and inference ---
    search_provider: str = Field(default="none")
    """Public research search provider name. ``none`` means research is skipped.
    Supported: ``none``, ``brave``."""

    brave_api_key: str = Field(default="")
    """API key for Brave Search. Required when search_provider is 'brave'."""

    inference_provider: str = Field(default="none")
    """AI inference provider name. ``none`` means inference is skipped."""

    inference_api_key: str = Field(default="")
    """API key for the AI inference provider (e.g., OpenAI, Groq)."""

    inference_model: str = Field(default="")
    """Model name for the inference provider."""

    traffic_provider: str = Field(default="none")
    """Traffic data provider name. ``none`` means traffic data is unavailable."""

    @field_validator("cors_origins", "allowed_extra_ports", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Accept comma-separated env values as well as JSON lists."""
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return value
            return [part.strip() for part in stripped.split(",") if part.strip()]
        return value

    @property
    def allowed_ports(self) -> frozenset[int]:
        return DEFAULT_ALLOWED_PORTS | frozenset(self.allowed_extra_ports)

    @property
    def http_timeout_seconds(self) -> float:
        return self.http_timeout_ms / 1000

    @property
    def total_scan_budget_seconds(self) -> float:
        return self.total_scan_budget_ms / 1000


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton (FastAPI dependency and internal callers)."""
    return Settings()
