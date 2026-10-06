/**
 * Domain contract — GitReverse-style reconstruction prompt system.
 *
 * Types are inferred from Zod schemas so there is one definition, not a type plus a
 * validator that can drift apart. Field names mirror the wire format (snake_case).
 */
import { z } from 'zod';

// ── Source type ─────────────────────────────────────────────────────────────

export const SOURCE_TYPES = ['website', 'github_repo'] as const;
export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export type SourceType = z.infer<typeof sourceTypeSchema>;

// ── Scan / job status ───────────────────────────────────────────────────────

export const scanStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'completed_with_errors',
  'failed',
  'cancelled',
]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const stageStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'skipped']);
export type StageStatus = z.infer<typeof stageStatusSchema>;

// ── Reconstruction prompt ───────────────────────────────────────────────────

export const reconstructionPromptSchema = z.object({
  prompt: z.string(),
  source_type: sourceTypeSchema,
  source_url: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  limitations: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});
export type ReconstructionPrompt = z.infer<typeof reconstructionPromptSchema>;

// ── GitHub repo info ────────────────────────────────────────────────────────

export const gitHubRepoInfoSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  full_name: z.string(),
  description: z.string().nullish(),
  default_branch: z.string().default('main'),
  stars: z.number().default(0),
  forks: z.number().default(0),
  language: z.string().nullish(),
  topics: z.array(z.string()).default([]),
  license: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  size_kb: z.number().default(0),
  is_private: z.boolean().default(false),
  is_fork: z.boolean().default(false),
  homepage: z.string().nullish(),
});
export type GitHubRepoInfo = z.infer<typeof gitHubRepoInfoSchema>;

// ── Reconstruction result metadata ──────────────────────────────────────────

export const reconstructionMetadataSchema = z.object({
  scan_id: z.string(),
  status: scanStatusSchema,
  source_type: sourceTypeSchema,
  source_url: z.string(),
  created_at: z.string(),
  started_at: z.string().nullish(),
  finished_at: z.string().nullish(),
  duration_ms: z.number().nullish(),
  engine_version: z.string(),
  schema_version: z.string(),
});
export type ReconstructionMetadata = z.infer<typeof reconstructionMetadataSchema>;

// ── Full reconstruction result ──────────────────────────────────────────────

export const reconstructionResultSchema = z.object({
  schema_version: z.string(),
  metadata: reconstructionMetadataSchema,
  prompt: reconstructionPromptSchema,
  github_info: gitHubRepoInfoSchema.nullish(),
  repo_structure: z.object({
    total_files: z.number().default(0),
    total_directories: z.number().default(0),
    main_directories: z.array(z.string()).default([]),
    key_files: z.array(z.string()).default([]),
    has_tests: z.boolean().default(false),
    has_docs: z.boolean().default(false),
    has_ci_cd: z.boolean().default(false),
  }).nullish(),
  detected_stack: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    package_managers: z.array(z.string()).default([]),
    confidence: z.string().default('medium'),
  }).nullish(),
});
export type ReconstructionResult = z.infer<typeof reconstructionResultSchema>;

// ── Job lifecycle ───────────────────────────────────────────────────────────

export const problemDetailSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().nullish(),
  code: z.string(),
  instance: z.string().nullish(),
  retryable: z.boolean().default(false),
});
export type ProblemDetail = z.infer<typeof problemDetailSchema>;

export const stageProgressSchema = z.object({
  current_stage: z.string().nullish(),
  current_stage_label: z.string().nullish(),
  completed_weight: z.number(),
  total_weight: z.number(),
  stages_completed: z.number(),
  stages_total: z.number(),
});
export type StageProgress = z.infer<typeof stageProgressSchema>;

export const stageRunSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: stageStatusSchema,
  started_at: z.string().nullish(),
  duration_ms: z.number().nullish(),
  error_code: z.string().nullish(),
  error_detail: z.string().nullish(),
  skip_reason: z.string().nullish(),
});
export type StageRun = z.infer<typeof stageRunSchema>;

export const scanJobStateSchema = z.object({
  scan_id: z.string(),
  status: scanStatusSchema,
  requested_url: z.string(),
  created_at: z.string(),
  started_at: z.string().nullish(),
  finished_at: z.string().nullish(),
  progress: stageProgressSchema,
  stages: z.array(stageRunSchema).default([]),
  problem: problemDetailSchema.nullish(),
});
export type ScanJobState = z.infer<typeof scanJobStateSchema>;

export const reconstructionJobStateSchema = z.object({
  scan_id: z.string(),
  status: scanStatusSchema,
  source_type: sourceTypeSchema,
  source_url: z.string(),
  created_at: z.string(),
  started_at: z.string().nullish(),
  finished_at: z.string().nullish(),
  current_stage: z.string().nullish(),
  progress_percent: z.number().default(0),
  error_message: z.string().nullish(),
});
export type ReconstructionJobState = z.infer<typeof reconstructionJobStateSchema>;

export const reconstructionAcceptedSchema = z.object({
  scan_id: z.string(),
  status: scanStatusSchema,
  source_type: sourceTypeSchema,
  source_url: z.string(),
  normalized_url: z.string(),
  created_at: z.string(),
  links: z.record(z.string(), z.string()),
});
export type ReconstructionAccepted = z.infer<typeof reconstructionAcceptedSchema>;

// ── Health / capabilities ───────────────────────────────────────────────────

export const healthSchema = z.object({
  status: z.string(),
  engine_version: z.string(),
  schema_version: z.string(),
  uptime_seconds: z.number(),
  browser: z.object({
    available: z.boolean(),
    name: z.string().nullish(),
    version: z.string().nullish(),
    detail: z.string().nullish(),
  }),
  active_scans: z.number(),
});
export type Health = z.infer<typeof healthSchema>;

export const capabilitiesSchema = z.object({
  engine_version: z.string(),
  schema_version: z.string(),
  collection_mode: z.string(),
  github_analysis: z.boolean(),
  website_analysis: z.boolean(),
  github_rate_limited: z.boolean(),
  sources: z.array(z.object({
    source_type: z.string(),
    description: z.string(),
    example: z.string(),
  })),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;
