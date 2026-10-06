"""Website evidence summarizer.

Distills RawEvidence into a flat findings dict that the prompt generator can consume
without knowing about the full evidence model.
"""

from __future__ import annotations

from weblens.domain.evidence import RawEvidence
from weblens.logging import get_logger

logger = get_logger(__name__)


class WebsiteSummarizer:
    """Converts RawEvidence into a flat summary dict."""

    def summarize(self, evidence: RawEvidence) -> dict[str, str]:
        """Return a simplified key→value map of observable facts."""
        findings: dict[str, str] = {}

        # HTTP observations
        if evidence.http:
            http = evidence.http
            if http.status:
                findings["http_status"] = str(http.status)
            if http.final_url:
                findings["final_url"] = http.final_url
            # Extract headers
            if http.headers:
                for h in http.headers:
                    if h.name.lower() == "server":
                        findings["server_header"] = h.value or ""
                    elif h.name.lower() == "x-powered-by":
                        findings["x_powered_by"] = h.value or ""
                    elif h.name.lower() == "content-type":
                        findings["content_type"] = h.value or ""
                    elif h.name.lower() == "x-frame-options":
                        findings["x_frame_options"] = h.value or ""
                    elif h.name.lower() == "strict-transport-security":
                        findings["hsts"] = h.value or ""
                    elif h.name.lower() == "content-security-policy":
                        findings["csp"] = (h.value or "")[:200]

        # DOM observations
        if evidence.dom:
            dom = evidence.dom
            if dom.title:
                findings["page_title"] = dom.title
            # Extract meta description via helper method
            meta_desc_tag = dom.meta_by_name("description")
            if meta_desc_tag and meta_desc_tag.content:
                findings["meta_description"] = meta_desc_tag.content[:300]
            # Links come from link_tags
            if dom.link_tags:
                nav_links = [link.href for link in dom.link_tags[:50] if link.href]
                if nav_links:
                    findings["navigation_links"] = ", ".join(nav_links[:10])
            if dom.scripts:
                script_srcs = [s.src for s in dom.scripts[:30] if s.src]
                findings["script_sources"] = ", ".join(script_srcs[:10])

        # Runtime observations
        if evidence.runtime:
            rt = evidence.runtime
            if rt.globals_present:
                globals_list = rt.globals_present[:20]
                findings["runtime_globals"] = ", ".join(str(g) for g in globals_list)
            # Framework detection hints
            globals_str = findings.get("runtime_globals", "").lower()
            if "react" in globals_str or "__react" in globals_str:
                findings["framework_hint"] = "React"
            elif "vue" in globals_str or "__vue" in globals_str:
                findings["framework_hint"] = "Vue"
            elif "angular" in globals_str:
                findings["framework_hint"] = "Angular"
            elif "next" in globals_str or "__next" in globals_str:
                findings["framework_hint"] = "Next.js"
            elif "svelte" in globals_str:
                findings["framework_hint"] = "Svelte"
            elif "gatsby" in globals_str:
                findings["framework_hint"] = "Gatsby"

        # Network observations
        if evidence.network and evidence.network.requests:
            third_party_domains: set[str] = set()
            has_api_calls = False
            for req in evidence.network.requests[:100]:
                url = getattr(req, "url", "") or ""
                if "/api/" in url or url.endswith(".json"):
                    has_api_calls = True
                # Extract third-party domains
                for service, domain in _THIRD_PARTY_DOMAINS.items():
                    if domain in url:
                        third_party_domains.add(service)
            if third_party_domains:
                findings["third_party_services"] = ", ".join(sorted(third_party_domains))
            if has_api_calls:
                findings["has_api_calls"] = "true"

        # Performance observations
        if evidence.performance:
            perf = evidence.performance
            if hasattr(perf, "lcp") and perf.lcp is not None:
                findings["lcp_ms"] = str(int(perf.lcp))
            if hasattr(perf, "cls") and perf.cls is not None:
                findings["cls"] = str(round(perf.cls, 3))

        # Style observations
        if evidence.styles:
            styles = evidence.styles
            if hasattr(styles, "font_families"):
                fonts = getattr(styles, "font_families", [])
                if fonts:
                    findings["fonts"] = ", ".join(str(f) for f in fonts[:5])

        # DNS
        if evidence.dns and hasattr(evidence.dns, "records") and evidence.dns.records:
            for rec in evidence.dns.records:
                rtype = getattr(rec, "type", "")
                value = getattr(rec, "value", "")
                if rtype == "TXT" and value:
                    txt_lower = str(value).lower()
                    if "google-site-verification" in txt_lower:
                        findings["google_verified"] = "true"
                    elif "v=spf1" in txt_lower:
                        findings["has_spf"] = "true"

        # Accessibility
        if evidence.accessibility:
            axe = evidence.accessibility
            if hasattr(axe, "violations") and axe.violations:
                findings["a11y_violations"] = str(len(axe.violations))

        # Research (from AI/search)
        if evidence.research and evidence.research.results:
            snippets = [
                r.excerpt for r in evidence.research.results[:3]
                if r.excerpt
            ]
            if snippets:
                findings["research_snippets"] = " | ".join(
                    s[:200] for s in snippets
                )

        return findings


_THIRD_PARTY_DOMAINS = {
    "Google Analytics": "google-analytics.com",
    "Google Tag Manager": "googletagmanager.com",
    "Stripe": "stripe.com",
    "Intercom": "intercom.com",
    "HubSpot": "hubspot.com",
    "Hotjar": "hotjar.com",
    "Segment": "segment.com",
    "Mixpanel": "mixpanel.com",
    "Amplitude": "amplitude.com",
    "Cloudflare": "cloudflare.com",
    "Sentry": "sentry.io",
    "Datadog": "datadog.com",
    "Plausible": "plausible.io",
    "Auth0": "auth0.com",
    "AWS": "amazonaws.com",
    "Vercel": "vercel.com",
    "Netlify": "netlify.com",
    "Supabase": "supabase.co",
    "Firebase": "firebase.com",
    "Algolia": "algolia.net",
    "Twilio": "twilio.com",
    "SendGrid": "sendgrid.net",
    "Mailchimp": "mailchimp.com",
    "Zendesk": "zendesk.com",
    "Crisp": "crisp.chat",
    "Drift": "drift.com",
}
