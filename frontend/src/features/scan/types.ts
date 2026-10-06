import type { ProblemDetail, ScanJobState } from '@/types/analysis';

/**
 * Reconstruction lifecycle as a discriminated union.
 * A union rather than a set of booleans — "submitting and failed" is unrepresentable.
 */
export type ScanPhase =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'submitting'; url: string }
  | { kind: 'running'; scanId: string; job: ScanJobState | null }
  | { kind: 'persisting'; scanId: string }
  | { kind: 'ready'; scanId: string; hasErrors: boolean; warning?: string }
  | { kind: 'failed'; problem: ProblemDetail | null; title: string; detail: string };

export function isBusy(phase: ScanPhase): boolean {
  return phase.kind === 'submitting' || phase.kind === 'running' || phase.kind === 'persisting';
}
