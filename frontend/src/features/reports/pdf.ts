/**
 * PDF export.
 *
 * The exported document has to stand on its own: it is read outside the app, often by someone who
 * did not run the scan. So every chapter states what it covers and what it cannot establish, every
 * verdict is spelled out in words, and the full finding set is printed rather than a summary.
 */
import { findingStatusLabel } from '@/lib/format/status';
import { sectionLabel } from '@/lib/format/labels';
import { formatDuration, formatTimestamp } from '@/lib/format/values';
import { buildDesignPresentation } from '@/lib/presentation/design';
import { buildOverview } from '@/lib/presentation/overview';
import { buildTechPresentation } from '@/lib/presentation/technology';
import {
  SECTION_KEYS,
  securityPayloadSchema,
  trafficPayloadSchema,
  type AnalysisResult,
  type Finding,
  type FindingStatus,
  type Section,
  type SectionKey,
} from '@/types/analysis';

import { COLOR, CONTENT_W, PAGE, Pdf, truncate, type Rgb } from './pdf-kit';
import {
  HOW_TO_READ_INTRO,
  SECTION_DOCS,
  STANDING_DISCLAIMER,
  VERDICT_GLOSSARY,
  evidenceQualityMeaning,
} from './report-copy';

const CHAPTER_INDEX: Record<SectionKey, string> = {
  design: 'Report 01',
  technology: 'Report 02',
  security: 'Report 03',
  traffic: 'Report 04',
};

/* ------------------------------------------------------------------------------------ */
/* Public API                                                                           */
/* ------------------------------------------------------------------------------------ */

export function generateSectionPdf(result: AnalysisResult, sectionKey: SectionKey): Blob {
  const pdf = new Pdf();
  renderCover(pdf, result, `${sectionLabel(sectionKey)} report`);
  pdf.page();
  renderHowToRead(pdf);
  pdf.page();
  renderSection(pdf, result, sectionKey);
  renderClosing(pdf, result);
  pdf.finish(result.target.host, `${sectionLabel(sectionKey)} report`);
  return pdf.blob();
}

export function generateCompletePdf(result: AnalysisResult): Blob {
  const pdf = new Pdf();
  renderCover(pdf, result, 'Complete analysis');
  pdf.page();
  renderExecutiveSummary(pdf, result);
  pdf.page();
  renderHowToRead(pdf);
  pdf.page();
  renderRunContext(pdf, result);

  for (const sectionKey of SECTION_KEYS) {
    pdf.page();
    renderSection(pdf, result, sectionKey);
  }

  pdf.page();
  renderClosing(pdf, result);
  pdf.finish(result.target.host, 'Complete analysis');
  return pdf.blob();
}

/* ------------------------------------------------------------------------------------ */
/* Cover                                                                                */
/* ------------------------------------------------------------------------------------ */

function renderCover(pdf: Pdf, result: AnalysisResult, kind: string): void {
  const { doc } = pdf;
  const overview = buildOverview(result);

  // Full-bleed masthead.
  pdf.fill(COLOR.ink, 0, 0, PAGE.width, 62);
  pdf.fill(COLOR.primary, 0, 60, PAGE.width, 2);

  const markSize = 15;
  const hasMark = pdf.drawBrandMark(PAGE.margin, 15, markSize);
  const textX = hasMark ? PAGE.margin + markSize + 6 : PAGE.margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(...COLOR.white);
  doc.text('ReverseX', textX, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(170, 180, 190);
  doc.text('Website reverse-engineering intelligence', textX, 33);

  doc.setFontSize(8);
  doc.setTextColor(...COLOR.white);
  doc.text(kind.toUpperCase(), PAGE.width - PAGE.margin, 26, { align: 'right' });
  doc.setTextColor(170, 180, 190);
  doc.text(
    formatTimestamp(result.scan.finished_at ?? result.scan.created_at),
    PAGE.width - PAGE.margin,
    34,
    { align: 'right' },
  );

  pdf.y = 82;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.muted);
  doc.text('ANALYSED TARGET', PAGE.margin, pdf.y);
  pdf.y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...COLOR.ink);
  doc.text(truncate(doc, result.target.host, CONTENT_W, 24), PAGE.margin, pdf.y);
  pdf.y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.primary);
  const url = result.target.final_url ?? result.target.normalized_url;
  for (const line of doc.splitTextToSize(url, CONTENT_W) as string[]) {
    doc.text(line, PAGE.margin, pdf.y);
    pdf.y += 4.4;
  }

  pdf.y += 8;
  pdf.metrics([
    {
      label: 'Evidence quality',
      value: result.quality ? `${result.quality.overall_score}` : '—',
      hint: result.quality ? result.quality.overall.toUpperCase() : 'not assessed',
      tone: COLOR.primary,
    },
    {
      label: 'Security posture',
      value: overview.security.percentage === null ? '—' : `${overview.security.percentage}%`,
      hint: overview.security.bandPhrase ?? 'no score produced',
      tone: COLOR.verified,
    },
    {
      label: 'Findings',
      value: String(countFindings(result)),
      hint: `${overview.evidence.verified} verified`,
      tone: COLOR.strong,
    },
    {
      label: 'Analyzers',
      value: `${overview.evidence.analyzersCompleted}/${overview.evidence.analyzersTotal}`,
      hint: 'completed',
      tone: COLOR.inferred,
    },
  ]);

  pdf.y += 2;
  pdf.h2('At a glance');
  for (const line of glanceLines(result, overview)) pdf.bullet(line);

  pdf.y = PAGE.height - 58;
  pdf.note(STANDING_DISCLAIMER, COLOR.attention);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.muted);
  doc.text(
    `Scan ${result.scan.scan_id} · engine ${result.scan.engine_version} · schema ${result.schema_version}`,
    PAGE.margin,
    PAGE.height - 14,
  );
}

function glanceLines(result: AnalysisResult, overview: ReturnType<typeof buildOverview>): string[] {
  const lines: string[] = [];

  lines.push(
    overview.technology.items.length > 0
      ? `Technology: ${overview.technology.items.map((item) => item.name).join(', ')}.${
          overview.technology.rendering
            ? ` Rendering appears to be ${overview.technology.rendering.value}.`
            : ''
        }`
      : 'Technology: no product was positively identified from observable signals. Nothing was guessed in its place.',
  );

  lines.push(
    overview.security.percentage === null
      ? 'Security: no observable posture score was produced for this scan.'
      : `Security: ${overview.security.percentage}% observable posture — ${overview.security.bandPhrase ?? 'band unavailable'}. This measures visible configuration only, and is not proof the site is secure.`,
  );

  const design = buildDesignPresentation(result);
  if (design.typography.loadedFonts.length > 0 || design.colors.available) {
    lines.push(
      `Design: ${[
        design.typography.loadedFonts.length > 0
          ? `${design.typography.loadedFonts.slice(0, 3).join(', ')} typography`
          : null,
        design.colors.backgrounds.length > 0
          ? `${design.colors.backgrounds.length} background colours observed`
          : null,
        design.layout.hasResponsive ? `${design.layout.breakpoints.length} breakpoints` : null,
      ]
        .filter(Boolean)
        .join(', ')}.`,
    );
  }

  lines.push(
    overview.traffic.estimates.length > 0
      ? `Traffic: ${overview.traffic.estimates.map((e) => `${e.name} ${e.value}`).join(', ')}.`
      : `Traffic: ${overview.traffic.unavailableReason ?? 'no public estimate was available'}.`,
  );

  lines.push(
    `Evidence mix: ${overview.evidence.verified} verified, ${overview.evidence.stronglyInferred} strongly supported, ${overview.evidence.inferred} likely, ${overview.evidence.aiInferred} AI hypotheses, ${overview.evidence.unknown} absent or not determinable.`,
  );

  if (result.errors.length > 0) {
    lines.push(
      `${result.errors.length} error${result.errors.length === 1 ? '' : 's'} occurred during collection. Affected chapters state what could not be produced.`,
    );
  }

  return lines;
}

/* ------------------------------------------------------------------------------------ */
/* Front matter                                                                         */
/* ------------------------------------------------------------------------------------ */

function renderExecutiveSummary(pdf: Pdf, result: AnalysisResult): void {
  pdf.chapterBanner('Summary', 'Executive summary', 'What this analysis established, by chapter');

  pdf.para(
    `This document reports what a passive analysis of ${result.target.host} could observe. It is organised as four independent reports — Design, Tech Stack, Security and Traffic — each built only from evidence collected during a single visit to one public URL.`,
    { lead: true },
  );

  if (result.quality) {
    pdf.h2('Evidence completeness');
    pdf.para(
      `Overall evidence quality for this scan was ${result.quality.overall.toUpperCase()} (${result.quality.overall_score}/100). ${evidenceQualityMeaning(result.quality.overall)}`,
    );
    for (const key of SECTION_KEYS) {
      const sq = result.quality.sections[key];
      if (!sq) continue;
      pdf.meter(
        sectionLabel(key),
        sq.score,
        `${sq.quality.toUpperCase()} · ${sq.analyzers_completed}/${sq.analyzers_total} analyzers · ${sq.findings_verified} verified, ${sq.findings_inferred} inferred`,
        qualityTone(sq.quality),
      );
    }
    if (result.quality.ai_fallback_available && result.quality.ai_fallback_sections.length > 0) {
      pdf.note(
        `AI Intelligence was recommended for: ${result.quality.ai_fallback_sections
          .map((key) => sectionLabel(key as SectionKey))
          .join(', ')}. Any AI-derived conclusion in this document is labelled "AI inferred" and reported separately from deterministic findings.`,
        COLOR.ai,
      );
    }
  }

  pdf.h2('Chapter outline');
  pdf.grid(
    ['Chapter', 'Covers', 'Status', 'Findings'],
    SECTION_KEYS.map((key) => [
      sectionLabel(key),
      SECTION_DOCS[key].tagline,
      result.sections[key].meta.status.replace(/_/g, ' '),
      result.sections[key].findings.length,
    ]),
    { 0: { cellWidth: 26, fontStyle: 'bold' }, 2: { cellWidth: 26 }, 3: { cellWidth: 18 } },
  );

  if (result.limitations.length > 0) {
    pdf.h2('Scope of this scan');
    for (const limitation of result.limitations) pdf.bullet(limitation, { muted: true });
  }
}

function renderHowToRead(pdf: Pdf): void {
  pdf.chapterBanner('Reference', 'How to read this report', 'The verdict vocabulary, in full');
  pdf.para(HOW_TO_READ_INTRO, { lead: true });

  pdf.h2('Verdicts');
  for (const entry of VERDICT_GLOSSARY) {
    pdf.findingHeading(entry.label, entry.label, statusColor(entry.status));
    pdf.para(entry.meaning, { muted: true });
  }

  pdf.h2('Two distinctions that matter');
  pdf.bullet(
    '"Not detected" is not "not used". Server-rendered, self-hosted, proxied and bundled technologies frequently leave no signature a public visitor can see. The finding describes the evidence, not the site.',
  );
  pdf.bullet(
    '"Not publicly determinable" is a refusal, not a gap. It marks properties — databases and internal services being the common case — that cannot honestly be established from outside, so no guess is offered.',
  );

  pdf.h2('Scores');
  pdf.para(
    'Security is the only report with a score, because presence and quality of observable defensive configuration is a genuinely measurable thing. Design, Tech Stack and Traffic are deliberately unscored: any number attached to them would be an invented weighting presented as a measurement.',
  );
}

function renderRunContext(pdf: Pdf, result: AnalysisResult): void {
  pdf.chapterBanner('Method', 'Collection conditions', 'The exact conditions every measurement was taken under');
  pdf.para(
    'Measurements are only meaningful alongside the conditions that produced them. A different viewport, network or wait strategy would produce a different result, so the run is recorded here in full.',
    { lead: true },
  );

  const context = result.scan.run_context;
  pdf.h2('Scan');
  pdf.fields([
    ['Requested URL', result.target.requested_url],
    ['Normalized URL', result.target.normalized_url],
    ['Final URL', result.target.final_url],
    ['HTTP status', result.target.http_status],
    ['Scan id', result.scan.scan_id],
    ['Scan status', result.scan.status.replace(/_/g, ' ')],
    ['Started', formatTimestamp(result.scan.started_at)],
    ['Finished', formatTimestamp(result.scan.finished_at)],
    ['Duration', formatDuration(result.scan.duration_ms)],
    ['Engine version', result.scan.engine_version],
    ['Schema version', result.schema_version],
  ]);

  pdf.h2('Environment');
  if (!context) {
    pdf.para(
      'Run context was not recorded for this scan, so the measurements below cannot be reproduced exactly.',
      { muted: true },
    );
  } else {
    pdf.fields([
      ['Collection mode', context.collection_mode],
      [
        'Browser',
        context.browser_name
          ? `${context.browser_name} ${context.browser_version ?? ''}`.trim()
          : 'not used',
      ],
      [
        'Viewport',
        `${context.viewport.width}×${context.viewport.height} @ ${context.device_scale_factor}x`,
      ],
      ['Wait strategy', context.wait_strategy],
      ['Settle reached', context.settle_reached ?? 'not applicable'],
      ['Network throttling', context.network_throttling],
      ['CPU throttling', context.cpu_throttling],
      ['Locale / timezone', `${context.locale} / ${context.timezone}`],
      ['User agent', context.user_agent],
    ]);
  }

  if (result.errors.length > 0) {
    pdf.h2('Collection errors');
    pdf.grid(
      ['Subject', 'Scope', 'Code', 'Message'],
      result.errors.map((error) => [error.subject, error.scope, error.code, error.message]),
      { 2: { cellWidth: 30 } },
    );
  }
}

/* ------------------------------------------------------------------------------------ */
/* Section chapters                                                                     */
/* ------------------------------------------------------------------------------------ */

function renderSection(pdf: Pdf, result: AnalysisResult, key: SectionKey): void {
  const section = result.sections[key];
  const docs = SECTION_DOCS[key];

  pdf.chapterBanner(CHAPTER_INDEX[key], sectionLabel(key), docs.tagline);

  // Chapter framing, which is what the old export was missing entirely.
  pdf.h2('What this report covers');
  pdf.para(docs.covers, { lead: true });

  pdf.h2('How to read it');
  pdf.para(docs.howToRead);

  pdf.h2('What it cannot establish');
  pdf.note(docs.cannot, COLOR.attention);

  renderSectionStatus(pdf, result, key);

  if (!isRenderable(section)) {
    pdf.h2('No findings available');
    pdf.para(
      section.meta.status === 'not_implemented'
        ? 'No analyzer for this report ships in this build of ReverseX. Nothing about the target was inferred in its place.'
        : (section.meta.unavailable_reason ?? 'This report could not be produced for this scan.'),
    );
    renderAnalyzers(pdf, section);
    return;
  }

  switch (key) {
    case 'design':
      renderDesignBody(pdf, result);
      break;
    case 'technology':
      renderTechnologyBody(pdf, result);
      break;
    case 'security':
      renderSecurityBody(pdf, result);
      break;
    case 'traffic':
      renderTrafficBody(pdf, result);
      break;
  }

  renderAllFindings(pdf, section);
  renderAiFindings(pdf, section);
  renderInterpretations(pdf, section);
  renderAnalyzers(pdf, section);
  renderLimitations(pdf, section);
}

function renderSectionStatus(pdf: Pdf, result: AnalysisResult, key: SectionKey): void {
  const section = result.sections[key];
  const sq = result.quality?.sections[key];

  pdf.h2('Evidence for this report');
  pdf.metrics([
    { label: 'Status', value: section.meta.status.replace(/_/g, ' '), tone: COLOR.strong },
    { label: 'Findings', value: String(section.findings.length), tone: COLOR.primary },
    {
      label: 'Analyzers',
      value: `${section.meta.analyzers.filter((a) => a.status === 'completed').length}/${section.meta.analyzers.length}`,
      tone: COLOR.inferred,
    },
    {
      label: 'Quality',
      value: sq ? `${sq.score}` : '—',
      hint: sq ? sq.quality.toUpperCase() : 'not assessed',
      tone: sq ? qualityTone(sq.quality) : COLOR.neutral,
    },
  ]);

  if (sq) {
    pdf.para(evidenceQualityMeaning(sq.quality), { muted: true });
    if (sq.ai_fallback_recommended && sq.reason) pdf.para(sq.reason, { muted: true });
  }
  if (section.meta.unavailable_reason) {
    pdf.para(`Reason: ${section.meta.unavailable_reason}`, { muted: true });
  }
}

function renderDesignBody(pdf: Pdf, result: AnalysisResult): void {
  const design = buildDesignPresentation(result);
  const findings = result.sections.design.findings;

  pdf.h2('Summary');
  pdf.para(design.summary);

  pdf.h2('Page structure');
  renderFindingGroup(
    pdf,
    findings.filter((f) => ['document', 'structure'].includes(f.category)),
  );

  pdf.h2('Layout system and spacing');
  pdf.para(
    'Layout methods are the CSS display modes actually computed on rendered elements. Gap, radius and shadow values are the distinct values observed, which makes them a usable starting palette for reimplementation.',
    { muted: true },
  );
  pdf.fields([
    ['Layout methods', design.layout.displayTypes.join(', ')],
    ['Gap values', design.layout.gaps.join(', ')],
    ['Border radii', design.layout.borderRadii.join(', ')],
    ['Shadows', design.layout.shadows.join(', ')],
  ]);
  if (!design.layout.available) pdf.para('No layout values were collected.', { muted: true });

  pdf.h2('Responsive behaviour');
  pdf.fields([
    ['Breakpoints', design.layout.breakpoints.join(', ')],
    ['Horizontal overflow', design.layout.hasOverflow ? 'observed' : 'none observed'],
    ['Overflow widths', design.layout.overflowWidths.join(', ')],
  ]);
  if (design.layout.breakpoints.length === 0) {
    pdf.para(
      'No media-query breakpoints were observed. The page may still be fluid, or its breakpoints may live in stylesheets that were not parsed.',
      { muted: true },
    );
  }

  pdf.h2('Typography');
  pdf.fields([
    ['Loaded fonts', design.typography.loadedFonts.join(', ')],
    ['Font families', design.typography.fontFamilies.join(', ')],
    ['Weights', design.typography.weights.join(', ')],
    ['Type scale', design.typography.sizes.join(', ')],
    ['Line heights', design.typography.lineHeights.join(', ')],
  ]);

  pdf.h2('Colour system');
  renderSwatches(pdf, 'Background colours', design.colors.backgrounds);
  renderSwatches(pdf, 'Text colours', design.colors.texts);
  if (!design.colors.available) pdf.para('No colour values were collected.', { muted: true });

  pdf.h2('Components and patterns');
  renderFindingGroup(
    pdf,
    findings.filter(
      (f) =>
        f.category === 'forms' ||
        f.id === 'design.layout:border-radius' ||
        f.id === 'design.layout:box-shadows',
    ),
  );

  pdf.h2('Media');
  pdf.fields([
    ['Images', design.media.imageCount],
    ['Lazy-loaded images', design.media.lazyLoaded],
    ['SVG elements', design.media.svgCount],
    ['Videos', design.media.videoCount],
    ['Picture elements', design.media.pictureCount],
    ['Formats', design.media.formats.join(', ')],
  ]);

  pdf.h2('Motion');
  pdf.fields([
    ['Transitions', design.motion.transitions.join(', ')],
    ['Animations', design.motion.animations.join(', ')],
    ['Keyframe definitions', design.motion.keyframeCount],
  ]);
  if (!design.motion.available) {
    pdf.para('No CSS transitions or animations were observed.', { muted: true });
  }
}

/** Colour rows drawn as actual swatches, because a hex string is not a colour. */
function renderSwatches(
  pdf: Pdf,
  label: string,
  colors: { value: string; hex: string | null }[],
): void {
  if (colors.length === 0) return;
  pdf.h3(label);

  const size = 9;
  const gap = 2.4;
  const perRow = Math.floor((CONTENT_W + gap) / (size + gap));

  colors.forEach((color, index) => {
    const column = index % perRow;
    if (column === 0) pdf.need(size + 9);
    const x = PAGE.margin + column * (size + gap);
    const rgb = hexToRgb(color.hex ?? color.value);

    pdf.doc.setFillColor(...(rgb ?? COLOR.surface));
    pdf.doc.setDrawColor(...COLOR.hairline);
    pdf.doc.setLineWidth(0.2);
    pdf.doc.roundedRect(x, pdf.y, size, size, 1, 1, 'FD');

    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(5.2);
    pdf.doc.setTextColor(...COLOR.muted);
    pdf.doc.text(truncate(pdf.doc, (color.hex ?? color.value).replace('#', ''), size, 5.2), x, pdf.y + size + 3);

    if (column === perRow - 1 || index === colors.length - 1) pdf.y += size + 8;
  });
  pdf.y += 1;
}

function renderTechnologyBody(pdf: Pdf, result: AnalysisResult): void {
  const presentation = buildTechPresentation(result);

  if (presentation.categories.length === 0) {
    pdf.h2('Identified technologies');
    pdf.para(
      'No technology was positively identified from observable signals. Invisible backend or bundled technology was not guessed in its place.',
      { muted: true },
    );
  }

  for (const category of presentation.categories) {
    pdf.h2(category.title);
    for (const item of category.items) {
      pdf.findingHeading(item.name, findingStatusLabel(item.status), statusColor(item.status));
      if (item.description) pdf.para(item.description);
      if (item.signals.length > 0) pdf.para(`Evidence: ${item.signals.join(' ')}`, { muted: true });
      if (item.limitations.length > 0) {
        pdf.para(`Limitations: ${item.limitations.join(' ')}`, { muted: true });
      }
      pdf.space(1);
    }
  }

  pdf.h2('Architecture hypotheses');
  if (presentation.hypotheses.length === 0) {
    pdf.para(
      'No AI architecture hypothesis was produced for this scan. Deterministic findings above stand on their own.',
      { muted: true },
    );
  } else {
    pdf.para(
      'The statements below are hypotheses from the optional AI layer, not detections. Each cites the evidence it was built from.',
      { muted: true },
    );
    for (const hypothesis of presentation.hypotheses) {
      pdf.findingHeading(hypothesis.hypothesis, 'AI inferred', COLOR.ai);
      if (hypothesis.reasoning) pdf.para(hypothesis.reasoning);
      for (const basis of hypothesis.basis) {
        pdf.bullet(basis.url ? `${basis.label} — ${basis.url}` : basis.label, { muted: true });
      }
      for (const limitation of hypothesis.limitations) {
        pdf.bullet(`Limitation: ${limitation}`, { muted: true });
      }
      pdf.space(1);
    }
  }

  pdf.h2('Verdict distribution');
  const findings = result.sections.technology.findings;
  pdf.grid(
    ['Verdict', 'Count', 'What it means here'],
    VERDICT_GLOSSARY.map((entry) => [
      entry.label,
      findings.filter((f) => f.status === entry.status).length,
      entry.meaning,
    ]),
    { 0: { cellWidth: 36, fontStyle: 'bold' }, 1: { cellWidth: 16, halign: 'center' } },
  );

  pdf.h2('Not publicly determinable');
  if (presentation.unknowns.length === 0) {
    pdf.para('No explicit unknowns were reported for this section.', { muted: true });
  } else {
    pdf.para(
      'These properties cannot reasonably be established from outside the site, so no value is offered.',
      { muted: true },
    );
    pdf.grid(
      ['Property', 'Verdict', 'Reason'],
      presentation.unknowns.map((unknown) => [
        unknown.name,
        findingStatusLabel(unknown.status),
        [unknown.reason, ...unknown.limitations].filter(Boolean).join(' '),
      ]),
      { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 32 } },
    );
  }

  const sources = [
    ...new Set(
      findings
        .flatMap((f) => f.evidence)
        .filter((e) => e.kind === 'research_source')
        .map((e) => e.excerpt ?? e.source)
        .filter(Boolean),
    ),
  ];
  pdf.h2('Research sources');
  if (sources.length === 0) {
    pdf.para('No external research sources were consulted for this scan.', { muted: true });
  } else {
    for (const source of sources.slice(0, 20)) pdf.bullet(String(source), { muted: true });
  }
}

function renderSecurityBody(pdf: Pdf, result: AnalysisResult): void {
  const section = result.sections.security;
  const parsed = securityPayloadSchema.safeParse(section.data);
  const score = parsed.success ? parsed.data.score : null;

  pdf.h2('Observable posture');
  if (!score) {
    pdf.para(
      'No posture score was produced for this scan. Individual observations remain available below.',
      { muted: true },
    );
  } else {
    pdf.meter(
      'Observable security posture',
      score.percentage,
      `${score.points_awarded} of ${score.points_applicable} applicable points · ${score.band_phrase} · methodology ${score.methodology_version}`,
      COLOR.verified,
    );
    pdf.note(score.disclaimer, COLOR.attention);

    pdf.h2('Rule-by-rule results');
    pdf.para(
      'Every rule that contributed to the score is listed with its outcome and weight. Rules that could not be evaluated are excluded from both the awarded and the applicable totals rather than counted as failures.',
      { muted: true },
    );
    pdf.grid(
      ['Rule', 'Category', 'Outcome', 'Points', 'Rationale'],
      [...score.rules]
        .sort((a, b) => b.weight - a.weight)
        .map((rule) => [
          rule.title,
          rule.category,
          rule.outcome,
          `${rule.awarded}/${rule.weight}`,
          [rule.rationale, rule.recommendation ? `Recommendation: ${rule.recommendation}` : '']
            .filter(Boolean)
            .join(' '),
        ]),
      {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 18 },
        3: { cellWidth: 14, halign: 'center' },
      },
    );
  }

  const groups: [string, string][] = [
    ['security.tls', 'Transport security'],
    ['security.headers', 'Response headers'],
    ['security.cookies', 'Cookies'],
    ['security.mixed_content', 'Mixed content'],
    ['security.exposure', 'Technology disclosure'],
    ['security.third_party', 'Third-party origins'],
  ];

  for (const [source, title] of groups) {
    const findings = section.findings.filter(
      (f) => f.source === source && f.status !== 'ai_inferred',
    );
    if (findings.length === 0) continue;
    pdf.h2(title);
    renderFindingGroup(pdf, findings);
  }
}

function renderTrafficBody(pdf: Pdf, result: AnalysisResult): void {
  const section = result.sections.traffic;
  const parsed = trafficPayloadSchema.safeParse(section.data);
  const payload = parsed.success ? parsed.data : null;
  const popularity = section.findings.filter((f) => f.category === 'popularity');
  const analytics = section.findings.filter((f) => f.category === 'analytics');
  const hasEstimate = popularity.some(
    (f) =>
      ['verified', 'strongly_inferred', 'inferred'].includes(f.status) &&
      (f.value !== null || f.values.length > 0),
  );

  pdf.h2('Popularity verdict');
  pdf.fields([
    ['Data provider', payload?.provider_name ?? 'none configured'],
    ['Provider available', payload?.provider_available ? 'yes' : 'no'],
  ]);

  if (!hasEstimate) {
    pdf.note(
      'No traffic estimate was produced. ReverseX does not fabricate visit counts, ranks, or popularity bands from passive page observation — that requires a credible external dataset, and none was configured for this scan.',
      COLOR.attention,
    );
  }
  renderFindingGroup(pdf, popularity);

  pdf.h2('Measurement tooling observed');
  pdf.para(
    'Analytics tags observed loading during this visit indicate which measurement tools are installed. They do not report or estimate traffic volume.',
    { muted: true },
  );
  renderFindingGroup(pdf, analytics);

  pdf.h2('Confidence');
  pdf.para(
    hasEstimate
      ? 'Estimates above come from the configured data provider. Ranking datasets measure different things on different schedules, so treat any figure as an order of magnitude rather than a measurement.'
      : 'No estimate exists to attach confidence to. This is a limitation of passive observation without a data provider, not a statement that the site has no traffic.',
  );
}

/* ------------------------------------------------------------------------------------ */
/* Shared blocks                                                                        */
/* ------------------------------------------------------------------------------------ */

/** The complete finding set as a grid, so nothing in the app is missing from the export. */
function renderAllFindings(pdf: Pdf, section: Section): void {
  const deterministic = section.findings.filter((f) => f.status !== 'ai_inferred');
  if (deterministic.length === 0) return;

  pdf.h2(`All findings (${deterministic.length})`);
  pdf.para(
    'The complete deterministic finding set for this report, including negative and indeterminate results. Nothing is omitted for brevity.',
    { muted: true },
  );

  pdf.grid(
    ['Finding', 'Verdict', 'Value', 'Notes and limitations'],
    [...deterministic]
      .sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id))
      .map((finding) => [
        finding.name,
        findingStatusLabel(finding.status),
        findingValue(finding),
        [finding.reason, ...finding.limitations].filter(Boolean).join(' '),
      ]),
    { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 24 }, 2: { cellWidth: 36 } },
  );

  renderEvidence(pdf, deterministic);
}

function renderEvidence(pdf: Pdf, findings: Finding[]): void {
  const withEvidence = findings.filter((f) => f.evidence.length > 0);
  if (withEvidence.length === 0) return;

  pdf.h2('Supporting evidence');
  pdf.para(
    'Each asserted finding is traced back to the response, document, or browser observation it came from.',
    { muted: true },
  );

  pdf.grid(
    ['Finding', 'Source', 'Kind', 'Location / excerpt'],
    withEvidence.flatMap((finding) =>
      finding.evidence.slice(0, 4).map((ref, index) => [
        index === 0 ? finding.name : '',
        ref.source,
        ref.kind,
        [ref.location, ref.excerpt].filter(Boolean).join(' — ').slice(0, 220),
      ]),
    ),
    { 0: { cellWidth: 36, fontStyle: 'bold' }, 1: { cellWidth: 34 }, 2: { cellWidth: 22 } },
  );
}

function renderAiFindings(pdf: Pdf, section: Section): void {
  const ai = section.findings.filter((f) => f.status === 'ai_inferred');
  if (ai.length === 0) return;

  pdf.h2(`AI hypotheses (${ai.length})`);
  pdf.note(
    'The findings below were produced by the optional AI intelligence layer from observed evidence and public research. They are hypotheses, never verified facts, and they do not modify any deterministic finding.',
    COLOR.ai,
  );

  for (const finding of ai) {
    pdf.findingHeading(finding.name, 'AI inferred', COLOR.ai);
    const value = findingValue(finding);
    if (value !== '—') pdf.para(`Claim: ${value}`);
    const reasoning = finding.evidence.find((e) => e.kind === 'ai_reasoning')?.excerpt;
    if (reasoning) pdf.para(reasoning);
    const sources = finding.evidence
      .filter((e) => e.kind === 'research_source')
      .map((e) => e.excerpt ?? e.source);
    for (const source of sources.slice(0, 5)) pdf.bullet(String(source), { muted: true });
    for (const limitation of finding.limitations) {
      pdf.bullet(`Limitation: ${limitation}`, { muted: true });
    }
    pdf.space(1);
  }
}

function renderInterpretations(pdf: Pdf, section: Section): void {
  if (section.interpretations.length === 0) return;
  pdf.h2('Interpretation');
  pdf.para(
    'The statements below are readings of the measured values above, not observations. Each cites the findings it derives from.',
    { muted: true },
  );
  for (const item of section.interpretations) {
    pdf.findingHeading(item.statement, 'Interpretation', COLOR.strong);
    pdf.para(`Derived from: ${item.basis.join(', ')}`, { muted: true });
    if (item.caveat) pdf.para(`Caveat: ${item.caveat}`, { muted: true });
  }
}

function renderAnalyzers(pdf: Pdf, section: Section): void {
  if (section.meta.analyzers.length === 0) return;
  const completed = section.meta.analyzers.filter((a) => a.status === 'completed').length;

  pdf.h2(`Analyzers (${completed}/${section.meta.analyzers.length} completed)`);
  pdf.para(
    'Which checks ran, and which did not. This is the difference between "no signal was found" and "the check never executed".',
    { muted: true },
  );
  pdf.grid(
    ['Analyzer', 'Version', 'Outcome', 'Duration', 'Detail'],
    section.meta.analyzers.map((run) => [
      run.id,
      run.version,
      run.status.replace(/_/g, ' '),
      formatDuration(run.duration_ms),
      run.error_detail ?? run.missing_evidence.join(', '),
    ]),
    {
      0: { cellWidth: 44 },
      1: { cellWidth: 16 },
      2: { cellWidth: 24 },
      3: { cellWidth: 20 },
    },
  );
}

function renderLimitations(pdf: Pdf, section: Section): void {
  const sectionLimits = section.meta.limitations;
  const findingLimits = [
    ...new Set(section.findings.flatMap((f) => f.limitations)),
  ].filter((limit) => !sectionLimits.includes(limit));

  if (sectionLimits.length + findingLimits.length === 0) return;

  pdf.h2('Limitations');
  for (const limitation of sectionLimits) pdf.bullet(limitation, { muted: true });
  if (findingLimits.length > 0) {
    pdf.h3('From specific findings');
    for (const limitation of findingLimits) pdf.bullet(limitation, { muted: true });
  }
}

function renderFindingGroup(pdf: Pdf, findings: Finding[]): void {
  if (findings.length === 0) {
    pdf.para('No observation was available for this group.', { muted: true });
    return;
  }
  pdf.grid(
    ['Observation', 'Verdict', 'Value', 'Notes'],
    findings.map((finding) => [
      finding.name,
      findingStatusLabel(finding.status),
      findingValue(finding),
      [finding.reason, ...finding.limitations].filter(Boolean).join(' '),
    ]),
    { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 24 }, 2: { cellWidth: 34 } },
  );
}

function renderClosing(pdf: Pdf, result: AnalysisResult): void {
  pdf.chapterBanner('End', 'Scope and provenance', 'What this document is, and what it is not');

  pdf.h2('Method');
  pdf.para(STANDING_DISCLAIMER, { lead: true });

  if (result.limitations.length > 0) {
    pdf.h2('Stated limitations for this scan');
    for (const limitation of result.limitations) pdf.bullet(limitation, { muted: true });
  }

  pdf.h2('Provenance');
  pdf.fields([
    ['Target', result.target.final_url ?? result.target.normalized_url],
    ['Scan id', result.scan.scan_id],
    ['Scan status', result.scan.status.replace(/_/g, ' ')],
    ['Scanned at', formatTimestamp(result.scan.finished_at ?? result.scan.created_at)],
    ['Engine version', result.scan.engine_version],
    ['Schema version', result.schema_version],
    ['Document generated', formatTimestamp(new Date().toISOString())],
  ]);

  pdf.note(
    'This report was generated in the browser from the stored analysis result. Regenerating it from the same result produces the same document; it does not re-scan the target.',
  );
}

/* ------------------------------------------------------------------------------------ */
/* Helpers                                                                              */
/* ------------------------------------------------------------------------------------ */

function isRenderable(section: Section): boolean {
  return (
    section.meta.status === 'complete' ||
    section.meta.status === 'partial' ||
    section.meta.status === 'insufficient_evidence'
  );
}

function countFindings(result: AnalysisResult): number {
  return Object.values(result.sections).reduce(
    (total, section) => total + section.findings.length,
    0,
  );
}

function findingValue(finding: Finding): string {
  if (finding.value !== null && finding.value !== undefined) {
    const base =
      typeof finding.value === 'boolean' ? (finding.value ? 'yes' : 'no') : String(finding.value);
    return finding.unit && finding.unit !== 'count' ? `${base} ${finding.unit}` : base;
  }
  return finding.values.length > 0 ? finding.values.join(', ') : '—';
}

function statusColor(status: FindingStatus): Rgb {
  switch (status) {
    case 'verified':
      return COLOR.verified;
    case 'strongly_inferred':
      return COLOR.strong;
    case 'inferred':
      return COLOR.inferred;
    case 'ai_inferred':
      return COLOR.ai;
    case 'unable_to_verify':
      return COLOR.attention;
    default:
      return COLOR.neutral;
  }
}

function qualityTone(band: string): Rgb {
  switch (band) {
    case 'high':
      return COLOR.verified;
    case 'medium':
      return COLOR.inferred;
    case 'low':
      return COLOR.attention;
    default:
      return COLOR.neutral;
  }
}

function hexToRgb(value: string): Rgb | null {
  const hex = value.trim().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const rgb = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}
