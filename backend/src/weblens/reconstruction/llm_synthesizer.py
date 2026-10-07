"""LLM-based prompt synthesis.

Takes structured evidence and generates natural, conversational "vibe coding" prompts
like GitReverse. Uses an LLM to transform technical extraction into plain language
that sounds like a real person asking an AI coding agent to build something.
"""

from __future__ import annotations

from typing import Literal

import httpx

from weblens.config import Settings
from weblens.logging import get_logger

logger = get_logger(__name__)

# GitReverse-style system prompt for natural language synthesis
SYNTHESIS_SYSTEM_PROMPT = """You are an expert at inferring how people actually \
prompt modern coding agents.

## Task

You are given **structured evidence** about a website or GitHub repository. \
Output **one synthetic user message**: the kind of prompt a **non-technical or \
lightly technical** person might paste into Cursor, Claude, Windsurf, v0, or \
ChatGPT to rebuild this product in one "vibe coding" pass.

## What the output must be

- **Plain language.** Sounds like a real request ("Build me…", "I want…", \
"Create…"), not an architecture doc or spec.
- **Outcome focused.** Describe what the site or app should *do* and *feel like* \
for a user.
- **Visual personality.** Weave in brand mood, colors, and design naturally when \
evidence supports it.
- **Honest scope.** Only claim features you can infer from the evidence. Keep \
claims vague when evidence is thin.
- **Length:** about **150 to 250 words**, usually 2-3 short paragraphs. Not a \
bullet list of technologies or file paths.
- **Tone:** natural and conversational. Use contractions when they fit ("it's", \
"don't", "you'll"). No preamble ("Sure, here is…"), no meta ("As an AI…"), no filler.
- **Readability:** Use spacing and line breaks between ideas. NEVER use hyphens \
or em dashes—split into shorter sentences or use commas instead.

## What to avoid

- Dumping raw technical details, exact package names, hex codes, or folder structure.
- Writing agent *system* instructions, markdown specs, or pseudo-code blocks.
- Inventing features not supported by the evidence.
- Using bullets, numbered lists, or technical jargon unless the original product \
is developer-focused.

## Context you can assume

Modern agents can **search the web**, **read docs**, and iterate in the IDE. \
One short line like "look up current docs if needed" is fine when relevant.

## Output format

Reply with **only** the synthetic user message. No title, no markdown code fences, \
no quotes, no explanation before or after. Start directly with the prompt text."""


class LLMSynthesizer:
    """Synthesizes natural-language prompts using an LLM."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.provider = settings.llm_provider
        self.api_key = settings.llm_api_key
        self.model = settings.llm_model
        self.base_url = settings.llm_base_url
        self.timeout = settings.llm_timeout_seconds

    async def synthesize(
        self,
        structured_prompt: str,
        source_type: Literal["website", "github_repo"],
    ) -> str:
        """
        Transform structured evidence into a natural-language prompt.

        Args:
            structured_prompt: Technical extraction output (your current prompt format)
            source_type: "website" or "github_repo"

        Returns:
            Natural-language "vibe coding" prompt

        Raises:
            Exception if LLM call fails
        """
        if self.provider == "none":
            logger.debug(
                "LLM synthesis disabled (provider=none), returning structured prompt as-is"
            )
            return structured_prompt

        user_message = self._build_user_message(structured_prompt, source_type)

        try:
            if self.provider == "openai":
                return await self._call_openai(user_message)
            elif self.provider == "anthropic":
                return await self._call_anthropic(user_message)
            elif self.provider == "ollama":
                return await self._call_ollama(user_message)
            else:
                logger.warning(
                    f"Unknown LLM provider '{self.provider}', "
                    "falling back to structured prompt"
                )
                return structured_prompt
        except Exception as e:
            logger.error(f"LLM synthesis failed: {e}", exc_info=True)
            # Fallback to structured prompt rather than failing the entire reconstruction
            return structured_prompt

    def _build_user_message(self, structured_prompt: str, source_type: str) -> str:
        """Build the user message for the LLM."""
        source_label = "GitHub repository" if source_type == "github_repo" else "website"
        return f"""# Source: {source_label}

## Structured evidence

{structured_prompt}

---

Transform the above into a natural, conversational prompt that a real person would \
use to ask an AI coding agent to build this {source_label}."""

    async def _call_openai(self, user_message: str) -> str:
        """Call OpenAI API (compatible with OpenAI, Azure OpenAI, and many proxies)."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.7,
            "max_tokens": 800,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_anthropic(self, user_message: str) -> str:
        """Call Anthropic Claude API."""
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": 800,
            "temperature": 0.7,
            "system": SYNTHESIS_SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": user_message},
            ],
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"].strip()

    async def _call_ollama(self, user_message: str) -> str:
        """Call Ollama (local LLM server)."""
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 800,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"].strip()
