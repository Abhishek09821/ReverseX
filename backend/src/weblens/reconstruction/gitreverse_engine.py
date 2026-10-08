"""GitReverse-style two-stage reconstruction engine.

Exactly replicates GitReverse's approach:
1. Evidence → design.md (detailed design system)
2. Evidence + design.md → conversational prompt
3. Append design system link
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from weblens.domain.evidence import RawEvidence
from weblens.domain.reconstruction import (
    ReconstructionPrompt,
    SourceType,
)
from weblens.logging import get_logger
from weblens.reconstruction.llm_synthesizer import LLMSynthesizer

if TYPE_CHECKING:
    from weblens.config import Settings

logger = get_logger(__name__)


# ── System Prompts (Exact GitReverse Style) ──────────────────────────────────


DESIGN_SYSTEM_PROMPT = """You are an expert design systems writer. You synthesize live website evidence into a reusable design.md document.

## Task

Given website evidence (page content, colors, fonts, structure), write a complete design system markdown document that another AI agent can use to rebuild the site with the same visual style.

## Rules

- Follow standard design system sections: Visual Theme, Color Palette, Typography, Components, Layout, etc.
- Use semantic color names with hex values when possible
- Document typography hierarchy (font families, sizes, weights, line heights)
- Describe component patterns (buttons, cards, navigation, inputs)
- Include spacing system and layout principles
- Note responsive behavior and breakpoints
- Add a "Ready-to-Use Prompt" section at the end with a short prompt summary
- Output markdown only. No preamble, no code fences wrapping the document
- Be specific when evidence supports it, but honest about uncertainty

## Format

Start with "# Design System: [Site Name]" and organize into clear sections with headers."""


CONVERSATIONAL_PROMPT_SYSTEM = """You are an expert at inferring how people actually prompt modern coding agents.

## Task

You are given **website evidence** and a **design system summary** from a live website. Output **one synthetic user message**: the kind of prompt a **non-technical or lightly technical** person might paste into Cursor, Claude, ChatGPT, or v0 to rebuild this website in one "vibe coding" pass.

## What the output must be

- **Plain language.** Sounds like a real request ("Build me…", "I want…", "Create a homepage that feels like…"), not an architecture doc
- **Outcome focused.** Describe what the site should *do* and *feel like* for a user
- **Visual personality.** Weave in the brand mood, colors, and typography naturally
- **Honest scope.** Only claim features you can infer from the evidence. Keep claims vague when thin
- **Length:** about **120 to 250 words**. Natural paragraphs with line breaks for readability
- **Tone:** natural and conversational. Use contractions. No preamble ("Sure, here is…"), no meta ("As an AI…"), no filler

## Structure Pattern (adapt naturally, don't force)

Opening line: "Build me a homepage that feels like [Brand], [adjective], [adjective], and [focus]."

Then describe:
- What the user wants (product focus, value prop)
- Key sections or navigation
- Visual style from design system
- Any specific features visible in evidence

## What to avoid

- Dumping raw design tokens or hex codes
- Writing system instructions or specs
- Inventing features not in evidence
- Using hyphens/dashes/bullet lists
- Technical jargon unless the site is clearly technical

## Output format

Reply with **only** the synthetic user message. No title, no quotes, no explanation before or after."""


# ── GitReverse Engine ─────────────────────────────────────────────────────────


class GitReverseEngine:
    """Two-stage reconstruction engine matching GitReverse's approach."""

    def __init__(self, settings: Settings):
        """Initialize with settings for LLM calls."""
        self._settings = settings
        self._synthesizer = LLMSynthesizer(settings)
        # Base URL for design system links
        self._base_url = getattr(settings, "app_base_url", "https://reverse-weblens.vercel.app")

    async def generate_prompt(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> ReconstructionPrompt:
        """Generate GitReverse-style prompt with design.md."""
        try:
            # Stage 1: Generate design.md
            logger.info(f"Stage 1: Generating design.md for {url}")
            design_md = await self._generate_design_system(url, evidence, findings)

            # Stage 2: Generate conversational prompt using design.md
            logger.info(f"Stage 2: Generating conversational prompt for {url}")
            conversational_prompt = await self._generate_conversational_prompt(
                url, evidence, findings, design_md
            )

            # Stage 3: Append design system link
            design_link = self._generate_design_link(url)
            final_prompt = self._append_design_link(conversational_prompt, design_link)

            logger.info(f"GitReverse prompt generated successfully for {url}")

            # Build metadata
            title = findings.get("page_title") or (evidence.dom.title if evidence.dom else None)
            title = title or _hostname_from_url(url)

            metadata: dict[str, str | int | bool | None] = {
                "page_title": title,
                "url": url,
                "design_link": design_link,
                "has_design_md": True,
                "design_md_length": len(design_md),
                "has_dom": evidence.dom is not None,
            }

            limitations = [
                "Private backend code, databases, and internal APIs cannot be determined from public observation.",
                "Analysis based on single page load; other routes may differ.",
            ]

            return ReconstructionPrompt(
                prompt=final_prompt,
                source_type=SourceType.WEBSITE,
                source_url=url,
                confidence=self._calculate_confidence(evidence, findings),
                limitations=limitations,
                metadata=metadata,
            )

        except Exception as e:
            logger.error(f"GitReverse engine failed for {url}: {e}")
            # Fallback to basic prompt
            return await self._fallback_prompt(url, evidence, findings)

    async def _generate_design_system(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> str:
        """Stage 1: Generate design.md from evidence."""
        user_message = self._build_design_user_message(url, evidence, findings)

        try:
            design_md = await self._synthesizer.call_llm(
                system_prompt=DESIGN_SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=12000,
            )
            return design_md
        except Exception as e:
            logger.warning(f"Design.md generation failed: {e}, using fallback")
            return self._fallback_design_md(url, findings)

    async def _generate_conversational_prompt(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
        design_md: str,
    ) -> str:
        """Stage 2: Generate conversational prompt using design.md."""
        user_message = self._build_prompt_user_message(url, evidence, findings, design_md)

        try:
            prompt = await self._synthesizer.call_llm(
                system_prompt=CONVERSATIONAL_PROMPT_SYSTEM,
                user_message=user_message,
                max_tokens=4096,
            )
            return prompt
        except Exception as e:
            logger.warning(f"Conversational prompt generation failed: {e}, using fallback")
            return self._fallback_conversational_prompt(url, findings)

    def _build_design_user_message(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> str:
        """Build user message for design.md generation."""
        lines: list[str] = []

        title = findings.get("page_title") or (evidence.dom.title if evidence.dom else None)
        title = title or _hostname_from_url(url)

        lines.append("# Target website")
        lines.append("")
        lines.append(f"URL: {url}")
        if title:
            lines.append(f"Title: {title}")
        lines.append("")

        # Add evidence sections
        if findings.get("meta_description"):
            lines.append("## Description")
            lines.append("")
            lines.append(findings["meta_description"])
            lines.append("")

        # Colors (if available)
        if findings.get("color_palette"):
            lines.append("## Color Palette")
            lines.append("")
            lines.append(findings["color_palette"])
            lines.append("")

        # Fonts
        if findings.get("fonts"):
            lines.append("## Typography")
            lines.append("")
            lines.append(f"Fonts: {findings['fonts']}")
            lines.append("")

        # Navigation
        if findings.get("navigation_links"):
            lines.append("## Navigation Structure")
            lines.append("")
            lines.append(findings["navigation_links"])
            lines.append("")

        # Page structure from DOM
        if evidence.dom and hasattr(evidence.dom, "elements"):
            element_count = len(evidence.dom.elements)
            lines.append("## Page Structure")
            lines.append("")
            lines.append(f"Total elements: {element_count}")
            lines.append("")

        # Body text excerpt
        if evidence.http and evidence.http.body_text:
            excerpt = evidence.http.body_text[:3000]
            lines.append("## Page Content Excerpt")
            lines.append("")
            lines.append(excerpt)
            lines.append("")

        return "\n".join(lines)

    def _build_prompt_user_message(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
        design_md: str,
    ) -> str:
        """Build user message for conversational prompt generation."""
        lines: list[str] = []

        title = findings.get("page_title") or (evidence.dom.title if evidence.dom else None)
        title = title or _hostname_from_url(url)

        lines.append("# Target website")
        lines.append("")
        lines.append(f"URL: {url}")
        if title:
            lines.append(f"Title: {title}")
        lines.append("")

        # Truncate design.md if too long
        design_summary = design_md[:2500] if len(design_md) > 2500 else design_md
        if len(design_md) > 2500:
            design_summary += "\n\n... (design.md truncated)"

        lines.append("## Design System Summary")
        lines.append("")
        lines.append(design_summary)
        lines.append("")

        # Add page content excerpt
        if evidence.http and evidence.http.body_text:
            excerpt = evidence.http.body_text[:4000]
            lines.append("## Page Content Excerpt")
            lines.append("")
            lines.append(excerpt)
            lines.append("")

        # Navigation
        if findings.get("navigation_links"):
            lines.append("## Navigation")
            lines.append("")
            lines.append(findings["navigation_links"])
            lines.append("")

        return "\n".join(lines)

    def _generate_design_link(self, url: str) -> str:
        """Generate unique design system link."""
        domain = _hostname_from_url(url)
        safe_domain = re.sub(r'[^a-z0-9-]', '-', domain.lower())
        safe_domain = re.sub(r'-+', '-', safe_domain).strip('-')
        return f"{self._base_url}/designs/{safe_domain}"

    def _append_design_link(self, prompt: str, design_link: str) -> str:
        """Append design system link to prompt."""
        # Check if link already exists
        if design_link in prompt or "/designs/" in prompt:
            return prompt

        # Add the link at the end with proper formatting
        lines = prompt.split("\n")

        # Find a good place to insert (after first paragraph usually)
        insert_pos = 0
        for i, line in enumerate(lines):
            if i > 0 and line.strip() == "":
                insert_pos = i + 1
                break

        if insert_pos == 0:
            insert_pos = len(lines)

        # Insert design link
        lines.insert(insert_pos, "")
        lines.insert(insert_pos + 1, f"Use this design system for the visuals: {design_link}")
        lines.insert(insert_pos + 2, "")

        return "\n".join(lines)

    def _fallback_design_md(self, url: str, findings: dict[str, str]) -> str:
        """Fallback design.md when LLM fails."""
        title = findings.get("page_title") or _hostname_from_url(url)

        md = f"""# Design System: {title}

## Visual Theme

Clean, modern web design with professional styling.

## Color Palette

- Primary: Professional blue or brand color
- Background: Clean white or light gray
- Text: Dark gray or black for readability

## Typography

- Font family: System fonts or modern web fonts
- Hierarchy: Clear heading sizes with proper line heights

## Components

- Buttons: Rounded corners with hover states
- Cards: Subtle shadows or borders
- Navigation: Clean horizontal or sidebar layout

## Layout

- Responsive design: Mobile-first approach
- Grid system: Flexible containers
- Spacing: Consistent padding and margins
"""
        return md

    def _fallback_conversational_prompt(
        self,
        url: str,
        findings: dict[str, str],
    ) -> str:
        """Fallback conversational prompt when LLM fails."""
        title = findings.get("page_title") or _hostname_from_url(url)
        description = findings.get("meta_description", "")

        prompt = f"Build me a homepage that feels like {title}, clean, professional, and modern. "

        if description:
            prompt += f"{description} "

        prompt += "Use a responsive layout with clear navigation, hero section, and content areas. "
        prompt += "Keep the design minimal and user-friendly."

        return prompt

    async def _fallback_prompt(
        self,
        url: str,
        evidence: RawEvidence,
        findings: dict[str, str],
    ) -> ReconstructionPrompt:
        """Complete fallback when GitReverse engine fails."""
        title = findings.get("page_title") or _hostname_from_url(url)
        prompt = f"Build a web application similar to {title}."

        return ReconstructionPrompt(
            prompt=prompt,
            source_type=SourceType.WEBSITE,
            source_url=url,
            confidence="low",
            limitations=["GitReverse engine failed, using basic fallback"],
            metadata={"url": url, "fallback": True},
        )

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


def _hostname_from_url(url: str) -> str:
    """Extract hostname from URL."""
    try:
        from urllib.parse import urlsplit
        host = urlsplit(url).hostname or url
        return host.removeprefix("www.")
    except Exception:
        return url
