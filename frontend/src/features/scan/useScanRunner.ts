/**
 * Reconstruction lifecycle driver.
 *
 * Progress arrives via SSE from the backend, with polling as a fallback.
 * On completion the result is fetched, validated, and written to IndexedDB before navigation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import { describeError } from '@/lib/api/errors';
import { getRepository } from '@/lib/db/repository';
import { validateInput } from '@/lib/url-validation';
import {
  reconstructionJobStateSchema,
  type ReconstructionJobState,
} from '@/types/analysis';

import type { ScanPhase } from './types';

const POLL_INTERVAL_MS = 700;

export interface ScanRunner {
  phase: ScanPhase;
  start: (url: string) => Promise<void>;
  reset: () => void;
  elapsedMs: number;
}

export function useScanRunner(onReady?: (scanId: string) => void): ScanRunner {
  const [phase, setPhase] = useState<ScanPhase>({ kind: 'idle' });
  const [elapsedMs, setElapsedMs] = useState(0);

  const sourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const settledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardown(sourceRef, pollRef);
    };
  }, []);

  // Elapsed clock
  useEffect(() => {
    if (phase.kind !== 'running' && phase.kind !== 'submitting' && phase.kind !== 'persisting') {
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase.kind]);

  const finish = useCallback(
    async (scanId: string) => {
      if (settledRef.current) return;
      settledRef.current = true;
      teardown(sourceRef, pollRef);

      setPhase({ kind: 'persisting', scanId });
      try {
        const result = await api.result(scanId);
        await getRepository().persist(result);
        // Always release the server copy after persisting
        await api.deleteReconstruction(scanId);

        if (!mountedRef.current) return;
        setPhase({ kind: 'ready', scanId, hasErrors: false });
        onReady?.(scanId);
      } catch (error) {
        if (!mountedRef.current) return;
        const described = describeError(error);
        setPhase({
          kind: 'failed',
          problem: null,
          title: described.title,
          detail: `${described.detail} The analysis itself may have completed; it could not be stored locally.`,
        });
      }
    },
    [onReady],
  );

  const observe = useCallback(
    (scanId: string) => {
      const applyJob = (job: ReconstructionJobState) => {
        if (!mountedRef.current) return;
        if (job.status === 'failed' || job.status === 'cancelled') {
          settledRef.current = true;
          teardown(sourceRef, pollRef);
          setPhase({
            kind: 'failed',
            problem: null,
            title: 'The analysis did not complete',
            detail: job.error_message ?? 'The backend reported no further detail.',
          });
          return;
        }
        if (job.status === 'completed' || job.status === 'completed_with_errors') {
          void finish(scanId);
          return;
        }
        // Convert ReconstructionJobState to the ScanJobState shape ScanProgress expects
        setPhase({
          kind: 'running',
          scanId,
          job: toScanJobState(job),
        });
      };

      const refresh = async () => {
        try {
          applyJob(await api.jobState(scanId));
        } catch (error) {
          if (settledRef.current) return;
          const described = describeError(error);
          setPhase({
            kind: 'failed',
            problem: null,
            title: described.title,
            detail: described.detail,
          });
          teardown(sourceRef, pollRef);
        }
      };

      const startPolling = () => {
        if (pollRef.current !== null || settledRef.current) return;
        pollRef.current = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
      };

      if (typeof EventSource === 'undefined') {
        startPolling();
        void refresh();
        return;
      }

      const source = new EventSource(api.eventsUrl(scanId));
      sourceRef.current = source;

      source.addEventListener('snapshot', (event) => {
        const raw = safeJson((event as MessageEvent<string>).data);
        // SSE snapshot is in ScanJobState shape
        const parsed = reconstructionJobStateSchema.safeParse(raw);
        if (parsed.success) applyJob(parsed.data);
      });
      source.addEventListener('stage', () => void refresh());
      source.addEventListener('progress', () => void refresh());
      source.addEventListener('done', () => void finish(scanId));
      source.addEventListener('error', () => void refresh());
      source.onerror = () => {
        if (settledRef.current) return;
        source.close();
        sourceRef.current = null;
        startPolling();
      };
    },
    [finish],
  );

  const start = useCallback(
    async (url: string) => {
      const validation = validateInput(url);
      if (!validation.valid) {
        setPhase({ kind: 'invalid', message: validation.message ?? 'That input cannot be analyzed.' });
        return;
      }

      teardown(sourceRef, pollRef);
      settledRef.current = false;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setPhase({ kind: 'submitting', url: validation.normalized ?? url });

      try {
        const accepted = await api.createReconstruction(validation.normalized ?? url);
        if (!mountedRef.current) return;
        setPhase({ kind: 'running', scanId: accepted.scan_id, job: null });
        observe(accepted.scan_id);
      } catch (error) {
        if (!mountedRef.current) return;
        const described = describeError(error);
        setPhase({
          kind: 'failed',
          problem: null,
          title: described.title,
          detail: described.detail,
        });
      }
    },
    [observe],
  );

  const reset = useCallback(() => {
    teardown(sourceRef, pollRef);
    settledRef.current = false;
    setElapsedMs(0);
    setPhase({ kind: 'idle' });
  }, []);

  return { phase, start, reset, elapsedMs };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function teardown(
  sourceRef: React.RefObject<EventSource | null>,
  pollRef: React.RefObject<number | null>,
): void {
  sourceRef.current?.close();
  sourceRef.current = null;
  if (pollRef.current !== null) {
    window.clearInterval(pollRef.current);
    pollRef.current = null;
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Adapts a ReconstructionJobState to the shape ScanProgress expects. */
function toScanJobState(job: ReconstructionJobState): import('@/types/analysis').ScanJobState {
  return {
    scan_id: job.scan_id,
    status: job.status,
    requested_url: job.source_url,
    created_at: job.created_at,
    started_at: job.started_at ?? null,
    finished_at: job.finished_at ?? null,
    progress: {
      current_stage: null,
      current_stage_label: job.current_stage ?? null,
      completed_weight: job.progress_percent,
      total_weight: 100,
      stages_completed: 0,
      stages_total: 0,
    },
    stages: [],
    problem: null,
  };
}
