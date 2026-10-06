/**
 * Client-side input validation for website URLs and GitHub repository identifiers.
 *
 * This exists for immediate feedback in the input field, not for safety.
 * The backend re-validates authoritatively.
 */

export type InputType = 'website' | 'github_repo';

export interface InputValidationResult {
  valid: boolean;
  inputType?: InputType;
  normalized?: string;
  message?: string;
}

const OBVIOUSLY_LOCAL = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const PRIVATE_PATTERNS = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

// ── GitHub patterns ───────────────────────────────────────────────────────────

const GITHUB_URL_PATTERN = /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?(?:#.*|\.git)?$/;
const GITHUB_SHORT_PATTERN = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
const GITHUB_DOMAIN_PATTERN = /^github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;

function parseGitHubInput(trimmed: string): { owner: string; repo: string } | null {
  const urlMatch = GITHUB_URL_PATTERN.exec(trimmed);
  if (urlMatch) return { owner: urlMatch[1]!, repo: urlMatch[2]! };

  const domainMatch = GITHUB_DOMAIN_PATTERN.exec(trimmed);
  if (domainMatch) return { owner: domainMatch[1]!, repo: domainMatch[2]! };

  // owner/repo shorthand — but only if it doesn't look like a file path with a domain
  const shortMatch = GITHUB_SHORT_PATTERN.exec(trimmed);
  if (shortMatch) {
    // Exclude common false positives: http:, mailto:, etc.
    if (!trimmed.includes(':') && !trimmed.startsWith('.')) {
      return { owner: shortMatch[1]!, repo: shortMatch[2]! };
    }
  }
  return null;
}

// ── Main validator ────────────────────────────────────────────────────────────

export function validateInput(raw: string): InputValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: 'Enter a website URL or GitHub repository to analyze.' };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, message: 'The input cannot contain spaces.' };
  }

  // ── Try GitHub first ──────────────────────────────────────────────────────
  const gh = parseGitHubInput(trimmed);
  if (gh) {
    const { owner, repo } = gh;
    const repoClean = repo.replace(/\.git$/, '');
    const normalized = `https://github.com/${owner}/${repoClean}`;
    return { valid: true, inputType: 'github_repo', normalized };
  }

  // ── Non-http scheme check ─────────────────────────────────────────────────
  const schemeOnly = /^([a-z][a-z0-9+.-]*):(?!\/\/)(.*)$/i.exec(trimmed);
  if (schemeOnly && !/^\d/.test(schemeOnly[2] ?? '')) {
    const scheme = schemeOnly[1];
    return {
      valid: false,
      message: `ReverseX analyzes http/https websites and GitHub repositories. "${scheme}:" is not supported.`,
    };
  }

  // ── Website URL ───────────────────────────────────────────────────────────
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, message: 'That does not look like a valid URL or GitHub repository.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      message: `ReverseX analyzes http/https pages. "${parsed.protocol}" is not supported.`,
    };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, message: 'Remove credentials from the URL before analyzing.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) {
    return { valid: false, message: 'The URL is missing a host name.' };
  }
  if (OBVIOUSLY_LOCAL.has(host)) {
    return { valid: false, message: 'ReverseX analyzes publicly reachable sites, not local ones.' };
  }
  if (PRIVATE_PATTERNS.some((p) => p.test(host))) {
    return {
      valid: false,
      message: 'That address is on a private network. ReverseX only analyzes public sites.',
    };
  }
  if (!host.includes('.')) {
    return { valid: false, message: 'Use a full domain name, for example example.com.' };
  }

  return { valid: true, inputType: 'website', normalized: parsed.toString() };
}

/** Backwards-compat alias used by UrlForm (no-op wrapper). */
export function validateUrlInput(raw: string): InputValidationResult {
  return validateInput(raw);
}
