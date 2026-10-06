"""GitHub repository analyzer.

Analyzes repository structure, dependencies, and tech stack to inform prompt generation.
"""

from __future__ import annotations

import json

from weblens.domain.reconstruction import DetectedStack, RepoStructure
from weblens.github.client import GitHubClient
from weblens.logging import get_logger

logger = get_logger(__name__)

# Key files that indicate project type and structure
KEY_FILES = {
    "package.json": "nodejs",
    "requirements.txt": "python",
    "pyproject.toml": "python",
    "Pipfile": "python",
    "setup.py": "python",
    "Cargo.toml": "rust",
    "go.mod": "go",
    "composer.json": "php",
    "Gemfile": "ruby",
    "pom.xml": "java",
    "build.gradle": "java",
    "build.gradle.kts": "kotlin",
    "CMakeLists.txt": "cpp",
    "Makefile": "build_system",
    "Dockerfile": "docker",
    "docker-compose.yml": "docker",
    ".github/workflows": "ci_cd",
    ".gitlab-ci.yml": "ci_cd",
    "jest.config.js": "testing",
    "pytest.ini": "testing",
    ".eslintrc": "linting",
    "tsconfig.json": "typescript",
}


class GitHubRepoAnalyzer:
    """Analyzes GitHub repositories for structure and stack detection."""

    def __init__(self, client: GitHubClient):
        self._client = client

    async def analyze_structure(
        self, owner: str, repo: str, branch: str = "main"
    ) -> RepoStructure:
        """Analyze repository file structure."""
        tree = await self._client.get_tree(owner, repo, branch, recursive=True)

        files = [item for item in tree if item.get("type") == "blob"]
        dirs = [item for item in tree if item.get("type") == "tree"]

        # Extract top-level directories
        main_dirs = set()
        for item in dirs:
            path = item.get("path", "")
            if "/" not in path:
                main_dirs.add(path)

        # Find key files
        key_files = []
        file_paths = [item.get("path", "") for item in files]

        for key_file in KEY_FILES:
            if any(key_file in path for path in file_paths):
                key_files.append(key_file)

        # Check for common indicators
        has_tests = any(
            "test" in path.lower() or "spec" in path.lower() for path in file_paths
        )
        has_docs = any("doc" in path.lower() or "README" in path for path in file_paths)
        has_ci_cd = any(
            ".github/workflows" in path or ".gitlab-ci" in path or "Jenkinsfile" in path
            for path in file_paths
        )

        return RepoStructure(
            total_files=len(files),
            total_directories=len(dirs),
            main_directories=sorted(main_dirs)[:20],  # Limit to avoid huge lists
            key_files=key_files,
            has_tests=has_tests,
            has_docs=has_docs,
            has_ci_cd=has_ci_cd,
        )

    async def detect_stack(
        self, owner: str, repo: str, branch: str = "main", readme: str | None = None
    ) -> DetectedStack:
        """Detect technology stack from repository files."""
        languages: set[str] = set()
        frameworks: set[str] = set()
        databases: set[str] = set()
        tools: set[str] = set()
        package_managers: set[str] = set()

        # Check package.json
        package_json = await self._client.get_file_content(owner, repo, "package.json", branch)
        if package_json:
            languages.add("JavaScript")
            package_managers.add("npm")
            self._analyze_package_json(package_json, frameworks, databases, tools)

        # Check requirements.txt
        requirements = await self._client.get_file_content(
            owner, repo, "requirements.txt", branch
        )
        if requirements:
            languages.add("Python")
            package_managers.add("pip")
            self._analyze_requirements(requirements, frameworks, databases, tools)

        # Check pyproject.toml
        pyproject = await self._client.get_file_content(owner, repo, "pyproject.toml", branch)
        if pyproject:
            languages.add("Python")
            package_managers.add("poetry/pip")
            self._analyze_pyproject(pyproject, frameworks, databases, tools)

        # Check Cargo.toml
        cargo = await self._client.get_file_content(owner, repo, "Cargo.toml", branch)
        if cargo:
            languages.add("Rust")
            package_managers.add("cargo")

        # Check go.mod
        gomod = await self._client.get_file_content(owner, repo, "go.mod", branch)
        if gomod:
            languages.add("Go")
            package_managers.add("go modules")

        # Check for TypeScript
        tsconfig = await self._client.get_file_content(owner, repo, "tsconfig.json", branch)
        if tsconfig:
            languages.add("TypeScript")

        # Check Dockerfile
        dockerfile = await self._client.get_file_content(owner, repo, "Dockerfile", branch)
        if dockerfile:
            tools.add("Docker")

        # Analyze README for additional clues
        if readme:
            self._analyze_readme(readme, languages, frameworks, databases, tools)

        confidence = "high" if len(languages) > 0 and len(frameworks) > 0 else "medium"
        if not languages:
            confidence = "low"

        return DetectedStack(
            languages=sorted(languages),
            frameworks=sorted(frameworks),
            databases=sorted(databases),
            tools=sorted(tools),
            package_managers=sorted(package_managers),
            confidence=confidence,
        )

    def _analyze_package_json(
        self, content: str, frameworks: set[str], databases: set[str], tools: set[str]
    ) -> None:
        """Extract frameworks and tools from package.json."""
        try:
            data = json.loads(content)
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}

            # Frontend frameworks
            if "react" in deps:
                frameworks.add("React")
            if "vue" in deps:
                frameworks.add("Vue")
            if "angular" in deps or "@angular/core" in deps:
                frameworks.add("Angular")
            if "svelte" in deps:
                frameworks.add("Svelte")
            if "next" in deps:
                frameworks.add("Next.js")
            if "nuxt" in deps:
                frameworks.add("Nuxt.js")

            # Backend frameworks
            if "express" in deps:
                frameworks.add("Express")
            if "fastify" in deps:
                frameworks.add("Fastify")
            if "nest" in deps or "@nestjs/core" in deps:
                frameworks.add("NestJS")
            if "koa" in deps:
                frameworks.add("Koa")

            # Databases
            if "mongoose" in deps:
                databases.add("MongoDB")
            if "pg" in deps or "postgres" in deps:
                databases.add("PostgreSQL")
            if "mysql" in deps or "mysql2" in deps:
                databases.add("MySQL")
            if "redis" in deps:
                databases.add("Redis")
            if "sqlite" in deps or "sqlite3" in deps:
                databases.add("SQLite")

            # Tools
            if "webpack" in deps:
                tools.add("Webpack")
            if "vite" in deps:
                tools.add("Vite")
            if "jest" in deps:
                tools.add("Jest")
            if "vitest" in deps:
                tools.add("Vitest")
            if "eslint" in deps:
                tools.add("ESLint")
            if "prettier" in deps:
                tools.add("Prettier")
            if "typescript" in deps:
                tools.add("TypeScript")

        except json.JSONDecodeError:
            logger.warning("failed to parse package.json")

    def _analyze_requirements(
        self, content: str, frameworks: set[str], databases: set[str], tools: set[str]
    ) -> None:
        """Extract frameworks from requirements.txt."""
        lines = content.lower().split("\n")
        for line in lines:
            line = line.strip().split("==")[0].split(">=")[0].split("<=")[0]
            if "django" in line:
                frameworks.add("Django")
            elif "flask" in line:
                frameworks.add("Flask")
            elif "fastapi" in line:
                frameworks.add("FastAPI")
            elif "pyramid" in line:
                frameworks.add("Pyramid")
            elif "tornado" in line:
                frameworks.add("Tornado")
            elif "sqlalchemy" in line:
                tools.add("SQLAlchemy")
            elif "psycopg" in line:
                databases.add("PostgreSQL")
            elif "pymongo" in line:
                databases.add("MongoDB")
            elif "redis" in line:
                databases.add("Redis")
            elif "mysql" in line:
                databases.add("MySQL")
            elif "pytest" in line:
                tools.add("pytest")

    def _analyze_pyproject(
        self, content: str, frameworks: set[str], databases: set[str], tools: set[str]
    ) -> None:
        """Extract frameworks from pyproject.toml."""
        # Simple pattern matching for common frameworks
        if "django" in content.lower():
            frameworks.add("Django")
        if "flask" in content.lower():
            frameworks.add("Flask")
        if "fastapi" in content.lower():
            frameworks.add("FastAPI")
        if "sqlalchemy" in content.lower():
            tools.add("SQLAlchemy")

    def _analyze_readme(
        self,
        content: str,
        languages: set[str],
        frameworks: set[str],
        databases: set[str],
        tools: set[str],
    ) -> None:
        """Extract tech stack mentions from README."""
        content_lower = content.lower()

        # Languages
        if "python" in content_lower:
            languages.add("Python")
        if "javascript" in content_lower or "js" in content_lower:
            languages.add("JavaScript")
        if "typescript" in content_lower:
            languages.add("TypeScript")
        if "rust" in content_lower:
            languages.add("Rust")
        if "go" in content_lower or "golang" in content_lower:
            languages.add("Go")
        if "java" in content_lower and "javascript" not in content_lower:
            languages.add("Java")

        # Frameworks
        framework_patterns = [
            "react",
            "vue",
            "angular",
            "django",
            "flask",
            "fastapi",
            "express",
            "next.js",
            "nuxt",
        ]
        for pattern in framework_patterns:
            if pattern in content_lower:
                frameworks.add(pattern.title().replace(".Js", ".js"))

        # Databases
        db_patterns = ["mongodb", "postgresql", "mysql", "redis", "sqlite"]
        for pattern in db_patterns:
            if pattern in content_lower:
                databases.add(pattern.title().replace("Postgresql", "PostgreSQL"))
