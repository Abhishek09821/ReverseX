import { findingStatusLabel } from '@/lib/format/status';
import { buildDesignPresentation } from '@/lib/presentation/design';
import type { AnalysisResult, Finding } from '@/types/analysis';
import { findingStatusToVerdict, verdictLabel } from '@/types/analysis';

import { bullets, heading, keyValueTable, section as join, table } from '../kit';
import { aiVerdictBlock, evidenceQualityBlock, runContextBlock, standardDocument, type RenderContext } from '../shared';

/** Design Reconstruction report matching the spec template. */
export function renderDesign(ctx: RenderContext): string {
  const findings = ctx.section.findings;
  const deterministic = findings.filter((f) => f.status !== 'ai_inferred');
  const aiFindings = findings.filter((f) => f.status === 'ai_inferred');
  const design = buildDesignPresentation(ctx.result);

  const structure = deterministic.filter((f) => ['document', 'structure'].includes(f.category));
  const navigation = structure.filter((f) =>
    `${f.name} ${f.values.join(' ')}`.match(/header|navigation|nav|banner/i),
  );
  const layout = deterministic.filter((f) => f.category === 'layout');
  const responsive = deterministic.filter((f) => f.category === 'responsive');
  const typography = deterministic.filter((f) => f.category === 'typography');
  const colors = deterministic.filter((f) => f.category === 'color');
  const spacing = deterministic.filter((f) => f.id === 'design.layout:gap-values');
  const components = deterministic.filter(
    (f) =>
      f.category === 'forms' ||
      f.id === 'design.layout:border-radius' ||
      f.id === 'design.layout:box-shadows',
  );
  const media = deterministic.filter((f) => ['media', 'images'].includes(f.category));
  const motion = deterministic.filter((f) => f.category === 'motion');

  // Build detailed typography section
  const typographyDetail = join(
    heading(2, 'Typography'),
    design.typography.loadedFonts.length > 0
      ? keyValueTable([
          ['Loaded fonts', design.typography.loadedFonts.join(', ')],
          ['Font families', design.typography.fontFamilies.join(', ')],
          ['Weights', design.typography.weights.join(', ')],
          ['Type scale', design.typography.sizes.join(', ')],
          ['Line heights', design.typography.lineHeights.join(', ')],
        ])
      : '_No typography data was collected._',
    typography.length > 0 ? group('Detailed observations', typography) : '',
  );

  // Build color section with hex values
  const colorDetail = join(
    heading(2, 'Colors'),
    design.colors.available
      ? keyValueTable([
          ['Background colors', design.colors.backgrounds.map((c) => c.hex ?? c.value).join(', ')],
          ['Text colors', design.colors.texts.map((c) => c.hex ?? c.value).join(', ')],
        ])
      : '_No color data was collected._',
    colors.length > 0 ? group('Detailed observations', colors) : '',
  );

  // Build layout section with key-value pairs
  const layoutDetail = join(
    heading(2, 'Layout System'),
    design.layout.available
      ? keyValueTable([
          ['Layout methods', design.layout.displayTypes.join(', ')],
          ['Gap values', design.layout.gaps.join(', ')],
          ['Border radii', design.layout.borderRadii.join(', ')],
          ['Shadows', design.layout.shadows.length > 0 ? design.layout.shadows.join(', ') : 'none observed'],
        ])
      : '_No layout values were collected._',
    layout.length > 0 ? group('Detailed observations', layout) : '',
  );

  // Responsive behavior
  const responsiveDetail = join(
    heading(2, 'Responsive Behavior'),
    design.layout.breakpoints.length > 0
      ? keyValueTable([
          ['Breakpoints', design.layout.breakpoints.join(', ')],
          ['Overflow detected', design.layout.hasOverflow ? 'yes' : 'no'],
        ])
      : '_No responsive breakpoints were observed._',
    responsive.length > 0 ? group('Detailed observations', responsive) : '',
  );

  // Media section
  const mediaDetail = join(
    heading(2, 'Media'),
    keyValueTable([
      ['Images', design.media.imageCount ?? 0],
      ['SVG elements', design.media.svgCount ?? 0],
      ['Videos', design.media.videoCount ?? 0],
      ['Formats', design.media.formats.join(', ') || 'none detected'],
    ]),
    media.length > 0 ? group('Detailed observations', media) : '',
  );

  // Motion section
  const motionDetail = join(
    heading(2, 'Motion'),
    keyValueTable([
      ['Transitions', design.motion.transitions.length > 0 ? design.motion.transitions.join(', ') : 'none observed'],
      ['Animations', design.motion.animations.length > 0 ? design.motion.animations.join(', ') : 'none observed'],
      ['Keyframe definitions', design.motion.keyframeCount ?? 0],
    ]),
    motion.length > 0 ? group('Detailed observations', motion) : '',
  );

  return standardDocument(
    ctx,
    'Design Reconstruction',
    evidenceQualityBlock(ctx.result, 'design'),
    join(heading(2, 'Summary'), design.summary),
    runContextBlock(ctx.result),
    group('Page Structure', structure),
    group('Navigation', navigation),
    layoutDetail,
    responsiveDetail,
    typographyDetail,
    colorDetail,
    group('Spacing', spacing),
    group('Components and Patterns', components),
    mediaDetail,
    motionDetail,
    aiVerdictBlock(aiFindings, 'AI / Research Verdicts'),
  );
}

function group(title: string, findings: Finding[]): string {
  return join(
    heading(2, title),
    findings.length === 0
      ? '_No observation was available for this category._'
      : table(
          ['Observation', 'Verdict', 'Value', 'Evidence / notes'],
          findings.map((f) => [
            f.name,
            verdictLabel(findingStatusToVerdict(f.status)),
            value(f),
            f.reason ?? f.limitations.join(' '),
          ]),
        ),
  );
}

function value(finding: Finding): string {
  if (finding.value !== null && finding.value !== undefined) {
    const rendered = typeof finding.value === 'boolean' ? (finding.value ? 'yes' : 'no') : String(finding.value);
    return finding.unit && finding.unit !== 'count' ? `${rendered} ${finding.unit}` : rendered;
  }
  return finding.values.length > 0 ? finding.values.join(', ') : '—';
}
