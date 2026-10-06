/**
 * Navigation model.
 *
 * Declared as data so the desktop mega-menu and the mobile drawer render the same
 * structure from one source instead of drifting apart.
 */

export interface NavLinkItem {
  label: string;
  href: string;
  detail?: string;
  external?: boolean;
}

export interface NavColumn {
  title: string;
  links: NavLinkItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  /** Landing anchor used when the group label itself is actionable. */
  href?: string;
  columns: NavColumn[];
}

export const BRAND_NAME = 'ReverseX';
export const BRAND_TAGLINE = 'Reverse engineer the web';

export const CREATOR_NAME = 'Abhishek Tiwari';
export const CREATOR_LINKEDIN_URL = 'https://www.linkedin.com/in/abhishek-tiwari-3a3594300/';

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'product',
    label: 'Product',
    href: '/#product',
    columns: [
      {
        title: 'Overview',
        links: [
          { label: 'What ReverseX does', href: '/#product', detail: 'Analysis to reconstruction prompt' },
          { label: 'Confidence system', href: '/#confidence', detail: 'Know how complete the output is' },
          { label: 'Prompt generation', href: '/#ai-intelligence', detail: 'One prompt, ready to use' },
        ],
      },
      {
        title: 'Audience',
        links: [
          { label: 'Use cases', href: '/#use-cases' },
          { label: 'For AI coding agents', href: '/#use-cases' },
        ],
      },
    ],
  },
  {
    id: 'how-it-works',
    label: 'How It Works',
    href: '/#how-it-works',
    columns: [
      {
        title: 'Pipeline',
        links: [
          { label: 'Analyze', href: '/#how-it-works', detail: 'Website URL or GitHub repo' },
          { label: 'Detect', href: '/#how-it-works', detail: 'Technologies & patterns' },
          { label: 'Understand', href: '/#how-it-works', detail: 'Map structure & architecture' },
          { label: 'Synthesize', href: '/#how-it-works', detail: 'Combine all evidence' },
          { label: 'Generate', href: '/#how-it-works', detail: 'One reconstruction prompt' },
        ],
      },
      {
        title: 'Reference',
        links: [
          { label: 'Methodology', href: '/methodology', detail: 'How conclusions are reached' },
          { label: 'Limitations', href: '/methodology#limitations', detail: 'What it cannot tell you' },
        ],
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    href: '/#reports',
    columns: [
      {
        title: 'What\'s analyzed',
        links: [
          { label: 'Website analysis', href: '/#reports', detail: 'DOM, CSS, JS, design system' },
          { label: 'GitHub repositories', href: '/#reports', detail: 'Structure, deps, patterns' },
          { label: 'Tech stack detection', href: '/#reports', detail: 'Frameworks & libraries' },
          { label: 'Reconstruction prompt', href: '/#reports', detail: 'Full output format' },
        ],
      },
      {
        title: 'Output',
        links: [
          { label: 'Prompt preview', href: '/#reports' },
          { label: 'Reconstruction history', href: '/history', detail: 'Saved in this browser' },
        ],
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    columns: [
      {
        title: 'Learn',
        links: [
          { label: 'Methodology', href: '/methodology' },
          { label: 'FAQ', href: '/#faq' },
          { label: 'Build capabilities', href: '/methodology#build' },
        ],
      },
      {
        title: 'Creator',
        links: [
          { label: CREATOR_NAME, href: '/#creator' },
          { label: 'LinkedIn', href: CREATOR_LINKEDIN_URL, external: true },
        ],
      },
    ],
  },
];
