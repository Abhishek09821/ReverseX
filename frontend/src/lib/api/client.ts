/**
 * Typed API client — GitReverse-style reconstruction system.
 *
 * Every response passes through a Zod schema before it reaches the app.
 * All endpoints now target /api/v1/reconstruct.
 */
import { z } from 'zod';

import {
  capabilitiesSchema,
  healthSchema,
  problemDetailSchema,
  reconstructionAcceptedSchema,
  reconstructionJobStateSchema,
  reconstructionResultSchema,
  type Capabilities,
  type Health,
  type ReconstructionAccepted,
  type ReconstructionJobState,
  type ReconstructionResult,
} from '@/types/analysis';

import { ApiProblemError, ContractError, TransportError } from './errors';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const API_V1 = `${API_BASE}/api/v1`;

const statsResponseSchema = z
  .object({
    total_scans: z.number().int().nonnegative(),
    counting_since: z.string().nullish(),
    enabled: z.boolean(),
  })
  .strict();
export type Stats = z.infer<typeof statsResponseSchema>;

const contactResponseSchema = z.object({ status: z.literal('accepted') }).strict();
export type ContactResponse = z.infer<typeof contactResponseSchema>;

export interface ContactPayload {
  name?: string;
  email?: string;
  message: string;
  website: string;
  current_page: string;
  scan_id?: string;
}

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit & { expectedStatus?: number[] },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new TransportError('The request could not be sent.', { cause });
  }

  if (!response.ok) {
    throw await toProblem(response);
  }

  const payload: unknown = await response.json().catch((cause: unknown) => {
    throw new ContractError('The response was not valid JSON.', [String(cause)]);
  });

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ContractError(
      'The response did not match the expected schema.',
      parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`),
    );
  }
  return parsed.data;
}

async function toProblem(response: Response): Promise<Error> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new TransportError(`The server responded ${response.status} without a body.`);
  }
  const problem = problemDetailSchema.safeParse(body);
  if (problem.success) return new ApiProblemError(problem.data);
  return new ContractError(`The server responded ${response.status} in an unexpected format.`, []);
}

// ── Public API surface ────────────────────────────────────────────────────────

export const api = {
  // ── Health / meta ──────────────────────────────────────────────────────────
  async health(signal?: AbortSignal): Promise<Health> {
    return request(`${API_BASE}/health`, healthSchema, { signal });
  },

  async capabilities(signal?: AbortSignal): Promise<Capabilities> {
    return request(`${API_V1}/capabilities`, capabilitiesSchema, { signal });
  },

  async stats(signal?: AbortSignal): Promise<Stats> {
    return request(`${API_V1}/stats`, statsResponseSchema, { signal });
  },

  // ── Reconstruction (website URL or GitHub repo) ────────────────────────────
  async createReconstruction(url: string): Promise<ReconstructionAccepted> {
    return request(`${API_V1}/reconstruct`, reconstructionAcceptedSchema, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async jobState(scanId: string, signal?: AbortSignal): Promise<ReconstructionJobState> {
    return request(`${API_V1}/reconstruct/${scanId}`, reconstructionJobStateSchema, { signal });
  },

  async result(scanId: string, signal?: AbortSignal): Promise<ReconstructionResult> {
    return request(`${API_V1}/reconstruct/${scanId}/result`, reconstructionResultSchema, {
      signal,
    });
  },

  async deleteReconstruction(scanId: string): Promise<void> {
    try {
      await fetch(`${API_V1}/reconstruct/${scanId}`, { method: 'DELETE' });
    } catch {
      // Intentionally ignored — the buffer expires on its own.
    }
  },

  eventsUrl(scanId: string): string {
    return `${API_V1}/reconstruct/${scanId}/events`;
  },

  // ── Contact ────────────────────────────────────────────────────────────────
  async contact(payload: ContactPayload, signal?: AbortSignal): Promise<ContactResponse> {
    return request(`${API_BASE}/api/contact`, contactResponseSchema, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  },
};
