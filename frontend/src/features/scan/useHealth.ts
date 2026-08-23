import { useQuery } from '@tanstack/react-query';

import { api, type Stats } from '@/lib/api/client';
import type { Capabilities, Health } from '@/types/analysis';

/** Backend liveness and browser readiness, used for pre-flight warnings. */
export function useHealth() {
  return useQuery<Health>({
    queryKey: ['health'],
    queryFn: ({ signal }) => api.health(signal),
    refetchInterval: 60_000,
    retry: false,
  });
}

/**
 * What this build can analyze.
 *
 * The dashboard renders section availability from this rather than assuming, so an analyzer that
 * has not shipped yet is shown as such instead of appearing to have found nothing.
 */
export function useCapabilities() {
  return useQuery<Capabilities>({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => api.capabilities(signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * Aggregate scans performed by this deployment.
 *
 * A real server-side total, so the landing page can state usage instead of implying it from
 * whatever happens to be in the current browser.
 */
export function useStats() {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: ({ signal }) => api.stats(signal),
    staleTime: 60_000,
    retry: false,
  });
}
