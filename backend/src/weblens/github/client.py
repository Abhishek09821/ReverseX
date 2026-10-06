"""GitHub API client for repository analysis."""

from __future__ import annotations

import re
from typing import Any

import httpx

from weblens.domain.errors import ReverseXError
from weblens.domain.reconstruction import GitHubRepoInfo
from weblens.logging import get_logger

logger = get_logger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GITHUB_TIMEOUT = 30.0
USER_AGENT = "ReverseX-RepoAnalyzer/0.1.0"


class GitHubClientError(ReverseXError):
    """GitHub API client errors."""


class RepoNotFoundError(GitHubClientError):
    """Repository not found or not accessible."""


class RateLimitError(GitHubClientError):
    """GitHub API rate limit exceeded."""


class GitHubClient:
    """Client for GitHub API v3."""

    def __init__(self, token: str | None = None) -> None:
        self._token = token
        self._client = httpx.AsyncClient(
            base_url=GITHUB_API_BASE,
            timeout=GITHUB_TIMEOUT,
            headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github.v3+json"},
        )
        if self._token:
            self._client.headers["Authorization"] = f"Bearer {self._token}"

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> GitHubClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()

    async def get_repo_info(self, owner: str, repo: str) -> GitHubRepoInfo:
        """Fetch repository information."""
        url = f"/repos/{owner}/{repo}"
        try:
            response = await self._client.get(url)
            if response.status_code == 404:
                raise RepoNotFoundError(
                    f"Repository {owner}/{repo} not found or not accessible."
                )
            if response.status_code == 403 and "rate limit" in response.text.lower():
                raise RateLimitError("GitHub API rate limit exceeded. Try again later.")
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError as exc:
            raise GitHubClientError(f"GitHub API error: {exc}") from exc
        except httpx.RequestError as exc:
            raise GitHubClientError(f"GitHub API request failed: {exc}") from exc

        return GitHubRepoInfo(
            owner=data["owner"]["login"],
            repo=data["name"],
            full_name=data["full_name"],
            description=data.get("description"),
            default_branch=data.get("default_branch", "main"),
            stars=data.get("stargazers_count", 0),
            forks=data.get("forks_count", 0),
            language=data.get("language"),
            topics=data.get("topics", []),
            license=data.get("license", {}).get("spdx_id") if data.get("license") else None,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            size_kb=data.get("size", 0),
            is_private=data.get("private", False),
            is_fork=data.get("fork", False),
            homepage=data.get("homepage"),
        )

    async def get_readme(self, owner: str, repo: str, branch: str = "main") -> str | None:
        """Fetch README content."""
        # Try common README names
        for name in ["README.md", "README.MD", "readme.md", "README", "README.txt"]:
            url = f"/repos/{owner}/{repo}/contents/{name}?ref={branch}"
            try:
                response = await self._client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("encoding") == "base64":
                        import base64

                        content = base64.b64decode(data["content"]).decode("utf-8")
                        return content
            except Exception as exc:
                logger.debug(
                    "README fetch failed for %s, trying next",
                    name,
                    extra={"error": str(exc)[:80]},
                )
                continue  # try the next path variant
        return None

    async def get_tree(
        self, owner: str, repo: str, branch: str = "main", recursive: bool = True
    ) -> list[dict[str, Any]]:
        """Fetch repository file tree."""
        # Get the commit SHA for the branch
        url = f"/repos/{owner}/{repo}/git/ref/heads/{branch}"
        try:
            response = await self._client.get(url)
            response.raise_for_status()
            commit_sha = response.json()["object"]["sha"]
        except Exception as exc:
            logger.warning("failed to get branch ref", extra={"error": str(exc)})
            # Try to get tree without specific commit
            url = f"/repos/{owner}/{repo}/git/trees/{branch}"
            recursive_param = "?recursive=1" if recursive else ""
            try:
                response = await self._client.get(url + recursive_param)
                response.raise_for_status()
                return response.json().get("tree", [])
            except Exception:
                return []

        # Get the tree
        url = f"/repos/{owner}/{repo}/git/trees/{commit_sha}"
        if recursive:
            url += "?recursive=1"
        try:
            response = await self._client.get(url)
            response.raise_for_status()
            return response.json().get("tree", [])
        except Exception as exc:
            logger.warning("failed to get tree", extra={"error": str(exc)})
            return []

    async def get_file_content(
        self, owner: str, repo: str, path: str, branch: str = "main"
    ) -> str | None:
        """Fetch file content."""
        url = f"/repos/{owner}/{repo}/contents/{path}?ref={branch}"
        try:
            response = await self._client.get(url)
            if response.status_code != 200:
                return None
            data = response.json()
            if data.get("encoding") == "base64":
                import base64

                content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                return content
        except Exception as exc:
            logger.warning("failed to get file", extra={"path": path, "error": str(exc)})
        return None


def parse_github_url(url: str) -> tuple[str, str] | None:
    """Extract owner and repo from GitHub URL.

    Supports formats:
    - https://github.com/owner/repo
    - http://github.com/owner/repo
    - github.com/owner/repo
    - owner/repo
    """
    # Remove trailing slashes and .git extension
    url = url.rstrip("/").removesuffix(".git")

    patterns = [
        r"^https?://github\.com/([^/]+)/([^/]+)$",
        r"^github\.com/([^/]+)/([^/]+)$",
        r"^([^/]+)/([^/]+)$",
    ]

    for pattern in patterns:
        match = re.match(pattern, url)
        if match:
            owner, repo = match.groups()
            return owner, repo

    return None


def is_github_url(url: str) -> bool:
    """Check if URL is a GitHub repository."""
    return parse_github_url(url) is not None
