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
          { label: 'What ReverseX does', href: '/#product', detail: 'Public evidence to intelligence' },
          { label: 'Evidence and verdicts', href: '/#verdicts', detail: 'Confidence stays visible' },
          { label: 'AI Intelligence', href: '/#ai-intelligence', detail: 'Used only for gaps' },
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
          { label: 'Scan', href: '/#how-it-works', detail: 'Collect public evidence' },
          { label: 'Detect', href: '/#how-it-works', detail: 'Deterministic fingerprinting' },
          { label: 'Research', href: '/#how-it-works', detail: 'Public sources when needed' },
          { label: 'Reason', href: '/#how-it-works', detail: 'Correlate and weigh hypotheses' },
          { label: 'Verdict', href: '/#how-it-works', detail: 'Evidence, confidence, limits' },
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
    id: 'reports',
    label: 'Reports',
    href: '/#reports',
    columns: [
      {
        title: 'The four reports',
        links: [
          { label: 'Design', href: '/#reports', detail: 'Layout, type, color, motion' },
          { label: 'Tech Stack', href: '/#reports', detail: 'Frontend to infrastructure' },
          { label: 'Security', href: '/#reports', detail: 'Observable configuration' },
          { label: 'Traffic', href: '/#reports', detail: 'Public popularity signals' },
        ],
      },
      {
        title: 'Output',
        links: [
          { label: 'Report preview', href: '/#reports' },
          { label: 'Stored scans', href: '/history', detail: 'Saved in this browser' },
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
