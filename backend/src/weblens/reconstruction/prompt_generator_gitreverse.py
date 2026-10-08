"""GitReverse-style natural prompt generation.

Generates conversational, natural language prompts with design system links,
exactly like GitReverse does it.
"""

from __future__ import annotations

import hashlib
import re
from typing import TYPE_CHECKING

from weblens.domain.evidence import RawEvidence
from weblens.domain.reconstruction import (
    DetectedStack,
    GitHubRepoInfo,
    ReconstructionPrompt,
    RepoStructure,
    SourceType,
)
from weblens.logging import get_logger

if TYPE_CHECKING:
    from weblens.config import Settings

logger = get_logger(__name__)


class GitReversePromptGenerator:
    """Generates GitReverse-quality conversational reconstruction prompts."""

    def __init__(self, settings: Settings | None = None, base_url: str | None = None):
        """Initialize generator with optional base URL for design links."""
        self._settings = settings
        self._base_url = base_url or "https://reverse-weblens.vercel.app"

    async def generate_from_website(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> ReconstructionPrompt:
        """Generate GitReverse-style prompt from website."""
        # Extract basic info
        title = findings.get("page_title") or (evidence.dom.title if evidence.dom else None)
        title = title or _hostname_from_url(url)
        description = findings.get("meta_description") or ""
        
        # Generate unique design system link
        design_link = self._generate_design_link(url)
        
        # Build conversational prompt
        prompt_parts: list[str] = []
        
        # Opening: Natural, conversational intro
        opening = self._build_website_opening(title, description, url, findings, evidence)
        prompt_parts.append(opening)
        prompt_parts.append("")
        
        # Design system link (CRITICAL - this is what makes it GitReverse-like)
        prompt_parts.append(f"Use this design system for the visuals: {design_link}")
        prompt_parts.append("")
        
        # Product sections breakdown
        purpose = self._build_product_purpose(title, url, findings, evidence)
        if purpose:
            prompt_parts.append("## Product Purpose")
            prompt_parts.append(purpose)
            prompt_parts.append("")
        
        # Tech stack
        tech = self._build_tech_stack(findings, evidence)
        if tech:
            prompt_parts.append("## Technical Stack")
            prompt_parts.extend(tech)
            prompt_parts.append("")
        
        # Key features
        features = self._build_key_features(findings, evidence)
        if features:
            prompt_parts.append("## Key Features & User Flow")
            prompt_parts.extend(features)
            prompt_parts.append("")
        
        # Design requirements
        design = self._build_design_requirements(findings, evidence)
        if design:
            prompt_parts.append("## Design Requirements")
            prompt_parts.extend(design)
            prompt_parts.append("")
        
        prompt_text = "\n".join(prompt_parts).strip()
        
        # Metadata
        metadata: dict[str, str | int | bool | None] = {
            "page_title": title,
            "url": url,
            "design_link": design_link,
            "has_dom": evidence.dom is not None,
        }
        
        # Limitations
        limitations = [
            "Private backend code, databases, and internal APIs cannot be determined from public observation.",
            "Analysis based on single page load; other pages may differ significantly.",
        ]
        
        return ReconstructionPrompt(
            prompt=prompt_text,
            source_type=SourceType.WEBSITE,
            source_url=url,
            confidence=self._calculate_confidence(evidence, findings),
            limitations=limitations,
            metadata=metadata,
        )
    
    def _generate_design_link(self, url: str) -> str:
        """Generate unique design system link like GitReverse does."""
        # Extract domain from URL
        domain = _hostname_from_url(url)
        # Create URL-safe version
        safe_domain = re.sub(r'[^a-z0-9-]', '-', domain.lower())
        safe_domain = re.sub(r'-+', '-', safe_domain).strip('-')
        
        return f"{self._base_url}/designs/{safe_domain}"
    
    def _build_website_opening(
        self,
        title: str,
        description: str,
        url: str,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> str:
        """Build natural, conversational opening like GitReverse."""
        parts: list[str] = []
        
        # Analyze the site personality
        domain = _hostname_from_url(url)
        
        # Create engaging intro
        if "apple" in domain.lower():
            parts.append(f"Build me a homepage that feels like Apple, premium, minimal, and very product focused.")
        elif "stripe" in domain.lower():
            parts.append(f"Build me a homepage that feels like Stripe, developer-focused, clean, and professional.")
        elif "airbnb" in domain.lower():
            parts.append(f"Build me a homepage that feels like Airbnb, welcoming, image-rich, and travel-focused.")
        elif "netflix" in domain.lower():
            parts.append(f"Build me a homepage that feels like Netflix, bold, content-first, and entertainment-focused.")
        else:
            # Generic but natural opening
            parts.append(f"Build me a homepage that feels like {title}, ")
            
            # Add personality descriptors based on evidence
            descriptors = []
            if evidence.dom:
                # Analyze color scheme
                if "premium" in description.lower() or "luxury" in description.lower():
                    descriptors.append("premium")
                if "professional" in description.lower() or "business" in description.lower():
                    descriptors.append("professional")
                if "minimal" in description.lower() or "clean" in description.lower():
                    descriptors.append("minimal")
                else:
                    descriptors.append("clean")
            
            if not descriptors:
                descriptors = ["modern", "professional", "user-friendly"]
            
            parts.append(", ".join(descriptors) + ".")
        
        # Add what they want statement
        if description:
            # Extract key value prop
            value_prop = description[:200].split(".")[0]
            parts.append(f" {value_prop}.")
        
        # Add specific sections/features
        nav = findings.get("navigation_links", "")
        if nav:
            nav_items = [n.strip() for n in nav.split(",") if n.strip()][:6]
            if nav_items:
                parts.append(f" The main navigation includes: {', '.join(nav_items)}.")
        
        return "".join(parts)
    
    def _build_product_purpose(
        self,
        title: str,
        url: str,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> str:
        """Build product purpose section."""
        domain = _hostname_from_url(url)
        description = findings.get("meta_description", "")
        
        purpose_parts: list[str] = []
        purpose_parts.append(f"Rebuild a publicly accessible web application for **{domain}**.")
        
        if description:
            purpose_parts.append(f" {description}")
        
        # Add call-to-action info if available
        cta = findings.get("primary_cta")
        if cta:
            purpose_parts.append(f" Primary action: {cta}.")
        
        return " ".join(purpose_parts)
    
    def _build_tech_stack(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        """Build technical stack section."""
        lines: list[str] = []
        
        # Frontend framework
        framework = findings.get("framework_hint")
        if framework:
            lines.append(f"- **Frontend framework**: {framework}")
        else:
            lines.append("- **Frontend framework**: React")
        
        # Rendering mode
        lines.append("- **Rendering**: Hybrid or indeterminate")
        
        # Server/CDN
        server = findings.get("server_header")
        if server:
            lines.append(f"- **Web server / CDN**: {server}")
        
        # Backend hint
        powered_by = findings.get("x_powered_by")
        if powered_by:
            lines.append(f"- **Backend hint**: {powered_by}")
        
        # Scripts/libraries detection
        scripts = findings.get("script_sources", "")
        if scripts:
            if "react" in scripts.lower():
                lines.append("- **Framework**: React (Script pattern)")
            if "next" in scripts.lower():
                lines.append("- **Framework**: Next.js")
            if "tailwind" in scripts.lower():
                lines.append("- **Styling**: Tailwind CSS")
        
        return lines
    
    def _build_key_features(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        """Build key features section with detailed URLs."""
        features: list[str] = []
        
        # Responsive design
        features.append("- Responsive web design for mobile, tablet, and desktop")
        
        # Navigation
        nav = findings.get("navigation_links", "")
        if nav:
            # Build detailed navigation structure like GitReverse
            nav_items = [n.strip() for n in nav.split(",") if n.strip()]
            if nav_items:
                nav_detail = f"- Multi-page navigation: {', '.join(nav_items)}"
                features.append(nav_detail)
        
        # API/data loading
        if findings.get("has_api_calls") == "true":
            features.append("- Asynchronous data loading via API calls")
        
        # Third-party integrations
        third_party = findings.get("third_party_services", "")
        if "Stripe" in third_party:
            features.append("- Payment processing (Stripe integration)")
        if "Google Analytics" in third_party or "Plausible" in third_party:
            features.append("- Analytics tracking")
        
        # Default features if nothing specific found
        if len(features) <= 1:
            features.append("- Hero section with product messaging")
            features.append("- Feature showcase sections")
            features.append("- Call-to-action buttons")
        
        return features
    
    def _build_design_requirements(
        self,
        findings: dict[str, str],
        evidence: RawEvidence,
    ) -> list[str]:
        """Build design requirements section."""
        design: list[str] = []
        
        design.append("- Clean, professional design with consistent visual hierarchy")
        design.append("- Accessible color contrast ratios (WCAG AA target)")
        design.append("- Mobile-first responsive layout using CSS Flexbox or Grid")
        
        # Fonts
        fonts = findings.get("fonts")
        if fonts:
            design.append(f"- System fonts or web fonts for body text: {fonts}")
        else:
            design.append("- System fonts or web fonts for body text")
        
        # Accessibility notes
        a11y_violations = findings.get("a11y_violations")
        if a11y_violations and int(a11y_violations) > 0:
            design.append(f"- Note: {a11y_violations} accessibility violation(s) detected — fix these in the rebuilt version")
        
        return design
    
    def _calculate_confidence(
        self,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> str:
        """Calculate confidence score."""
        score = 0
        if evidence.dom:
            score += 2
        if evidence.http and evidence.http.body_text:
            score += 1
        if evidence.runtime:
            score += 1
        if findings.get("framework_hint"):
            score += 1
        
        if score >= 4:
            return "high"
        elif score >= 2:
            return "medium"
        else:
            return "low"
    
    async def generate_from_github(
        self,
        url: str,
        repo_info: GitHubRepoInfo,
        structure: RepoStructure,
        stack: DetectedStack,
        readme: str | None = None,
    ) -> ReconstructionPrompt:
        """Generate GitReverse-style prompt from GitHub repo."""
        # Simple implementation for now
        prompt_text = f"Build a project similar to **{repo_info.full_name}**.\n\n"
        
        if repo_info.description:
            prompt_text += f"{repo_info.description}\n\n"
        
        prompt_text += "## Technology Stack\n"
        if stack.languages:
            prompt_text += f"- **Languages**: {', '.join(stack.languages)}\n"
        if stack.frameworks:
            prompt_text += f"- **Frameworks**: {', '.join(stack.frameworks)}\n"
        
        return ReconstructionPrompt(
            prompt=prompt_text,
            source_type=SourceType.GITHUB_REPO,
            source_url=url,
            confidence="medium",
            limitations=["Basic GitHub analysis"],
            metadata={"repo": repo_info.full_name},
        )


def _hostname_from_url(url: str) -> str:
    """Extract hostname from URL."""
    try:
        from urllib.parse import urlsplit
        host = urlsplit(url).hostname or url
        return host.removeprefix("www.")
    except Exception:
        return url
