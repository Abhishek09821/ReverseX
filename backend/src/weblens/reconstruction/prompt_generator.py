"""Prompt generation for reconstruction.

Converts analyzed evidence (website or GitHub repo) into a single, high-quality
GitReverse-style reconstruction prompt that tells an AI coding agent exactly how
to rebuild the analyzed product.
"""

from __future__ import annotations

import re

from weblens.domain.evidence import RawEvidence
from weblens.domain.reconstruction import (
    DetectedStack,
    GitHubRepoInfo,
    ReconstructionPrompt,
    RepoStructure,
    SourceType,
)
from weblens.logging import get_logger

logger = get_logger(__name__)


class PromptGenerator:
    """Generates reconstruction prompts from analyzed sources."""

    # ------------------------------------------------------------------
    # Website → prompt
    # ------------------------------------------------------------------

    def generate_from_website(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> ReconstructionPrompt:
        """Generate a GitReverse-style reconstruction prompt from website evidence."""
        parts: list[str] = []
        metadata: dict[str, str | int | bool | None] = {}
        limitations: list[str] = []

        title = findings.get("page_title") or evidence.dom.title if evidence.dom else None
        title = title or _hostname_from_url(url)
        description = findings.get("meta_description") or ""

        # ── Product summary ──
        parts.append(f"Build a web application similar to **{title}**.")
        if description:
            parts.append(f"The site describes itself as: _{description}_")
        parts.append("")

        # ── Purpose ──
        purpose = self._infer_website_purpose(url, title, description, findings)
        parts.append("## Product Purpose")
        parts.append(purpose)
        parts.append("")

        # ── Tech stack ──
        tech = self._build_website_tech_section(findings, evidence)
        if tech:
            parts.append("## Technical Stack")
            parts += tech
            parts.append("")

        # ── Features & user flow ──
        features = self._extract_website_features(findings, evidence)
        if features:
            parts.append("## Key Features & User Flow")
            for f in features:
                parts.append(f"- {f}")
            parts.append("")

        # ── Design requirements ──
        design = self._extract_website_design(findings, evidence)
        if design:
            parts.append("## Design Requirements")
            for d in design:
                parts.append(f"- {d}")
            parts.append("")

        # ── Integrations ──
        integrations = self._extract_website_integrations(findings)
        if integrations:
            parts.append("## Integrations & Third-Party Services")
            for i in integrations:
                parts.append(f"- {i}")
            parts.append("")

        # ── Architecture notes ──
        arch = self._infer_website_architecture(findings, evidence)
        if arch:
            parts.append("## Architecture & Implementation Notes")
            for a in arch:
                parts.append(f"- {a}")
            parts.append("")

        # ── Performance & accessibility ──
        perf_a11y = self._extract_perf_a11y(findings, evidence)
        if perf_a11y:
            parts.append("## Performance & Accessibility Requirements")
            for p in perf_a11y:
                parts.append(f"- {p}")
            parts.append("")

        prompt_text = "\n".join(parts).strip()

        # Metadata
        metadata["page_title"] = title
        metadata["url"] = url
        metadata["has_dom"] = evidence.dom is not None
        if findings.get("framework_hint"):
            metadata["detected_framework"] = findings["framework_hint"]
        if findings.get("server_header"):
            metadata["server"] = findings["server_header"]
        if findings.get("third_party_services"):
            metadata["integrations"] = findings["third_party_services"]

        # Confidence
        confidence = self._website_confidence(evidence, findings)

        # Limitations
        if not evidence.dom:
            limitations.append(
                "No rendered DOM was available — interactive features and client-side "
                "behaviour could not be observed."
            )
        if not evidence.http or not evidence.http.body_text:
            limitations.append("HTTP response body was not captured.")
        limitations += [
            "Private backend code, databases, and internal APIs cannot be determined "
            "from public observation.",
            "A single page was analyzed; other pages may differ significantly.",
        ]

        return ReconstructionPrompt(
            prompt=prompt_text,
            source_type=SourceType.WEBSITE,
            source_url=url,
            confidence=confidence,
            limitations=limitations,
            metadata=metadata,
        )

    def _infer_website_purpose(
        self,
        url: str,
        title: str | None,
        description: str,
        findings: dict[str, str],
    ) -> str:
        host = _hostname_from_url(url)
        nav = findings.get("navigation_links", "")
        nav_items = [n.strip() for n in nav.split(",") if n.strip()][:8]

        base = f"Rebuild a publicly accessible web application for **{host}**"
        if description:
            base += f". {description.rstrip('.')}."
        if nav_items:
            base += (
                f" The main navigation includes: {', '.join(nav_items)}."
            )
        return base

    def _build_website_tech_section(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        lines: list[str] = []

        framework = findings.get("framework_hint")
        if framework:
            lines.append(f"- **Frontend framework**: {framework}")
        else:
            lines.append("- **Frontend framework**: Not determinable from public signals")

        # Rendering mode
        if evidence.dom and evidence.http:
            static_html = evidence.http.body_text or ""
            dom_element_count = len(getattr(evidence.dom, "elements", []))
            # If JS loaded lots of elements not in static HTML, it's SPA/CSR
            if dom_element_count > 50 and len(static_html) < 3000:
                lines.append("- **Rendering**: Client-side rendered (SPA/CSR)")
            elif len(static_html) > 5000:
                lines.append("- **Rendering**: Server-side rendered or static HTML")
            else:
                lines.append("- **Rendering**: Hybrid or indeterminate")

        server = findings.get("server_header")
        if server:
            lines.append(f"- **Web server / CDN**: {server}")

        powered_by = findings.get("x_powered_by")
        if powered_by:
            lines.append(f"- **Backend hint**: {powered_by}")

        scripts = findings.get("script_sources", "")
        if scripts:
            tech_hints = _detect_tech_from_scripts(scripts)
            for hint in tech_hints:
                lines.append(f"- {hint}")

        fonts = findings.get("fonts")
        if fonts:
            lines.append(f"- **Fonts**: {fonts}")

        return lines

    def _extract_website_features(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        features: list[str] = []

        if evidence.dom:
            features.append("Responsive web design for mobile, tablet, and desktop")

        if findings.get("has_api_calls") == "true":
            features.append("Asynchronous data loading via API calls (JSON endpoints detected)")

        third_party = findings.get("third_party_services", "")
        if "Google Analytics" in third_party or "Plausible" in third_party:
            features.append("Analytics and user tracking")
        if "Stripe" in third_party:
            features.append("Payment processing (Stripe integration detected)")
        if "Intercom" in third_party or "Drift" in third_party or "Crisp" in third_party:
            features.append("In-app chat / customer support widget")
        if "Auth0" in third_party:
            features.append("Authentication via Auth0")

        # Navigation structure
        nav = findings.get("navigation_links", "")
        if nav:
            features.append(f"Multi-page navigation: {nav}")

        if not features:
            features.append("Standard web page layout with responsive design")
            features.append("Navigation menu and content sections")

        return features[:10]

    def _extract_website_design(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        design: list[str] = []
        design.append("Clean, professional design with consistent visual hierarchy")
        design.append("Accessible color contrast ratios (WCAG AA target)")
        design.append("Mobile-first responsive layout using CSS Flexbox or Grid")

        fonts = findings.get("fonts")
        if fonts:
            design.append(f"Typography: {fonts}")
        else:
            design.append("System fonts or web fonts for body text")

        a11y_violations = findings.get("a11y_violations")
        if a11y_violations and int(a11y_violations) > 0:
            design.append(
                f"Note: {a11y_violations} accessibility violation(s) detected — "
                "fix these in the rebuilt version"
            )

        return design

    def _extract_website_integrations(self, findings: dict[str, str]) -> list[str]:
        integrations: list[str] = []
        third_party = findings.get("third_party_services", "")
        if third_party:
            for service in third_party.split(", "):
                service = service.strip()
                if service:
                    integrations.append(service)

        # Google verification → likely using Google Search Console / Workspace
        if findings.get("google_verified") == "true":
            integrations.append("Google Search Console (site verified)")

        return integrations

    def _infer_website_architecture(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        notes: list[str] = []

        server = findings.get("server_header", "").lower()
        if "cloudflare" in server or "Cloudflare" in findings.get("third_party_services", ""):
            notes.append("Deploy behind Cloudflare CDN for performance and DDoS protection")
        elif "vercel" in server or "Vercel" in findings.get("third_party_services", ""):
            notes.append("Host on Vercel (detected from server signals)")
        elif "netlify" in findings.get("third_party_services", ""):
            notes.append("Host on Netlify (detected from service signals)")
        elif "aws" in findings.get("third_party_services", "").lower():
            notes.append("Host on AWS infrastructure (S3/CloudFront or EC2)")
        else:
            notes.append("Deploy to a CDN-backed static host or a Node/Python server")

        csp = findings.get("csp")
        if csp:
            notes.append("Implement a Content Security Policy header")
        hsts = findings.get("hsts")
        if hsts:
            notes.append("Enable HTTPS with HSTS (Strict-Transport-Security)")
        x_frame = findings.get("x_frame_options")
        if x_frame:
            notes.append(f"Set X-Frame-Options: {x_frame} to prevent clickjacking")

        notes.append("Store no secrets in the client bundle — use environment variables")
        notes.append("Use semantic HTML5 elements for accessibility and SEO")

        return notes

    def _extract_perf_a11y(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        items: list[str] = []

        lcp = findings.get("lcp_ms")
        if lcp and int(lcp) > 2500:
            items.append(f"Optimize LCP to < 2500 ms (observed: {lcp} ms)")
        elif lcp:
            items.append(f"LCP target: < 2500 ms (observed: {lcp} ms — good)")

        cls = findings.get("cls")
        if cls and float(cls) > 0.1:
            items.append(f"Reduce CLS to < 0.1 (observed: {cls})")

        items.append("Lazy-load images and non-critical scripts")
        items.append("Provide alt text for all informational images")
        items.append("Ensure keyboard navigability for all interactive elements")

        return items

    def _website_confidence(
        self, evidence: RawEvidence, findings: dict[str, str]
    ) -> str:
        score = 0
        if evidence.dom:
            score += 2
        if evidence.http and evidence.http.body_text:
            score += 1
        if evidence.runtime:
            score += 1
        if evidence.network:
            score += 1
        if findings.get("framework_hint"):
            score += 1
        if score >= 4:
            return "high"
        if score >= 2:
            return "medium"
        return "low"

    # ------------------------------------------------------------------
    # GitHub repo → prompt
    # ------------------------------------------------------------------

    def generate_from_github(
        self,
        url: str,
        repo_info: GitHubRepoInfo,
        structure: RepoStructure,
        stack: DetectedStack,
        readme: str | None = None,
    ) -> ReconstructionPrompt:
        """Generate a GitReverse-style reconstruction prompt from GitHub repo analysis."""
        parts: list[str] = []
        metadata: dict[str, str | int | bool | None] = {}
        limitations: list[str] = []

        # ── Header ──
        parts.append(f"Build a project similar to **{repo_info.full_name}**.")
        if repo_info.description:
            parts.append(f"_{repo_info.description}_")
        parts.append("")

        # ── Purpose ──
        parts.append("## Product Purpose")
        purpose = self._extract_github_purpose(readme, repo_info)
        parts.append(purpose)
        parts.append("")

        # ── Tech stack ──
        if stack.languages or stack.frameworks or stack.databases:
            parts.append("## Technology Stack")
            if stack.languages:
                parts.append(f"- **Languages**: {', '.join(stack.languages)}")
            if stack.frameworks:
                parts.append(f"- **Frameworks**: {', '.join(stack.frameworks)}")
            if stack.databases:
                parts.append(f"- **Databases**: {', '.join(stack.databases)}")
            if stack.tools:
                parts.append(f"- **Tools**: {', '.join(stack.tools)}")
            if stack.package_managers:
                parts.append(f"- **Package manager**: {stack.package_managers[0]}")
            parts.append("")

        # ── Architecture ──
        arch = self._infer_github_architecture(structure, stack, repo_info)
        if arch:
            parts.append("## Architecture")
            parts.append(arch)
            parts.append("")

        # ── Project structure ──
        if structure.main_directories:
            parts.append("## Project Structure")
            parts.append("Recreate this directory layout:")
            parts.append("")
            parts.append("```")
            for d in structure.main_directories[:12]:
                parts.append(f"{d}/")
            parts.append("```")
            parts.append("")

        # ── Key features ──
        features = self._extract_github_features(structure, stack, readme, repo_info)
        if features:
            parts.append("## Key Features to Implement")
            for f in features:
                parts.append(f"- {f}")
            parts.append("")

        # ── Implementation guide ──
        guide = self._build_github_impl_guide(structure, stack, repo_info)
        if guide:
            parts.append("## Implementation Guide")
            for step in guide:
                parts.append(f"- {step}")
            parts.append("")

        # ── Homepage URL ──
        if repo_info.homepage:
            parts.append("## Live Reference")
            parts.append(f"Live version: {repo_info.homepage}")
            parts.append("")

        # ── Quality signals ──
        signals: list[str] = []
        if structure.has_tests:
            signals.append("Write tests for all core functionality")
        if structure.has_ci_cd:
            signals.append("Set up CI/CD pipeline (GitHub Actions or equivalent)")
        if structure.has_docs:
            signals.append("Maintain clear documentation in README")
        if signals:
            parts.append("## Quality Requirements")
            for s in signals:
                parts.append(f"- {s}")
            parts.append("")

        prompt_text = "\n".join(parts).strip()

        # Metadata
        metadata["repo"] = repo_info.full_name
        metadata["stars"] = repo_info.stars
        metadata["primary_language"] = repo_info.language or "Unknown"
        metadata["total_files"] = structure.total_files
        metadata["has_tests"] = structure.has_tests
        metadata["has_ci_cd"] = structure.has_ci_cd
        if stack.languages:
            metadata["languages"] = ", ".join(stack.languages)
        if stack.frameworks:
            metadata["frameworks"] = ", ".join(stack.frameworks)

        # Confidence
        confidence = self._github_confidence(stack, structure, readme)

        # Limitations
        if structure.total_files > 1000:
            limitations.append(
                f"Large repository ({structure.total_files} files): "
                "analysis focused on key configuration files and top-level structure."
            )
        if not readme:
            limitations.append(
                "No README found — purpose and usage inferred from structure and file names only."
            )
        if repo_info.is_fork:
            limitations.append("This is a fork — original project may have diverged.")
        limitations += [
            "Private configuration, API keys, secrets, and deployment specifics are not included.",
            "Internal implementation details beyond publicly visible files are unknown.",
        ]

        return ReconstructionPrompt(
            prompt=prompt_text,
            source_type=SourceType.GITHUB_REPO,
            source_url=url,
            confidence=confidence,
            limitations=limitations,
            metadata=metadata,
        )

    def _extract_github_purpose(
        self,
        readme: str | None,
        repo_info: GitHubRepoInfo,
    ) -> str:
        if readme:
            # Find first substantial paragraph after the title
            lines = readme.split("\n")
            candidates: list[str] = []
            for line in lines:
                stripped = line.strip()
                if (
                    len(stripped) > 60
                    and not stripped.startswith("#")
                    and not stripped.startswith("[")
                    and not stripped.startswith("!")
                    and not stripped.startswith("|")
                    and not stripped.startswith("```")
                    and not stripped.startswith("<")
                ):
                    candidates.append(stripped)
                    if len(candidates) >= 2:
                        break
            if candidates:
                return " ".join(candidates)[:600]

        if repo_info.description:
            return repo_info.description

        topics = repo_info.topics
        if topics:
            return (
                f"A {repo_info.language or 'software'} project covering: "
                f"{', '.join(topics[:5])}."
            )

        return (
            f"Reconstruct {repo_info.full_name}, a {repo_info.language or 'software'} project "
            f"with {repo_info.stars} stars."
        )

    def _infer_github_architecture(
        self,
        structure: RepoStructure,
        stack: DetectedStack,
        repo_info: GitHubRepoInfo,
    ) -> str:
        patterns: list[str] = []
        dirs_lower = [d.lower() for d in structure.main_directories]

        # Monorepo patterns
        if "packages" in dirs_lower or "apps" in dirs_lower:
            patterns.append("Monorepo structure with multiple packages")

        # Frontend/backend split
        if ("frontend" in dirs_lower or "client" in dirs_lower or "ui" in dirs_lower) and (
            "backend" in dirs_lower or "server" in dirs_lower or "api" in dirs_lower
        ):
            patterns.append("Full-stack application with separate frontend and backend")
        elif "frontend" in dirs_lower or "client" in dirs_lower:
            patterns.append("Frontend-only project (no server-side code visible at top level)")
        elif "backend" in dirs_lower or "server" in dirs_lower or "api" in dirs_lower:
            patterns.append("Backend/API project")

        # Framework-specific
        if "Next.js" in stack.frameworks:
            patterns.append("Next.js app — pages or app directory routing")
        if "Django" in stack.frameworks:
            patterns.append("Django project with app-based modular structure")
        if "FastAPI" in stack.frameworks:
            patterns.append("FastAPI service with async request handling")
        if "Express" in stack.frameworks:
            patterns.append("Express.js REST API")

        # Database
        if stack.databases:
            patterns.append(f"Data layer: {', '.join(stack.databases)}")

        if not patterns:
            lang = repo_info.language or "the detected language"
            patterns.append(f"Standard {lang} project structure")

        return " · ".join(patterns)

    def _extract_github_features(
        self,
        structure: RepoStructure,
        stack: DetectedStack,
        readme: str | None,
        repo_info: GitHubRepoInfo,
    ) -> list[str]:
        features: list[str] = []
        dirs_lower = [d.lower() for d in structure.main_directories]
        files_lower = [f.lower() for f in structure.key_files]

        # Infer from directory names
        if "auth" in dirs_lower or "authentication" in dirs_lower:
            features.append("User authentication and session management")
        if "api" in dirs_lower or "routes" in dirs_lower:
            features.append("REST API with organized route handlers")
        if "components" in dirs_lower or "ui" in dirs_lower:
            features.append("Reusable UI component library")
        if "services" in dirs_lower:
            features.append("Service layer for business logic")
        if "models" in dirs_lower or "schemas" in dirs_lower:
            features.append("Data models and schema definitions")
        if "middleware" in dirs_lower:
            features.append("Request middleware pipeline")
        if "migrations" in dirs_lower:
            features.append("Database migrations")
        if "workers" in dirs_lower or "jobs" in dirs_lower:
            features.append("Background job processing")
        if "websockets" in dirs_lower or "ws" in dirs_lower:
            features.append("WebSocket real-time communication")
        if "hooks" in dirs_lower:
            features.append("Custom React hooks")
        if "store" in dirs_lower or "redux" in files_lower:
            features.append("Client-side state management")

        # From README topics
        topics = repo_info.topics
        if "cli" in topics:
            features.append("Command-line interface (CLI)")
        if "dashboard" in topics:
            features.append("Admin/user dashboard")
        if "blog" in topics:
            features.append("Blog or content management")
        if "ecommerce" in topics or "e-commerce" in topics:
            features.append("E-commerce functionality")

        # Minimum features
        if not features:
            features.append("Core application logic as visible in repository structure")
            features.append("Configuration management via environment variables")

        return features[:10]

    def _build_github_impl_guide(
        self,
        structure: RepoStructure,
        stack: DetectedStack,
        repo_info: GitHubRepoInfo,
    ) -> list[str]:
        steps: list[str] = []
        lang = stack.languages[0] if stack.languages else (repo_info.language or "the language")

        steps.append(f"Initialize a new {lang} project")

        if stack.package_managers:
            pm = stack.package_managers[0]
            if "npm" in pm or "yarn" in pm:
                steps.append("Install dependencies from package.json")
            elif "pip" in pm or "poetry" in pm:
                steps.append("Install Python dependencies (requirements.txt or pyproject.toml)")
            elif "cargo" in pm:
                steps.append("Add Rust crates from Cargo.toml")
            elif "go" in pm:
                steps.append("Fetch Go modules from go.mod")

        if structure.main_directories:
            top_dirs = structure.main_directories[:6]
            steps.append(f"Create the top-level directories: {', '.join(top_dirs)}")

        if stack.databases:
            db_list = ", ".join(stack.databases)
            steps.append(f"Configure the database ({db_list}) and run migrations")

        if stack.frameworks:
            fw = stack.frameworks[0]
            if "React" in fw or "Vue" in fw or "Svelte" in fw:
                steps.append(f"Set up the {fw} application with routing")
            elif "Django" in fw:
                steps.append("Create Django project, configure settings, and define app models")
            elif "FastAPI" in fw:
                steps.append("Define FastAPI routes, schemas (Pydantic), and startup lifespan")
            elif "Express" in fw or "Fastify" in fw:
                steps.append(f"Set up {fw} server with routes and middleware")
            elif "Next.js" in fw:
                steps.append("Build Next.js pages/app-dir routes with data-fetching patterns")

        steps.append("Implement core business logic following the directory structure above")
        steps.append("Add authentication and authorization if required")
        steps.append("Configure environment variables for secrets and external services")

        if structure.has_tests:
            steps.append("Reproduce the test suite structure and write tests for new code")
        if structure.has_ci_cd:
            steps.append("Set up CI/CD pipelines (GitHub Actions or equivalent)")

        return steps

    def _github_confidence(
        self,
        stack: DetectedStack,
        structure: RepoStructure,
        readme: str | None,
    ) -> str:
        score = 0
        if stack.languages:
            score += 2
        if stack.frameworks:
            score += 2
        if stack.databases:
            score += 1
        if readme:
            score += 1
        if structure.total_files > 5:
            score += 1
        if score >= 5:
            return "high"
        if score >= 3:
            return "medium"
        return "low"


# ── Helpers ────────────────────────────────────────────────────────────────────


def _hostname_from_url(url: str) -> str:
    """Extract a readable hostname from a URL."""
    try:
        from urllib.parse import urlsplit
        host = urlsplit(url).hostname or url
        return host.removeprefix("www.")
    except Exception:
        return url


def _detect_tech_from_scripts(script_sources: str) -> list[str]:
    """Detect frameworks and libraries from script URL patterns."""
    src_lower = script_sources.lower()
    hits: list[str] = []

    script_signals = [
        (r"next[/\-_]", "- **Framework**: Next.js (script pattern)"),
        (r"_next/", "- **Framework**: Next.js (Next.js static assets)"),
        (r"nuxt[/\-_]", "- **Framework**: Nuxt.js (script pattern)"),
        (r"gatsby", "- **Framework**: Gatsby (script pattern)"),
        (r"remix[/\-_]", "- **Framework**: Remix (script pattern)"),
        (r"svelte", "- **Framework**: Svelte (script pattern)"),
        (r"vue[/\-_\.]", "- **Framework**: Vue.js (script pattern)"),
        (r"angular", "- **Framework**: Angular (script pattern)"),
        (r"react[/\-_\.]", "- **Framework**: React (script pattern)"),
        (r"tailwind", "- **Styling**: Tailwind CSS"),
        (r"bootstrap", "- **Styling**: Bootstrap"),
        (r"material-ui|mui\.com", "- **UI library**: Material UI"),
        (r"chakra-ui", "- **UI library**: Chakra UI"),
        (r"gtm\.js|googletagmanager", "- **Analytics**: Google Tag Manager"),
        (r"gtag\.js|google-analytics", "- **Analytics**: Google Analytics"),
    ]

    seen: set[str] = set()
    for pattern, label in script_signals:
        if re.search(pattern, src_lower) and label not in seen:
            hits.append(label)
            seen.add(label)

    return hits
