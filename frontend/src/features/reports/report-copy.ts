/**
 * Explanatory copy shared by the PDF and Markdown exports.
 *
 * An exported report is read without the app around it, often by someone who did not run the scan.
 * Numbers and finding names alone are not self-explanatory, so each chapter states what it covers,
 * how to read it, and what it cannot establish. Keeping that text here means the PDF and the
 * Markdown cannot drift into describing the product differently.
 */
import type { FindingStatus, SectionKey } from '@/types/analysis';

export interface SectionDoc {
  /** Chapter subtitle. */
  tagline: string;
  /** What the report is built from. */
  covers: string;
  /** How to read the numbers and verdicts in it. */
  howToRead: string;
  /** Explicit boundary of the report. */
  cannot: string;
  /** Named groups the chapter is organised into. */
  outline: string[];
}

export const SECTION_DOCS: Record<SectionKey, SectionDoc> = {
  design: {
    tagline: 'Layout, typography, colour, media and motion as rendered',
    covers:
      'This report reconstructs the visual system of the page from what a real browser actually rendered: the computed styles on live elements, the fonts the browser resolved and loaded, the colours it painted, the layout methods in use, the breakpoints declared in stylesheets, the media it embedded, and the transitions and animations it defined. Values are measured, not read from a design file.',
    howToRead:
      'Treat the values as a sample of the page, not a full design specification. A colour or type size appears here because it was computed on at least one element that was present when the page settled. Frequently used values are therefore reliable; a value used once in a component that never rendered will be absent. Spacing, radii and shadow values are useful as a starting palette for reimplementation rather than as an exhaustive token list.',
    cannot:
      'It cannot recover the original design files, component names, a design-token source of truth, or the intent behind any decision. It cannot describe states it never entered — hover, focus, error, authenticated, or any view behind an interaction — and it cannot report on pages that were not scanned.',
    outline: [
      'Page structure and landmarks',
      'Layout system and spacing',
      'Responsive behaviour',
      'Typography',
      'Colour system',
      'Components and patterns',
      'Media',
      'Motion',
    ],
  },
  technology: {
    tagline: 'Frontend, rendering, libraries, infrastructure and backend signals',
    covers:
      'This report identifies technologies from signatures that a public visit exposes: markup and DOM structure, script and stylesheet URLs, bundle and chunk naming, runtime globals attached to the page, hydration markers, response headers, cookie naming conventions, and the network requests the page made while loading.',
    howToRead:
      'Read the verdict before the name. "Verified" means a signature unique to that technology was directly observed. "Strongly supported" and "Likely" mean the conclusion rests on signals that are consistent with it but also consistent with alternatives. "Not detected" is a statement about the evidence, not about the site: server-rendered, self-hosted, proxied, and heavily bundled technologies routinely leave no public trace. Anything marked "Not publicly determinable" is a deliberate refusal to guess.',
    cannot:
      'It cannot see private source code, internal services, package manifests, build configuration, or server-side frameworks that emit no public signal. Database, cache, and queue technology is almost never externally determinable and is reported as such rather than inferred from convention.',
    outline: [
      'Identified technologies by layer',
      'Architecture hypotheses',
      'Verdict distribution',
      'Not publicly determinable',
      'Research sources',
    ],
  },
  security: {
    tagline: 'Observable transport, header and cookie configuration',
    covers:
      'This report records the defensive configuration that a public request can observe: the TLS connection and certificate, response headers including CSP, HSTS, framing and referrer policy, cookie attributes, mixed-content loading, technology disclosure through headers, and the third-party origins the page pulled resources from.',
    howToRead:
      'The percentage is the only score ReverseX produces, and it measures presence and quality of observable configuration against published rules — nothing more. Every rule, its weight, and its outcome are listed, and rules that could not be evaluated are excluded from both the awarded and the applicable totals rather than counted as failures. A high number means the visible configuration is good; it is not a verdict on the application behind it.',
    cannot:
      'It is not a penetration test, a vulnerability assessment, or a compliance audit, and it cannot establish that a site is secure or insecure. No forms were submitted, no authentication was attempted, no access control was tested, and no payload was sent. Application logic, dependency vulnerabilities, and server hardening are all outside what a passive visit can see.',
    outline: [
      'Observable posture and score',
      'Rule-by-rule results',
      'Transport security',
      'Response headers',
      'Cookies',
      'Mixed content',
      'Technology disclosure',
      'Third-party origins',
    ],
  },
  traffic: {
    tagline: 'Public popularity signals and measurement tooling',
    covers:
      'This report separates two different things: popularity data sourced from a configured public dataset, and the analytics or measurement tooling observed loading on the page. The second tells you how the site measures itself; it says nothing about how much traffic it receives.',
    howToRead:
      'If no traffic data provider is configured for the build that produced this scan, there is no estimate, and none is invented. Where an estimate exists, its source and verdict are printed with it so you can weigh it. Ranking datasets measure different things on different schedules and disagree with each other by design, so treat any figure as an order of magnitude rather than a measurement.',
    cannot:
      'It cannot access private analytics, real visitor counts, sessions, conversion or campaign data, revenue, or audience demographics. The presence of an analytics tag indicates only that the tool is installed.',
    outline: [
      'Popularity verdict',
      'Traffic estimate',
      'Measurement tooling observed',
      'Confidence and limitations',
    ],
  },
};

/** Long-form meaning of each verdict, printed as a glossary in every export. */
export const VERDICT_GLOSSARY: { status: FindingStatus; label: string; meaning: string }[] = [
  {
    status: 'verified',
    label: 'Verified',
    meaning:
      'Directly observed in evidence collected during this scan. The supporting evidence is listed with the finding.',
  },
  {
    status: 'strongly_inferred',
    label: 'Strongly supported',
    meaning:
      'Multiple independent signals agree, but no single signature confirms it outright.',
  },
  {
    status: 'inferred',
    label: 'Likely',
    meaning:
      'Good evidence points to this conclusion, but it is not conclusive and a plausible alternative remains.',
  },
  {
    status: 'ai_inferred',
    label: 'AI inferred',
    meaning:
      'A hypothesis produced by the optional AI intelligence layer from observed evidence and public research. It is never a verified fact and is always reported separately from deterministic findings.',
  },
  {
    status: 'not_detected',
    label: 'Not detected',
    meaning:
      'Evidence was collected and the expected signature was absent. This is a statement about the evidence, not proof the technology is unused.',
  },
  {
    status: 'not_determinable',
    label: 'Not publicly determinable',
    meaning:
      'The property cannot reasonably be established from outside the site. Reported explicitly instead of guessed.',
  },
  {
    status: 'unable_to_verify',
    label: 'Unable to verify',
    meaning:
      'The evidence this check needed was unavailable, or collection failed. The check did not run to completion.',
  },
];

export const STANDING_DISCLAIMER =
  'ReverseX observes what a normal visit to a single public URL reveals, at one point in time, from ' +
  'one network location. It is passive: no forms were submitted, no authentication was attempted, ' +
  'no access controls were tested, and no crawling was performed. Findings describe the page that ' +
  'was scanned and should not be generalised to an entire site or to a later state of the page.';

export const HOW_TO_READ_INTRO =
  'Every claim in this report carries a verdict that states how strongly the evidence supports it. ' +
  'The vocabulary is deliberately narrow, and the distinction between "absent from the evidence" ' +
  'and "not present on the site" is preserved everywhere. Read the verdict before the claim.';

export function evidenceQualityMeaning(band: string): string {
  switch (band) {
    case 'high':
      return 'Collection was largely complete, so the findings in this chapter rest on a full evidence set.';
    case 'medium':
      return 'Collection succeeded but left gaps, so some checks had less evidence than they wanted.';
    case 'low':
      return 'Collection was substantially incomplete. Absent findings here are more likely to reflect missing evidence than a genuine absence on the page.';
    case 'failed':
      return 'Collection failed for this area. Nothing was substituted in its place.';
    default:
      return 'Evidence completeness was not assessed for this chapter.';
  }
}
