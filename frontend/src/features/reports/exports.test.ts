import { describe, expect, it } from 'vitest';

import { makeResult } from '@/test/factories';
import { SECTION_KEYS } from '@/types/analysis';

import { buildReportBundle, renderSectionReport } from './generate';
import { generateCompletePdf, generateSectionPdf } from './pdf';
import { SECTION_DOCS, VERDICT_GLOSSARY } from './report-copy';

describe('Markdown exports', () => {
  it('explains what each report covers and cannot establish', () => {
    for (const key of SECTION_KEYS) {
      const markdown = renderSectionReport(makeResult(), key).contents;
      const docs = SECTION_DOCS[key];

      expect(markdown).toContain('## About this report');
      expect(markdown).toContain(docs.covers);
      expect(markdown).toContain(docs.cannot);
      expect(markdown).toContain('### How to read it');
    }
  });

  it('spells out every verdict so a file is readable on its own', () => {
    const markdown = renderSectionReport(makeResult(), 'technology').contents;

    expect(markdown).toContain('## Verdict vocabulary');
    for (const entry of VERDICT_GLOSSARY) {
      expect(markdown).toContain(entry.label);
    }
    // The distinction that is easiest to get wrong must be stated outright.
    expect(markdown).toContain('"Not detected" is not "not used"');
  });

  it('records provenance and points at the sibling reports', () => {
    const markdown = renderSectionReport(makeResult(), 'design').contents;

    expect(markdown).toContain('## Provenance');
    expect(markdown).toContain('## Other reports in this analysis');
    expect(markdown).toContain('Tech Stack');
    expect(markdown).toContain('Security');
    expect(markdown).toContain('Traffic');
  });

  it('produces substantial documents rather than stubs', () => {
    const bundle = buildReportBundle(makeResult());
    const markdownFiles = bundle.files.filter((file) => file.path.endsWith('.md'));

    expect(markdownFiles).toHaveLength(4);
    for (const file of markdownFiles) {
      expect(file.bytes).toBeGreaterThan(4000);
    }
  });

  it('still emits exactly the four reports plus the machine-readable source', () => {
    const paths = buildReportBundle(makeResult()).files.map((file) => file.path);

    expect(paths).toEqual([
      'design.md',
      'techstack.md',
      'security.md',
      'traffic.md',
      'analysis.json',
    ]);
  });
});

describe('PDF exports', () => {
  it('renders a multi-page document for a single report', async () => {
    const blob = generateSectionPdf(makeResult(), 'security');

    expect(blob.type).toBe('application/pdf');
    const text = await blob.text();
    expect(countPages(text)).toBeGreaterThanOrEqual(3);
  });

  it('renders a longer document for the complete analysis than for one report', async () => {
    const complete = generateCompletePdf(makeResult());
    const single = generateSectionPdf(makeResult(), 'traffic');

    expect(complete.size).toBeGreaterThan(single.size);
    expect(countPages(await complete.text())).toBeGreaterThanOrEqual(8);
  });
});

/** Counts page objects in the raw PDF stream; enough to prove the document has real extent. */
function countPages(raw: string): number {
  return (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}
