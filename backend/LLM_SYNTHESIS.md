# LLM-Based Prompt Synthesis

ReverseX can optionally use an LLM (Large Language Model) to transform structured technical analysis into natural, conversational "vibe coding" prompts—like [GitReverse](https://gitreverse.com).

## Why Use LLM Synthesis?

**Without LLM (default):**
```
Build a web application similar to **Example App**.

## Technical Stack
- **Frontend**: React, TypeScript
- **Styling**: Tailwind CSS

## Key Features & User Flow
- User authentication and login
- Dashboard with data visualization
...
```

**With LLM synthesis:**
```
Build me a modern analytics dashboard web app with a clean, dark mode interface. 

Users should be able to sign in and see their data visualized in charts and graphs 
on the main dashboard. The design should feel premium, with smooth animations and a 
sidebar for navigation. Use React and TypeScript for the frontend, and make it 
fully responsive so it works great on mobile too.

Look up current docs for chart libraries if needed.
```

The LLM version sounds like a **real person** asking an AI coding agent to build something.

---

## Supported Providers

| Provider | Use Case | Cost |
|----------|----------|------|
| **none** (default) | Structured technical prompts | Free |
| **openai** | High-quality synthesis, fast | ~$0.001/prompt (GPT-4o-mini) |
| **anthropic** | Highest quality, natural language | ~$0.003/prompt (Claude 3.5 Haiku) |
| **ollama** | Run locally, private | Free (requires local install) |

---

## Quick Start

### Option 1: OpenAI (Recommended)

1. Get an API key from https://platform.openai.com/api-keys

2. Add to your `.env`:
```bash
WEBLENS_LLM_PROVIDER=openai
WEBLENS_LLM_API_KEY=sk-proj-...
WEBLENS_LLM_MODEL=gpt-4o-mini  # or gpt-4o for higher quality
```

3. Restart the backend:
```bash
make dev-backend
```

That's it! All new reconstructions will use natural language prompts.

### Option 2: Anthropic Claude

1. Get an API key from https://console.anthropic.com/

2. Add to your `.env`:
```bash
WEBLENS_LLM_PROVIDER=anthropic
WEBLENS_LLM_API_KEY=sk-ant-...
WEBLENS_LLM_MODEL=claude-3-5-haiku-20241022
WEBLENS_LLM_BASE_URL=https://api.anthropic.com/v1
```

### Option 3: Ollama (Local, Free)

1. Install Ollama: https://ollama.com/download

2. Pull a model:
```bash
ollama pull llama3.1
# or: qwen2.5, mistral, deepseek-coder
```

3. Add to your `.env`:
```bash
WEBLENS_LLM_PROVIDER=ollama
WEBLENS_LLM_MODEL=llama3.1
WEBLENS_LLM_BASE_URL=http://localhost:11434
```

---

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBLENS_LLM_PROVIDER` | `none` \| `openai` \| `anthropic` \| `ollama` | `none` |
| `WEBLENS_LLM_API_KEY` | API key (not needed for Ollama) | (empty) |
| `WEBLENS_LLM_MODEL` | Model name | `gpt-4o-mini` |
| `WEBLENS_LLM_BASE_URL` | API endpoint | `https://api.openai.com/v1` |
| `WEBLENS_LLM_TIMEOUT_SECONDS` | HTTP timeout for LLM calls | `30` |

### Recommended Models

**OpenAI:**
- `gpt-4o-mini` — Fast, cheap, good quality (recommended)
- `gpt-4o` — Highest quality, more expensive
- `gpt-4-turbo` — Alternative high-quality option

**Anthropic:**
- `claude-3-5-haiku-20241022` — Fast, cost-effective
- `claude-3-5-sonnet-20241022` — Best quality

**Ollama (Local):**
- `llama3.1` — Good general model
- `qwen2.5` — Fast, code-focused
- `mistral` — Balanced performance
- `deepseek-coder` — Specialized for code

---

## How It Works

1. **Evidence Collection** — ReverseX gathers technical details (DOM, scripts, GitHub files)
2. **Structured Analysis** — Analyzes tech stack, features, design patterns
3. **LLM Synthesis** — LLM transforms structured data → natural prompt
4. **Fallback Safety** — If LLM fails, returns structured prompt (no reconstruction fails)

The LLM never sees sensitive data—only the structured analysis output.

---

## Troubleshooting

### "LLM synthesis failed, using structured prompt"

Check logs for the specific error. Common issues:

**Invalid API key:**
```bash
# Verify your key is set correctly
echo $WEBLENS_LLM_API_KEY
```

**Network timeout:**
```bash
# Increase timeout in .env
WEBLENS_LLM_TIMEOUT_SECONDS=60
```

**Ollama not running:**
```bash
# Start Ollama
ollama serve
# In another terminal:
ollama pull llama3.1
```

### Test Your Configuration

```bash
# Check if backend loads config correctly
cd backend
source .venv/bin/activate
python -c "from weblens.config import Settings; s = Settings(); print(f'Provider: {s.llm_provider}')"
```

### Disable LLM Synthesis

Set `WEBLENS_LLM_PROVIDER=none` in `.env` and restart.

---

## Cost Estimates

Based on typical 500-word reconstruction prompts:

| Provider | Model | Cost per prompt | 100 prompts | 1000 prompts |
|----------|-------|-----------------|-------------|--------------|
| OpenAI | gpt-4o-mini | $0.001 | $0.10 | $1.00 |
| OpenAI | gpt-4o | $0.005 | $0.50 | $5.00 |
| Anthropic | Claude 3.5 Haiku | $0.003 | $0.30 | $3.00 |
| Anthropic | Claude 3.5 Sonnet | $0.015 | $1.50 | $15.00 |
| Ollama | Any | $0.00 | $0.00 | $0.00 |

**Recommendation:** Start with `gpt-4o-mini` for the best balance of quality and cost.

---

## Advanced: Custom Base URLs

### Azure OpenAI
```bash
WEBLENS_LLM_PROVIDER=openai
WEBLENS_LLM_API_KEY=your-azure-key
WEBLENS_LLM_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
WEBLENS_LLM_MODEL=gpt-4
```

### OpenAI-compatible proxies
Any API that implements the OpenAI chat completions format works:
```bash
WEBLENS_LLM_PROVIDER=openai
WEBLENS_LLM_BASE_URL=https://your-proxy.example.com/v1
```

---

## Privacy & Security

- LLM sees only **structured analysis output**, not raw page content
- No user data, API keys, or secrets are sent to the LLM
- Network requests go directly to the LLM provider (or localhost for Ollama)
- If synthesis fails, system falls back gracefully—no data loss

For maximum privacy, use **Ollama** (runs entirely on your machine).
