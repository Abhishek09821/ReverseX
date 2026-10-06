import type { DBSchema } from 'idb';

import type { ReconstructionResult, ScanStatus, SourceType } from '@/types/analysis';

export const DB_NAME = 'reversex';
export const DB_VERSION = 2;

/** Shape version of stored records, independent of the IndexedDB integer version. */
export const RECORD_SCHEMA_VERSION = '3.0';

/**
 * Small projection that powers the scan library.
 * Kept lean so listing never deserializes megabytes.
 */
export interface ScanRecord {
  id: string;
  source_url: string;
  normalized_url: string;
  source_type: SourceType;
  /** Short label: hostname for websites, "owner/repo" for GitHub. */
  display_label: string;
  status: ScanStatus;
  created_at: string;
  saved_at: string;
  duration_ms: number | null;
  engine_version: string;
  schema_version: string;
  confidence: 'high' | 'medium' | 'low';
  prompt_preview: string;
  result_bytes: number;
}

export interface ResultRecord {
  scan_id: string;
  schema_version: string;
  result: ReconstructionResult;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export interface ReverseXDb extends DBSchema {
  scans: {
    key: string;
    value: ScanRecord;
    indexes: {
      by_created_at: string;
      by_source_type: string;
      by_status: string;
      by_saved_at: string;
    };
  };
  results: { key: string; value: ResultRecord };
  meta: { key: string; value: MetaRecord };
}

export const STORES = ['scans', 'results', 'meta'] as const;
export const DATA_STORES = ['scans', 'results'] as const;

export interface PersistOutcome {
  saved: boolean;
  warning?: string;
}

export interface QuarantinedScan {
  id: string;
  schema_version: string;
  reason: string;
}

export interface ScreenshotItem {
  label: string;
  width: number;
  height: number;
  blob: Blob;
}
