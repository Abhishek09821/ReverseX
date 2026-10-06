/**
 * Reconstruction result persistence.
 *
 * The browser is the system of record. Every completed analysis is persisted here and
 * never on a permanent server. Two invariants are enforced:
 * 1. A write is one transaction across `scans` and `results` — the library never lists a
 *    scan whose result is missing.
 * 2. A delete removes every trace in one transaction.
 */
import { openDB, type IDBPDatabase } from 'idb';

import { reconstructionResultSchema, type ReconstructionResult } from '@/types/analysis';

import { applyMigrations } from './migrations';
import {
  DATA_STORES,
  DB_NAME,
  DB_VERSION,
  RECORD_SCHEMA_VERSION,
  type MetaRecord,
  type PersistOutcome,
  type QuarantinedScan,
  type ResultRecord,
  type ReverseXDb,
  type ScanRecord,
} from './types';

const QUOTA_HEADROOM = 0.9;

export interface ScanRepository {
  list(): Promise<ScanRecord[]>;
  get(scanId: string): Promise<ScanRecord | undefined>;
  getResult(scanId: string): Promise<ReconstructionResult | undefined>;
  persist(result: ReconstructionResult): Promise<PersistOutcome>;
  remove(scanId: string): Promise<void>;
  clear(): Promise<void>;
  quarantined(): Promise<QuarantinedScan[]>;
  close(): Promise<void>;
}

export class IdbScanRepository implements ScanRepository {
  private handle: Promise<IDBPDatabase<ReverseXDb>> | null = null;

  private db(): Promise<IDBPDatabase<ReverseXDb>> {
    this.handle ??= openDB<ReverseXDb>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, newVersion, transaction) {
        applyMigrations(database, oldVersion, newVersion, transaction);
      },
      blocked() {
        console.warn('[reversex] another tab is holding an older database version open');
      },
    });
    return this.handle;
  }

  async list(): Promise<ScanRecord[]> {
    const db = await this.db();
    const records = await db.getAllFromIndex('scans', 'by_created_at');
    return records.reverse();
  }

  async get(scanId: string): Promise<ScanRecord | undefined> {
    return (await this.db()).get('scans', scanId);
  }

  async getResult(scanId: string): Promise<ReconstructionResult | undefined> {
    const db = await this.db();
    const record = await db.get('results', scanId);
    if (!record) return undefined;

    if (record.schema_version !== RECORD_SCHEMA_VERSION) {
      await this.quarantine(scanId, record.schema_version);
      return undefined;
    }

    const parsed = reconstructionResultSchema.safeParse(record.result);
    if (!parsed.success) {
      await this.quarantine(scanId, record.schema_version, 'stored record failed validation');
      return undefined;
    }
    return parsed.data;
  }

  async persist(result: ReconstructionResult): Promise<PersistOutcome> {
    const db = await this.db();
    const record = projectScanRecord(result);
    const resultRecord: ResultRecord = {
      scan_id: result.metadata.scan_id,
      schema_version: RECORD_SCHEMA_VERSION,
      result,
    };
    const quotaWarning = await checkQuota(record.result_bytes);
    const tx = db.transaction(DATA_STORES, 'readwrite');
    await Promise.all([
      tx.objectStore('scans').put(record),
      tx.objectStore('results').put(resultRecord),
      tx.done,
    ]);
    return { saved: true, ...(quotaWarning ? { warning: quotaWarning } : {}) };
  }

  async remove(scanId: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(DATA_STORES, 'readwrite');
    await Promise.all([
      tx.objectStore('scans').delete(scanId),
      tx.objectStore('results').delete(scanId),
      tx.done,
    ]);
    await this.removeFromQuarantine(scanId);
  }

  async clear(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(DATA_STORES, 'readwrite');
    await Promise.all([
      tx.objectStore('scans').clear(),
      tx.objectStore('results').clear(),
      tx.done,
    ]);
    await this.setMeta('quarantine', []);
  }

  async quarantined(): Promise<QuarantinedScan[]> {
    const record = await (await this.db()).get('meta', 'quarantine');
    return Array.isArray(record?.value) ? (record.value as QuarantinedScan[]) : [];
  }

  async close(): Promise<void> {
    if (!this.handle) return;
    const pending = this.handle;
    this.handle = null;
    try {
      (await pending).close();
    } catch {
      // Already closed or failed to open.
    }
  }

  private async quarantine(
    scanId: string,
    schemaVersion: string,
    reason?: string,
  ): Promise<void> {
    const existing = await this.quarantined();
    if (existing.some((item) => item.id === scanId)) return;
    await this.setMeta('quarantine', [
      ...existing,
      {
        id: scanId,
        schema_version: schemaVersion,
        reason:
          reason ??
          `Saved by a ReverseX build using schema ${schemaVersion}; this build reads ${RECORD_SCHEMA_VERSION}.`,
      },
    ]);
  }

  private async removeFromQuarantine(scanId: string): Promise<void> {
    const existing = await this.quarantined();
    if (!existing.some((item) => item.id === scanId)) return;
    await this.setMeta(
      'quarantine',
      existing.filter((item) => item.id !== scanId),
    );
  }

  private async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.db();
    await db.put('meta', { key, value } as MetaRecord);
  }
}

export class MemoryScanRepository implements ScanRepository {
  private scans = new Map<string, ScanRecord>();
  private results = new Map<string, ResultRecord>();

  async list(): Promise<ScanRecord[]> {
    return [...this.scans.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async get(scanId: string): Promise<ScanRecord | undefined> {
    return this.scans.get(scanId);
  }
  async getResult(scanId: string): Promise<ReconstructionResult | undefined> {
    return this.results.get(scanId)?.result;
  }
  async persist(result: ReconstructionResult): Promise<PersistOutcome> {
    const id = result.metadata.scan_id;
    this.scans.set(id, projectScanRecord(result));
    this.results.set(id, {
      scan_id: id,
      schema_version: RECORD_SCHEMA_VERSION,
      result,
    });
    return { saved: true };
  }
  async remove(scanId: string): Promise<void> {
    this.scans.delete(scanId);
    this.results.delete(scanId);
  }
  async clear(): Promise<void> {
    this.scans.clear();
    this.results.clear();
  }
  async quarantined(): Promise<QuarantinedScan[]> {
    return [];
  }
  async close(): Promise<void> {
    // nothing
  }
}

// ── Projection helpers ────────────────────────────────────────────────────────

export function projectScanRecord(result: ReconstructionResult): ScanRecord {
  const meta = result.metadata;
  const prompt = result.prompt;

  const displayLabel =
    meta.source_type === 'github_repo'
      ? (result.github_info?.full_name ?? new URL(meta.source_url).pathname.replace(/^\//, ''))
      : (() => {
          try {
            return new URL(meta.source_url).hostname.replace(/^www\./, '');
          } catch {
            return meta.source_url;
          }
        })();

  return {
    id: meta.scan_id,
    source_url: meta.source_url,
    normalized_url: meta.source_url,
    source_type: meta.source_type,
    display_label: displayLabel,
    status: meta.status,
    created_at: meta.created_at,
    saved_at: new Date().toISOString(),
    duration_ms: meta.duration_ms ?? null,
    engine_version: meta.engine_version,
    schema_version: result.schema_version,
    confidence: prompt.confidence,
    prompt_preview: prompt.prompt.slice(0, 200),
    result_bytes: approximateBytes(result),
  };
}

async function checkQuota(incomingBytes: number): Promise<string | undefined> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return undefined;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota === 0) return undefined;
    if (usage + incomingBytes > quota * QUOTA_HEADROOM) {
      return 'Local storage for this site is nearly full. Delete old analyses to make room.';
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function approximateBytes(result: ReconstructionResult): number {
  try {
    return new TextEncoder().encode(JSON.stringify(result)).length;
  } catch {
    return 0;
  }
}

let singleton: ScanRepository | null = null;

export function getRepository(): ScanRepository {
  if (singleton) return singleton;
  singleton = indexedDbAvailable() ? new IdbScanRepository() : new MemoryScanRepository();
  return singleton;
}

export function isPersistent(): boolean {
  return getRepository() instanceof IdbScanRepository;
}

export function setRepository(repository: ScanRepository | null): void {
  singleton = repository;
}

function indexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
