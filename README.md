<div align="center">
  <a href="https://reversex-weblens.vercel.app" aria-label="Open ReverseX">
    <img src="frontend/public/reversex-wordmark.png" alt="ReverseX" width="360" />
  </a>

  <h3>Reverse engineer the web — from public evidence.</h3>

  <p>
    ReverseX is a Website Technical Intelligence Analyzer that turns one public URL into an
    evidence-backed technical report using browser, HTTP/TLS, DNS, robots, DOM, runtime and network signals.
  </p>

  <p>
    <a href="https://reversex-weblens.vercel.app"><strong>🚀 Open ReverseX</strong></a>
    &nbsp;·&nbsp;
    <a href="https://weblens-backend-uxtf.onrender.com/docs"><strong>API Docs</strong></a>
  </p>

  <p>
    <a href="https://reversex-weblens.vercel.app">
      <img src="https://img.shields.io/badge/Live%20Demo-ReverseX-0ea5a8?style=for-the-badge" alt="Live Demo" />
    </a>
    <img src="https://img.shields.io/badge/Frontend-Vercel-111827?style=for-the-badge&logo=vercel" alt="Frontend on Vercel" />
    <img src="https://img.shields.io/badge/Backend-Render-6d28d9?style=for-the-badge" alt="Backend on Render" />
  </p>
</div>

What is ReverseX?

ReverseX analyzes a publicly reachable website and builds a technical picture from what a normal visit can actually observe.

Its core principle is:

Evidence first. Deterministic detection second. AI only for explanation.

Every supported assertion is derived from collected evidence and keeps provenance. When the system cannot establish something from the available evidence, it reports that limitation instead of guessing.

Core capabilities

🎨 Design intelligence

ReverseX extracts observable design and presentation signals such as:

colour palette and computed styles

typography and loaded fonts

spacing, borders, radius, shadows and layout signals

responsive behaviour indicators

images, SVG, video, picture and media usage

animation and transition signals

accessibility structure and axe-core findings

⚙️ Technology intelligence

The analysis can surface public technical clues across the stack, including:

frontend/runtime signatures

styling framework signals

server and platform indicators when publicly disclosed

hosting, CDN and edge clues

browser/runtime and service-worker signals

resource types, protocols, MIME types and request composition

first-party vs third-party network activity

performance timing, paint, LCP, CLS and long-task signals

SEO metadata, structured data and indexability observations

🛡️ Security observations

ReverseX performs passive security analysis from public configuration rather than attacking the target:

security response headers

Content-Security-Policy observations

cookie security attributes without collecting cookie values

TLS observations

mixed-content signals

public exposure indicators

observable third-party security signals

an evidence-based security posture score using documented rules

The security score is not a vulnerability scanner and cannot prove that a site is secure or insecure.

📡 Network & traffic visibility

The evidence model includes:

HTTP request/response observations

network request ledger and resource composition

DNS and robots observations

protocol and MIME-type signals

public traffic/popularity signals when a supported provider is available

Unavailable data is surfaced as unavailable instead of being invented.

Evidence-driven architecture

Public URL
   ↓
Validate + target / SSRF guards
   ↓
Collect observable evidence
   ├─ Real browser / DOM / runtime
   ├─ HTTP response + headers
   ├─ TLS / DNS / robots
   └─ Network request ledger
   ↓
Deterministic analyzers
   ↓
Findings + evidence provenance + limits
   ↓
Optional research / AI explanation
   ↓
Analysis result
   ↓
Browser IndexedDB
   ↓
Dashboard + downloadable reports

The analyzer registry is the capability source of truth, so incomplete analyzers are exposed honestly rather than represented as fabricated results.

AI layer

AI is not the detection engine.

When enabled, the optional AI layer can explain findings that already exist, help summarize evidence, and support public research. AI-generated statements that cannot be traced back to a supported finding are discarded rather than promoted to facts.

Reports & persistence

ReverseX V1 uses a browser-first result model:

scan results are stored in IndexedDB in the user's browser

the backend temporarily holds a result until the client confirms persistence

there is no V1 database for scan history

deleting a scan removes the local browser copy

reports are generated client-side from the stored result

exports can remain available even after the backend is stopped

Available report outputs include Markdown reports, JSON analysis and a complete report bundle. The UI also exposes downloadable sections for design, technology, security, performance, accessibility, SEO and architecture where the corresponding analyzer capability is available.

Current implementation status

ReverseX is currently a Phase 0 blueprint/skeleton with the architecture, contracts and end-to-end plumbing in place. The seo.metadata pilot analyzer is implemented end to end; the remaining registered analyzers are surfaced as not_implemented so the UI and reports remain honest about current coverage.

What ReverseX does not do

no offensive security testing

no exploitation, brute force, credential attacks or authentication bypass

no fuzzing or destructive testing

no site-wide crawling; one URL per scan

no authenticated, paywalled or geo-restricted content

no bypassing bot protection or consent walls

no claims about private systems without public evidence

Security note for operators

V1 intentionally has no authentication and accepts user-supplied URLs, making the API a request-forwarding surface. It includes loopback/private-address protections, scheme/port restrictions, CORS controls and DNS re-checks across redirects.

Do not expose the service to an untrusted network without adding authentication and appropriate egress controls.

Run ReverseX locally

Requirements

Python 3.12

Node.js 20+

Make

roughly 150 MB of disk for the Playwright Chromium build

Install

make setup

This sets up the backend environment and dependencies, installs frontend packages, and downloads the Playwright Chromium build.

Run the backend

make dev-backend

API: http://127.0.0.1:8000

API docs: http://127.0.0.1:8000/docs

Run the frontend

In a second terminal:

make dev-frontend

App: http://127.0.0.1:5173

Open the frontend, enter a public HTTP(S) URL, and start an analysis.

Project structure

ReverseX/
├── backend/          # FastAPI + Playwright collection + deterministic analyzers
├── frontend/         # TypeScript + Vite frontend, Tailwind CSS UI, IndexedDB and report generation
├── contracts/        # generated OpenAPI contract shared by backend/frontend
├── docs/             # architecture, decisions, methodology and limitations
├── Makefile          # local setup and run commands
└── README.md

Tech stack

Frontend

TypeScript

Vite

Tailwind CSS

browser IndexedDB persistence

client-side Markdown / JSON / PDF / ZIP report generation

Backend

Python 3.12

FastAPI

Uvicorn

Playwright + Chromium

Pydantic / pydantic-settings

HTTP/TLS/DNS/robots collection and deterministic analyzers

Contracts & tooling

OpenAPI contract shared between frontend and backend

generated TypeScript API types

axe-core for vendored accessibility analysis

Live deployment

ReverseX: https://reversex-weblens.vercel.app

Backend API: https://weblens-backend-uxtf.onrender.com

API Docs: https://weblens-backend-uxtf.onrender.com/docs

Creator

Built by Abhishek Tiwari.

LinkedIn

<div align="center">
  <a href="https://reversex-weblens.vercel.app"><strong>🚀 Explore ReverseX</strong></a>
</div>
