<div align="center">

<a href="https://reversex-weblens.vercel.app">
  <img src="https://raw.githubusercontent.com/Abhishek09821/weblens/main/frontend/brand/reversex-logo.png" alt="ReverseX — Reverse engineer the web" width="520" />
</a>

<br />

### Website Technical Intelligence Analyzer

**Observe the public web. Prove the finding. Never guess.**

ReverseX takes one publicly reachable URL and turns observable browser, HTTP/TLS, DNS, robots,
DOM, runtime, and network evidence into a technical intelligence report.

<br />

<a href="https://reversex-weblens.vercel.app">
  <img src = "Open ReverseX" />
</a>
<a href="https://weblens-backend-uxtf.onrender.com/docs">
  <img src= "API Docs" />
</a>

<br /><br />

| **Evidence-first** | **Deterministic detection** | **Browser-powered** | **No database in V1** |
|:---:|:---:|:---:|:---:|
| Every finding keeps provenance | AI does not invent facts | Real Playwright + Chromium | Results live in the browser |

</div>

---

## What ReverseX does

ReverseX is built for **public, evidence-backed website intelligence**. Give it one URL and it collects what a normal public visit can actually reveal, then runs deterministic analyzers over that evidence.

It covers:

| Area | What it looks at |
|---|---|
|  **Design & UI** | Color palette, typography, spacing, borders, radius, shadows, media, responsive signals, animation/transition clues and visual-system patterns |
|  **Technology Stack** | Frontend/runtime signals, styling frameworks, server/platform clues, CDN/hosting signals, resources, protocols, MIME types and third-party services |
|  **Security** | Response headers, CSP, cookie security attributes, TLS observations, mixed-content signals, public exposure indicators and documented security-posture rules |
|  **Performance** | Resource breakdown, navigation timings, paint/LCP/CLS signals, long tasks, request composition and loading behaviour |
|  **Accessibility** | Semantic HTML, labels, ARIA usage, contrast-related signals and vendored **axe-core** analysis |
|  **SEO** | Title/meta, canonical, robots, sitemap, Open Graph, structured data, headings, indexability signals and related metadata |
|  **Architecture** | Hosting/CDN clues, DNS, server technology, edge behaviour and infrastructure fingerprints visible from public evidence |
|  **Network & Traffic** | Request ledger, DNS, redirects, protocols, headers, resource types, cache signals and supported public traffic observations |

> **Unknown is a valid result.** If the evidence cannot establish something, ReverseX reports it as unknown/not determinable instead of turning assumptions into facts.

---

## How it works

```text
Public URL
    │
    ▼
Validate + SSRF / target guards
    │
    ▼
Collect observable evidence
    ├── Real browser / DOM / runtime
    ├── HTTP + response headers
    ├── TLS / DNS / robots
    └── Network request ledger
    │
    ▼
Deterministic analyzers
    │
    ▼
Findings + provenance + limitations
    │
    ├── Optional public research
    └── Optional AI explanation
    │
    ▼
Analysis result
    │
    ▼
Browser IndexedDB
    │
    ▼
Dashboard + downloadable reports
```

### The key rule

**Detection is not done by AI.**

The analyzer pipeline is evidence-driven and deterministic. The optional AI layer can explain findings that already exist, but it is not allowed to promote an untraceable statement into a verified fact.

---

## What makes ReverseX different?

### Evidence over guessing
Every supported assertion is tied back to collected evidence and provenance.

### Deterministic detection
The detection layer does not rely on an LLM guessing a framework, vendor, security property or architecture detail.

### Honest limitations
The system explicitly reports missing or indeterminate information instead of pretending it knows.

### Browser-first persistence
Scan results are stored in **IndexedDB** in the user's browser. V1 does not keep a permanent server-side scan database.

### Reports generated from stored evidence
Reports are generated client-side from the stored result, so exports can still work even when the backend is offline.

---

## Reports

ReverseX can generate client-side report artifacts from the stored analysis result:

```text
analysis.json
complete-report.zip

design.md
techstack.md
security.md
performance.md
accessibility.md
seo.md
architecture.md
```

The exact sections exposed for a scan depend on which analyzer capabilities have evidence available.

---

## AI layer

AI is an **optional explanation layer**, not the source of truth.

When enabled, it can:

- explain findings already produced by deterministic analyzers
- summarize evidence in a human-readable way
- assist with public-source research when needed

Statements that cannot be traced back to a supported finding are dropped instead of being presented as facts.

---

## Security & scope

ReverseX is deliberately **passive**.

It does **not** perform:

- exploitation or offensive security testing
- brute force, credential attacks or authentication bypass
- fuzzing or destructive testing
- site-wide crawling or bulk scanning
- authenticated, paywalled or geo-restricted access
- bot-protection or consent-wall bypassing
- claims about private systems that are not publicly observable

The security posture score is a **configuration-oriented communication score**, not a vulnerability assessment and not proof that a site is secure or insecure.

### Operator warning

V1 intentionally has no authentication and accepts user-supplied URLs. That makes the API a request-forwarding surface.

The project includes loopback/private-address protection, scheme/port restrictions, CORS controls and DNS re-checks across redirects, but the service should **not be exposed to an untrusted network without authentication and stronger egress controls**.

---

## Current status

**Phase 0 — blueprint + skeleton**

The architecture, contracts and end-to-end plumbing are in place. The `seo.metadata` pilot analyzer is wired end to end; remaining registered analyzers are surfaced honestly as `not_implemented` rather than returning fabricated coverage.

See [`docs/blueprint/13-development-phases.md`](docs/blueprint/13-development-phases.md) for the development roadmap.

---

## Run locally

### Requirements

- **Python 3.12**
- **Node.js 20+**
- **Make**
- ~150 MB of disk for the Playwright Chromium build

### 1. Setup

```bash
make setup
```

This creates the backend environment, installs dependencies, installs frontend packages, and downloads the Playwright Chromium build.

### 2. Start the backend

```bash
make dev-backend
```

Backend: `http://127.0.0.1:8000`  
API docs: `http://127.0.0.1:8000/docs`

### 3. Start the frontend

In a second terminal:

```bash
make dev-frontend
```

Frontend: `http://127.0.0.1:5173`

Then open the frontend and enter a publicly reachable `http://` or `https://` URL.

---

## Project structure

```text
weblens/
├── backend/        # FastAPI, Playwright collection, models, collectors, analyzers
├── frontend/       # TypeScript + Vite UI, IndexedDB persistence, reports
├── contracts/      # OpenAPI contract + generated shared API types
├── docs/           # Blueprint, decisions, methodology and limitations
└── Makefile        # Local setup + run commands
```

---

## Tech stack

### Frontend

**TypeScript · Vite · Tailwind CSS · shadcn/ui · IndexedDB · generated API types · client-side report generation**

### Backend

**Python 3.12 · FastAPI · Uvicorn · Playwright · Chromium · Pydantic · pydantic-settings · HTTP/TLS/DNS/robots collectors**

### Analysis & contracts

**Deterministic analyzers · OpenAPI · generated TypeScript types · vendored axe-core**

---

## Live deployment

<div align="center">

<a href="https://reversex-weblens.vercel.app">
  <img src="https://img.shields.io/badge/OPEN%20REVERSEX-Live%20Website-0b8f9c?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Open ReverseX" />
</a>

<br /><br />

| Service | URL |
|---|---|
| **Frontend** | [reversex-weblens.vercel.app](https://reversex-weblens.vercel.app) |
| **Backend** | [weblens-backend-uxtf.onrender.com](https://weblens-backend-uxtf.onrender.com) |
| **API Docs** | [weblens-backend-uxtf.onrender.com/docs](https://weblens-backend-uxtf.onrender.com/docs) |

</div>

---

## Built by

**Abhishek Tiwari**  
Software Engineer · Full-Stack Developer

[LinkedIn](https://www.linkedin.com/in/abhishek-tiwari-3a3594300/)

<div align="center">

> **We observe. We don't assume.**  
> **We prove. We don't guess.**

</div>
